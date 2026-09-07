import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DEFAULT_CATEGORIES = ['Food', 'Travel', 'Bills', 'Shopping', 'Other'];

async function main() {
  console.log('Seeding default categories...');
  for (const name of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { name, userId: null },
    });
    if (!existing) {
      await prisma.category.create({
        data: {
          name,
          isDefault: true,
          userId: null,
        },
      });
      console.log(`Created default category: ${name}`);
    }
  }
  console.log('Default categories seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
