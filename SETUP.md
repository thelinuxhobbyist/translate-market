# Translation Marketplace Setup Guide

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- Stripe account (for payments)

## Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd windsurf-project
   npm run install-all
   ```

2. **Database Setup:**
   ```bash
   # Create PostgreSQL database
   createdb translation_marketplace
   
   # Copy environment file and configure
   cd server
   cp .env.example .env
   ```

3. **Configure Environment Variables:**

   **Server (.env):**
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/translation_marketplace"
   JWT_SECRET="your-super-secret-jwt-key-here"
   STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
   STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
   PORT=5000
   NODE_ENV=development
   UPLOAD_DIR="./uploads"
   MAX_FILE_SIZE=10485760
   ```

   **Client (.env):**
   ```bash
   cd ../client
   cp .env.example .env
   ```
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
   ```

4. **Database Migration and Seeding:**
   ```bash
   cd ../server
   npx prisma migrate dev --name init
   npx prisma generate
   npm run db:seed
   ```

5. **Start Development Servers:**
   ```bash
   cd ..
   npm run dev
   ```

## Test Accounts

After seeding, you can login with:

- **Client Account:**
  - Email: `client@example.com`
  - Password: `password123`

- **Freelancer Account:**
  - Email: `translator@example.com`
  - Password: `password123`

## Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Get your test API keys from the Stripe dashboard
3. Add them to your environment files
4. For production, you'll need to set up Stripe Connect for marketplace payments

## File Structure

```
├── client/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   └── utils/
│   └── public/
├── server/          # Express backend
│   ├── routes/
│   ├── middleware/
│   ├── prisma/
│   └── uploads/
└── docs/           # Documentation
```

## Available Scripts

- `npm run dev` - Start both frontend and backend
- `npm run server` - Start backend only
- `npm run client` - Start frontend only
- `npm run install-all` - Install all dependencies

## Troubleshooting

1. **Database connection issues:**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env file
   - Verify database exists

2. **Tailwind CSS warnings:**
   - These are expected during development
   - Will resolve when the build process runs

3. **File upload issues:**
   - Ensure uploads directory exists
   - Check file permissions
   - Verify MAX_FILE_SIZE setting

## Production Deployment

1. Set NODE_ENV=production
2. Configure production database
3. Set up file storage (AWS S3 recommended)
4. Configure Stripe webhooks
5. Set up proper CORS origins
6. Use environment variables for all secrets
