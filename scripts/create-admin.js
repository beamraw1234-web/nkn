// scripts/create-admin.js (ESM)
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient({ log: ['info', 'warn', 'error'], errorFormat: 'pretty' })

const username = 'nkn'           // เปลี่ยนตามต้องการ
const plain = '246266'   // เปลี่ยนรหัสผ่าน

try {
  const hash = await bcrypt.hash(plain, 10)
  const user = await prisma.user.create({
    data: { username, password: hash, role: 'ADMIN', status: 'ACTIVE' }
  })
  console.log('Created admin:', user.id, user.username)
} catch (e) {
  console.error('Failed:', e)
} finally {
  await prisma.$disconnect()
}