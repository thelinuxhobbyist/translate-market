const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function setupProduction() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Run Prisma migrations to create tables
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.log('⚠️ Migration failed, trying to push schema...');
      execSync('npx prisma db push', { stdio: 'inherit' });
      console.log('✅ Database schema pushed');
    }
    
    // Generate Prisma client
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated');
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    console.log('🔄 Checking for existing data...');
    
    // Create a test user to verify everything works
    const testUser = await prisma.user.findFirst();
    if (!testUser) {
      console.log('🔄 Creating seed data...');
      
      // Create test client
      const client = await prisma.user.create({
        data: {
          name: 'Test Client',
          email: 'client@example.com',
          password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password123
          role: 'CLIENT',
          languages: []
        }
      });
      
      // Create test freelancer
      const freelancer = await prisma.user.create({
        data: {
          name: 'Test Translator',
          email: 'translator@example.com',
          password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password123
          role: 'FREELANCER',
          languages: ['Spanish', 'French', 'German']
        }
      });
      
      console.log('✅ Seed data created');
      console.log('📧 Test accounts:');
      console.log('   Client: client@example.com / password123');
      console.log('   Freelancer: translator@example.com / password123');
    } else {
      console.log('✅ Database already has data');
    }
    
    console.log('🎉 Production setup complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupProduction();
