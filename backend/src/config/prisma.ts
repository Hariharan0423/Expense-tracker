import { PrismaClient } from '@prisma/client';

// Declare a single shared PrismaClient instance across the app
const prisma = new PrismaClient();

export default prisma;
