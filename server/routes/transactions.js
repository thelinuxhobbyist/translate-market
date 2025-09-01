const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();
const prisma = new PrismaClient();

// Get user's transactions
router.get('/my-transactions', authenticateToken, async (req, res) => {
  try {
    const where = {
      OR: [
        { clientId: req.user.id },
        { freelancerId: req.user.id }
      ]
    };

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        project: {
          select: { id: true, title: true }
        },
        client: {
          select: { id: true, name: true }
        },
        freelancer: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Create payment intent for escrow
router.post('/create-payment-intent', authenticateToken, [
  body('projectId').notEmpty().withMessage('Project ID required'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least $1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId, amount } = req.body;

    // Verify project ownership and status
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        transactions: true
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.clientId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized for this project' });
    }

    if (project.transactions.length > 0) {
      return res.status(400).json({ error: 'Payment already exists for this project' });
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(amount) * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        projectId,
        clientId: req.user.id,
        type: 'escrow'
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Confirm payment and update transaction
router.post('/confirm-payment', authenticateToken, [
  body('paymentIntentId').notEmpty().withMessage('Payment intent ID required'),
  body('projectId').notEmpty().withMessage('Project ID required'),
  body('freelancerId').notEmpty().withMessage('Freelancer ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentIntentId, projectId, freelancerId } = req.body;

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Update or create transaction record
    const transaction = await prisma.transaction.upsert({
      where: {
        projectId_clientId: {
          projectId,
          clientId: req.user.id
        }
      },
      update: {
        stripePaymentId: paymentIntentId,
        status: 'PENDING'
      },
      create: {
        projectId,
        clientId: req.user.id,
        freelancerId,
        amount: paymentIntent.amount / 100, // Convert from cents
        stripePaymentId: paymentIntentId,
        status: 'PENDING'
      }
    });

    res.json({
      message: 'Payment confirmed and funds held in escrow',
      transaction
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Release payment to freelancer (client only)
router.post('/:id/release', authenticateToken, async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: {
        project: true,
        freelancer: true
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.clientId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to release this payment' });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({ error: 'Payment cannot be released' });
    }

    // In a real implementation, you would transfer funds to freelancer's Stripe account
    // For MVP, we'll just update the status
    const updatedTransaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: { status: 'RELEASED' }
    });

    // Update project status to PAID
    await prisma.project.update({
      where: { id: transaction.projectId },
      data: { status: 'PAID' }
    });

    res.json({
      message: 'Payment released to freelancer',
      transaction: updatedTransaction
    });
  } catch (error) {
    console.error('Release payment error:', error);
    res.status(500).json({ error: 'Failed to release payment' });
  }
});

// Request refund (client only)
router.post('/:id/refund', authenticateToken, [
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason too long')
], async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.clientId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to refund this payment' });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({ error: 'Payment cannot be refunded' });
    }

    // In a real implementation, you would process refund through Stripe
    const updatedTransaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: { status: 'REFUNDED' }
    });

    // Update project status
    await prisma.project.update({
      where: { id: transaction.projectId },
      data: { status: 'CANCELLED' }
    });

    res.json({
      message: 'Refund processed',
      transaction: updatedTransaction
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

module.exports = router;
