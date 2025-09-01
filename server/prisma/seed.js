const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample users
  const clientPassword = await bcrypt.hash('password123', 12);
  const freelancerPassword = await bcrypt.hash('password123', 12);

  const client = await prisma.user.create({
    data: {
      name: 'John Client',
      email: 'client@example.com',
      passwordHash: clientPassword,
      role: 'CLIENT',
      languages: []
    }
  });

  const freelancer = await prisma.user.create({
    data: {
      name: 'Maria Translator',
      email: 'translator@example.com',
      passwordHash: freelancerPassword,
      role: 'FREELANCER',
      languages: ['Spanish', 'French', 'German'],
      rating: 4.8
    }
  });

  // Create sample project
  const project = await prisma.project.create({
    data: {
      clientId: client.id,
      title: 'Website Content Translation',
      description: 'Need to translate our company website from English to Spanish. The content includes about 10 pages with marketing copy, product descriptions, and legal terms.',
      sourceLanguage: 'English',
      targetLanguage: 'Spanish',
      budget: 500.00,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'POSTED',
      attachedFiles: []
    }
  });

  // Create sample bid
  const bid = await prisma.bid.create({
    data: {
      projectId: project.id,
      freelancerId: freelancer.id,
      bidAmount: 450.00,
      estimatedTime: '5 days',
      status: 'PENDING'
    }
  });

  console.log('✅ Database seeded successfully!');
  console.log(`Created client: ${client.email} (password: password123)`);
  console.log(`Created freelancer: ${freelancer.email} (password: password123)`);
  console.log(`Created project: ${project.title}`);
  console.log(`Created bid: $${bid.bidAmount}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
