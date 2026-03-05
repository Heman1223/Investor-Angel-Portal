import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const startup = await prisma.startup.findFirst({ include: { cashflows: true, documents: true, monthlyUpdates: true } })
  console.log(JSON.stringify(startup, null, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
