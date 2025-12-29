const { PrismaClient } = require('@prisma/client')
const path = require('path')

const prisma = new PrismaClient({ log: ['info', 'warn', 'error'], errorFormat: 'pretty' })

async function main() {
  const userId = 'd9612b75-08c6-4a61-8539-2846e1d3649f'

  const profile = '/uploads/profiles/d9612b75-08c6-4a61-8539-2846e1d3649f_profile_1766673047996_8f9nkqw4jvb.jpeg'
  const cover = '/uploads/profiles/d9612b75-08c6-4a61-8539-2846e1d3649f_cover_1766672841375_g12dyotevk5.jpeg'

  console.log('Updating user', userId)
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      profilePicture: profile,
      coverImage: cover,
    },
  })

  console.log('Updated user:', { id: updated.id, profilePicture: updated.profilePicture, coverImage: updated.coverImage })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
