const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get reviews for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { revieweeId: req.params.userId },
      include: {
        reviewer: {
          select: { id: true, name: true, profilePicture: true }
        },
        project: {
          select: { id: true, title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;

    res.json({
      reviews,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Create review (after project completion)
router.post('/', authenticateToken, [
  body('projectId').notEmpty().withMessage('Project ID required'),
  body('revieweeId').notEmpty().withMessage('Reviewee ID required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Comment too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId, revieweeId, rating, comment } = req.body;

    // Verify project exists and is completed
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        bids: {
          where: { status: 'ACCEPTED' },
          include: { freelancer: true }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.status !== 'PAID' && project.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Project must be completed before reviewing' });
    }

    // Verify user is authorized to review (client or accepted freelancer)
    const isClient = project.clientId === req.user.id;
    const isFreelancer = project.bids.some(bid => bid.freelancerId === req.user.id);

    if (!isClient && !isFreelancer) {
      return res.status(403).json({ error: 'Not authorized to review this project' });
    }

    // Check if review already exists
    const existingReview = await prisma.review.findFirst({
      where: {
        projectId,
        reviewerId: req.user.id,
        revieweeId
      }
    });

    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this user for this project' });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        projectId,
        reviewerId: req.user.id,
        revieweeId,
        rating: parseInt(rating),
        comment
      },
      include: {
        reviewer: {
          select: { id: true, name: true, profilePicture: true }
        },
        reviewee: {
          select: { id: true, name: true }
        },
        project: {
          select: { id: true, title: true }
        }
      }
    });

    // Update user's average rating
    const userReviews = await prisma.review.findMany({
      where: { revieweeId }
    });

    const averageRating = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;

    await prisma.user.update({
      where: { id: revieweeId },
      data: { rating: Math.round(averageRating * 10) / 10 }
    });

    res.status(201).json({
      message: 'Review created successfully',
      review
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Update review (reviewer only)
router.put('/:id', authenticateToken, [
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Comment too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const review = await prisma.review.findUnique({
      where: { id: req.params.id }
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.reviewerId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this review' });
    }

    const updateData = {};
    const { rating, comment } = req.body;

    if (rating) updateData.rating = parseInt(rating);
    if (comment !== undefined) updateData.comment = comment;

    const updatedReview = await prisma.review.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        reviewer: {
          select: { id: true, name: true, profilePicture: true }
        },
        reviewee: {
          select: { id: true, name: true }
        },
        project: {
          select: { id: true, title: true }
        }
      }
    });

    // Recalculate user's average rating if rating was updated
    if (rating) {
      const userReviews = await prisma.review.findMany({
        where: { revieweeId: review.revieweeId }
      });

      const averageRating = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;

      await prisma.user.update({
        where: { id: review.revieweeId },
        data: { rating: Math.round(averageRating * 10) / 10 }
      });
    }

    res.json({
      message: 'Review updated successfully',
      review: updatedReview
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

module.exports = router;
