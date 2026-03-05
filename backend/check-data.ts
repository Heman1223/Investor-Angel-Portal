import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const startups = await prisma.startup.findMany({ 
    take: 1,
    include: { 
      cashflows: { take: 1 }, 
      documents: { take: 1 }, 
      monthlyUpdates: { take: 1 } 
    } 
  })
  console.log("STARTUP DATA:", JSON.stringify(startups, null, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
