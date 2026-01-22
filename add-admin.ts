import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

async function main() {
  const prisma = new PrismaClient()

  const username = 'nkn'
  const hashedPassword = await bcrypt.hash('246266', 10)

  const admin = await prisma.user.upsert({
    where: { username },
    update: { password: hashedPassword, role: 'ADMIN', status: 'ACTIVE' },
    create: {
      id: randomUUID(),
      username,
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      updatedAt: new Date()
    }
  })

  console.log('แอดมิน nkn สร้าง/อัพเดตเรียบร้อย!', admin)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})