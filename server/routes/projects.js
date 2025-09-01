const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/projects';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(txt|doc|docx|pdf|rtf|odt)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only document files are allowed'));
    }
  }
});

// Get all projects (with filtering)
router.get('/', [
  query('status').optional().isIn(['POSTED', 'IN_PROGRESS', 'COMPLETED', 'PAID', 'CANCELLED']),
  query('sourceLanguage').optional().isString(),
  query('targetLanguage').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, sourceLanguage, targetLanguage, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (sourceLanguage) where.sourceLanguage = sourceLanguage;
    if (targetLanguage) where.targetLanguage = targetLanguage;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          client: {
            select: { id: true, name: true, rating: true }
          },
          bids: {
            select: { id: true, bidAmount: true, status: true }
          },
          _count: { select: { bids: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.project.count({ where })
    ]);

    res.json({
      projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project
router.get('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        client: {
          select: { id: true, name: true, rating: true, profilePicture: true }
        },
        bids: {
          include: {
            freelancer: {
              select: { id: true, name: true, rating: true, languages: true, profilePicture: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project (clients only)
router.post('/', authenticateToken, requireRole(['CLIENT']), upload.array('files', 5), [
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be 5-100 characters'),
  body('description').trim().isLength({ min: 20, max: 2000 }).withMessage('Description must be 20-2000 characters'),
  body('sourceLanguage').notEmpty().withMessage('Source language required'),
  body('targetLanguage').notEmpty().withMessage('Target language required'),
  body('budget').isFloat({ min: 1 }).withMessage('Budget must be at least $1'),
  body('deadline').optional().isISO8601().withMessage('Invalid deadline format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, sourceLanguage, targetLanguage, budget, deadline } = req.body;
    const attachedFiles = req.files ? req.files.map(file => file.path) : [];

    const project = await prisma.project.create({
      data: {
        clientId: req.user.id,
        title,
        description,
        sourceLanguage,
        targetLanguage,
        budget: parseFloat(budget),
        deadline: deadline ? new Date(deadline) : null,
        attachedFiles
      },
      include: {
        client: {
          select: { id: true, name: true, rating: true }
        }
      }
    });

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project (project owner only)
router.put('/:id', authenticateToken, [
  body('title').optional().trim().isLength({ min: 5, max: 100 }),
  body('description').optional().trim().isLength({ min: 20, max: 2000 }),
  body('budget').optional().isFloat({ min: 1 }),
  body('deadline').optional().isISO8601(),
  body('status').optional().isIn(['POSTED', 'IN_PROGRESS', 'COMPLETED', 'PAID', 'CANCELLED'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.clientId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this project' });
    }

    const updateData = {};
    const { title, description, budget, deadline, status } = req.body;

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (budget) updateData.budget = parseFloat(budget);
    if (deadline) updateData.deadline = new Date(deadline);
    if (status) updateData.status = status;

    const updatedProject = await prisma.project.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        client: {
          select: { id: true, name: true, rating: true }
        }
      }
    });

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project (project owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.clientId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this project' });
    }

    // Delete associated files
    if (project.attachedFiles && project.attachedFiles.length > 0) {
      project.attachedFiles.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    await prisma.project.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
