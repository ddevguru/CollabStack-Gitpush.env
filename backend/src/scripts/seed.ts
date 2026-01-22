import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test user
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      passwordHash,
      authProviders: ['EMAIL'] as any,
    },
  });

  console.log('Created user:', user.email);

  // Create test team
  const team = await prisma.team.upsert({
    where: { id: 'test-team-id' },
    update: {},
    create: {
      id: 'test-team-id',
      name: 'Test Team',
      description: 'A test team',
      leaderId: user.id,
    },
  });

  console.log('Created team:', team.name);

  // Create test project
  const project = await prisma.project.upsert({
    where: { id: 'test-project-id' },
    update: {},
    create: {
      id: 'test-project-id',
      name: 'Test Project',
      description: 'A test project',
      ownerTeamId: team.id,
      createdBy: user.id,
      roomId: 'test-room-id',
      languages: ['javascript'],
      visibility: 'PRIVATE',
    },
  });

  console.log('Created project:', project.name);

  // Create main branch
  await prisma.branch.upsert({
    where: {
      projectId_name: {
        projectId: project.id,
        name: 'main',
      },
    },
    update: {},
    create: {
      projectId: project.id,
      name: 'main',
      gitBranchName: 'main',
    },
  });

  // Create sample file
  await prisma.file.upsert({
    where: {
      projectId_path: {
        projectId: project.id,
        path: 'main.js',
      },
    },
    update: {},
    create: {
      projectId: project.id,
      path: 'main.js',
      content: 'console.log("Hello, World!");\n',
      isDirectory: false,
    },
  });

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

