import Prisma, * as PrismaAll from '@prisma/client';

const PrismaClient = Prisma.PrismaClient || PrismaAll?.PrismaClient;

const prisma = new PrismaClient();

export default prisma;