const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get bids for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const bids = await prisma.bid.findMany({
      where: { projectId: req.params.projectId },
      include: {
        freelancer: {
          select: { id: true, name: true, rating: true, languages: true, profilePicture: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(bids);
  } catch (error) {
    console.error('Get bids error:', error);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

// Get freelancer's bids
router.get('/my-bids', authenticateToken, requireRole(['FREELANCER']), async (req, res) => {
  try {
    const bids = await prisma.bid.findMany({
      where: { freelancerId: req.user.id },
      include: {
        project: {
          include: {
            client: {
              select: { id: true, name: true, rating: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(bids);
  } catch (error) {
    console.error('Get my bids error:', error);
    res.status(500).json({ error: 'Failed to fetch your bids' });
  }
});

// Create bid (freelancers only)
router.post('/', authenticateToken, requireRole(['FREELANCER']), [
  body('projectId').notEmpty().withMessage('Project ID required'),
  body('bidAmount').isFloat({ min: 1 }).withMessage('Bid amount must be at least $1'),
  body('estimatedTime').notEmpty().withMessage('Estimated time required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId, bidAmount, estimatedTime } = req.body;

    // Check if project exists and is still open
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.status !== 'POSTED') {
      return res.status(400).json({ error: 'Project is no longer accepting bids' });
    }

    if (project.clientId === req.user.id) {
      return res.status(400).json({ error: 'Cannot bid on your own project' });
    }

    // Check if freelancer already bid on this project
    const existingBid = await prisma.bid.findFirst({
      where: {
        projectId,
        freelancerId: req.user.id
      }
    });

    if (existingBid) {
      return res.status(400).json({ error: 'You have already bid on this project' });
    }

    const bid = await prisma.bid.create({
      data: {
        projectId,
        freelancerId: req.user.id,
        bidAmount: parseFloat(bidAmount),
        estimatedTime
      },
      include: {
        freelancer: {
          select: { id: true, name: true, rating: true, languages: true, profilePicture: true }
        },
        project: {
          select: { id: true, title: true, budget: true }
        }
      }
    });

    res.status(201).json({
      message: 'Bid submitted successfully',
      bid
    });
  } catch (error) {
    console.error('Create bid error:', error);
    res.status(500).json({ error: 'Failed to submit bid' });
  }
});

// Accept bid (project owner only)
router.put('/:id/accept', authenticateToken, async (req, res) => {
  try {
    const bid = await prisma.bid.findUnique({
      where: { id: req.params.id },
      include: {
        project: true,
        freelancer: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    if (bid.project.clientId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to accept this bid' });
    }

    if (bid.project.status !== 'POSTED') {
      return res.status(400).json({ error: 'Project is no longer accepting bids' });
    }

    // Use transaction to update bid, project, and reject other bids
    const result = await prisma.$transaction(async (tx) => {
      // Accept the bid
      const acceptedBid = await tx.bid.update({
        where: { id: req.params.id },
        data: { status: 'ACCEPTED' }
      });

      // Update project status
      await tx.project.update({
        where: { id: bid.projectId },
        data: { status: 'IN_PROGRESS' }
      });

      // Reject all other bids for this project
      await tx.bid.updateMany({
        where: {
          projectId: bid.projectId,
          id: { not: req.params.id },
          status: 'PENDING'
        },
        data: { status: 'REJECTED' }
      });

      // Create transaction record for escrow
      const transaction = await tx.transaction.create({
        data: {
          projectId: bid.projectId,
          clientId: bid.project.clientId,
          freelancerId: bid.freelancerId,
          amount: bid.bidAmount
        }
      });

      return { acceptedBid, transaction };
    });

    res.json({
      message: 'Bid accepted successfully',
      bid: result.acceptedBid,
      transaction: result.transaction
    });
  } catch (error) {
    console.error('Accept bid error:', error);
    res.status(500).json({ error: 'Failed to accept bid' });
  }
});

// Reject bid (project owner only)
router.put('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const bid = await prisma.bid.findUnique({
      where: { id: req.params.id },
      include: { project: true }
    });

    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    if (bid.project.clientId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to reject this bid' });
    }

    if (bid.status !== 'PENDING') {
      return res.status(400).json({ error: 'Bid cannot be rejected' });
    }

    const rejectedBid = await prisma.bid.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' }
    });

    res.json({
      message: 'Bid rejected successfully',
      bid: rejectedBid
    });
  } catch (error) {
    console.error('Reject bid error:', error);
    res.status(500).json({ error: 'Failed to reject bid' });
  }
});

module.exports = router;
