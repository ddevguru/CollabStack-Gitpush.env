import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking existing users...');

  // Get all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      isEmailVerified: true,
    },
  });

  console.log(`\n📊 Found ${users.length} users in database\n`);

  if (users.length === 0) {
    console.log('No users found in database.');
    return;
  }

  // Show current status
  console.log('Current Status:');
  console.log('─────────────────────────────────────────');
  users.forEach((user) => {
    const status = user.isEmailVerified ? '✅ Verified' : '❌ Not Verified';
    console.log(`${user.email.padEnd(40)} ${status}`);
  });
  console.log('─────────────────────────────────────────\n');

  // Verify all unverified users
  const unverifiedUsers = users.filter((u) => !u.isEmailVerified);

  if (unverifiedUsers.length === 0) {
    console.log('✅ All users are already verified!');
    return;
  }

  console.log(`\n🔄 Verifying ${unverifiedUsers.length} unverified users...\n`);

  const result = await prisma.user.updateMany({
    where: {
      isEmailVerified: false,
    },
    data: {
      isEmailVerified: true,
    },
  });

  console.log(`✅ Successfully verified ${result.count} users!\n`);

  // Show updated status
  const updatedUsers = await prisma.user.findMany({
    select: {
      email: true,
      isEmailVerified: true,
    },
  });

  console.log('Updated Status:');
  console.log('─────────────────────────────────────────');
  updatedUsers.forEach((user) => {
    const status = user.isEmailVerified ? '✅ Verified' : '❌ Not Verified';
    console.log(`${user.email.padEnd(40)} ${status}`);
  });
  console.log('─────────────────────────────────────────\n');

  console.log('✨ All existing emails have been verified!');
  console.log('📧 Users can now login without OTP verification.\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

