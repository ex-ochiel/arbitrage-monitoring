const { PrismaClient } = require('@prisma/client');

// Singleton pattern - only one PrismaClient instance across the entire app
// Prevents "too many connections" error in production
const prisma = new PrismaClient();

module.exports = prisma;
