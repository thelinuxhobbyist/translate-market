const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

// Auto-setup database on startup
async function setupDatabase() {
  try {
    console.log('🔄 Setting up database...');
    
    // Generate Prisma client
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Push schema to database (creates tables if they don't exist)
    execSync('npx prisma db push', { stdio: 'inherit' });
    
    console.log('✅ Database setup complete');
  } catch (error) {
    console.log('⚠️ Database setup failed:', error.message);
    // Continue anyway - tables might already exist
  }
}

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const bidRoutes = require('./routes/bids');
const transactionRoutes = require('./routes/transactions');
const reviewRoutes = require('./routes/reviews');

const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://luxury-tulumba-608642.netlify.app'] 
    : ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Setup database on startup
  await setupDatabase();
});
