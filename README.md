# Translation Marketplace MVP

A modern web application connecting clients who need translations with skilled freelance translators.

## Features

- **Client Dashboard**: Post projects, manage bids, handle payments
- **Freelancer Dashboard**: Browse projects, submit bids, deliver translations
- **Secure Payments**: Escrow system with Stripe integration
- **File Management**: Upload and download translation files
- **Rating System**: Review and rate completed projects

## Tech Stack

- **Frontend**: React.js with modern UI components
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based auth
- **Payments**: Stripe Connect for escrow
- **File Storage**: Local storage (can be upgraded to AWS S3)

## Quick Start

1. Install dependencies:
   ```bash
   npm run install-all
   ```

2. Set up environment variables (see .env.example files)

3. Run database migrations:
   ```bash
   cd server && npx prisma migrate dev
   ```

4. Start the development servers:
   ```bash
   npm run dev
   ```

## Project Structure

```
├── client/          # React frontend
├── server/          # Express backend API
├── shared/          # Shared types and utilities
└── docs/           # Documentation
```

## Database Schema

- **Users**: Client and freelancer profiles
- **Projects**: Translation job postings
- **Bids**: Freelancer proposals
- **Transactions**: Escrow payment tracking
- **Reviews**: Rating and feedback system
