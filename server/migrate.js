const { execSync } = require('child_process');

console.log('🔄 Setting up production database...');

try {
  // Generate Prisma client first
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Push database schema (creates tables)
  console.log('🗄️ Creating database tables...');
  execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
  
  console.log('✅ Database setup complete!');
  console.log('🎉 You can now register users on your app');
  
} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  process.exit(1);
}
