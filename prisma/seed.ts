import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient({ log: ['info', 'warn', 'error'], errorFormat: 'pretty' })

async function main() {
  const password = await bcrypt.hash('246266', 10)
  const admin = await prisma.user.upsert({
    where: { username: 'nkn' },
    update: {},
    create: {
      username: 'nkn',
      password,
      role: 'ADMIN',
    },
  })
  console.log({ admin })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
