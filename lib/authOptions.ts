import NextAuth, { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { createLog } from "@/lib/log"
import { sendDiscordWebhook } from "@/lib/discord"

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          console.log("Login attempt for:", credentials?.username);
          console.debug('authorize called, NODE_ENV=', process.env.NODE_ENV);
          const dbUrl = process.env.DATABASE_URL;
          console.log("DB URL (masked):", dbUrl?.replace(/:[^:@]*@/, ':****@'));

          try {
            const userCount = await prisma.user.count();
            console.log("Total users in DB:", userCount);
          } catch (dbError) {
            const err: any = dbError
            console.error("DB Connection Error:", err?.message ?? err);
            console.debug('DB connection error stack:', err?.stack ?? 'no-stack')
          }

          if (!credentials?.username || !credentials?.password) {
            console.log("Missing credentials");
            return null
          }

          const username = credentials.username.trim();

          let dbAvailable = true
          let user: any = null
          try {
            user = await prisma.user.findUnique({ where: { username } }) as any
          } catch (dbErr) {
            dbAvailable = false
            const err: any = dbErr
            console.error('DB not available during authorize:', err?.message ?? err)
            console.debug('DB error stack:', err?.stack ?? 'no-stack')
          }

          // If DB is not available, use fallback admin
          if (!dbAvailable) {
            const fbUser = process.env.FALLBACK_ADMIN_USERNAME
            const fbPassPlain = process.env.FALLBACK_ADMIN_PASSWORD
            const fbPassHash = process.env.FALLBACK_ADMIN_PASSWORD_BCRYPT

            if (!fbUser) {
              console.warn('Fallback admin not configured (FALLBACK_ADMIN_USERNAME missing)')
              return null
            }

            if (username !== fbUser) return null

            const provided = credentials.password
            let ok = false
            if (fbPassPlain && provided === fbPassPlain) ok = true
            if (!ok && fbPassHash) {
              try {
                ok = await bcrypt.compare(provided, fbPassHash)
              } catch (e) {
                const err: any = e
                console.error('Fallback bcrypt.compare failed:', err?.message ?? err)
                console.debug('Fallback bcrypt error stack:', err?.stack ?? 'no-stack')
              }
            }

            if (ok) {
              console.info('Fallback admin login success for', username)
              return { id: 'fallback-admin', name: username, role: 'ADMIN' }
            }

            return null
          }

          if (!user) {
            console.log("User not found:", username);
            return null
          }

          console.log("User found, checking password...");

          if (user.status !== 'ACTIVE') {
              console.log("User status not active:", user.status);
              throw new Error("Account is " + user.status.toLowerCase());
          }

          if (user.lockoutUntil && user.lockoutUntil > new Date()) {
            const minutesLeft = Math.ceil((user.lockoutUntil.getTime() - new Date().getTime()) / 60000);
            throw new Error(`บัญชีถูกระงับชั่วคราว กรุณาลองใหม่ใน ${minutesLeft} นาที`);
          }

          let isPasswordValid = false
          try {
            isPasswordValid = await bcrypt.compare(credentials.password, user.password)
          } catch (bcryptErr) {
            const err: any = bcryptErr
            console.error('bcrypt.compare failed for user:', username, err?.message ?? err)
            console.debug('bcrypt.compare stack:', err?.stack ?? 'no-stack')
            isPasswordValid = false
          }

          if (!isPasswordValid) {
            console.log("Invalid password for user:", username);
            try {
              const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
              let updateData: any = { failedLoginAttempts: newFailedAttempts };
              if (newFailedAttempts >= 5) {
                updateData.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
                await createLog(user.username, 'เข้าสู่ระบบ', user.role, `ระงับบัญชีชั่วคราวเนื่องจากใส่รหัสผิด ${newFailedAttempts} ครั้ง`, user.id);
              }

              await prisma.user.update({ where: { id: user.id }, data: updateData });
            } catch (e) {
              const err: any = e
              console.error('Failed to update failed attempts (DB error):', err?.message ?? err)
              console.debug('Failed to update failed attempts stack:', err?.stack ?? 'no-stack')
            }

            return null
          }

          try {
            if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
              await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockoutUntil: null } });
            }
          } catch (e) {
            const err: any = e
            console.error('Failed to reset failed attempts (DB error):', err?.message ?? err)
            console.debug('Reset failed attempts stack:', err?.stack ?? 'no-stack')
          }

          console.log("Login successful for:", username);

          try {
            await createLog(user.username, 'เข้าสู่ระบบ', user.role, 'เข้าสู่ระบบสำเร็จ', user.id)
          } catch (e) {
            const err: any = e
            console.error('createLog failed (DB error):', err?.message ?? err)
            console.debug('createLog stack:', err?.stack ?? 'no-stack')
          }

          return {
            id: user.id,
            name: user.username,
            nickname: user.nickname,
            role: user.role,
            profilePicture: user.profilePicture,
            coverImage: user.coverImage
          }
        } catch (error) {
          console.error("Authorize error:", (error as any)?.message ?? error)
          console.debug('Authorize error stack:', (error as any)?.stack ?? 'no-stack')
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
        token.nickname = user.nickname
        token.profilePicture = user.profilePicture
        token.coverImage = user.coverImage
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role
        session.user.id = token.id
        session.user.nickname = token.nickname
        session.user.profilePicture = token.profilePicture
        session.user.coverImage = token.coverImage
      }
      return session
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 10 * 60,
  },
  pages: {
    signIn: '/login',
  },
  events: {
    async signIn({ user }) {
      await sendDiscordWebhook(`✅ **${user.name}** เข้าสู่ระบบสำเร็จ`, 5763719)
    },
    async signOut({ token }) {
      if (token?.name) {
        await sendDiscordWebhook(`🚪 **${token.name}** ออกจากระบบ`, 15548997)
      }
    }
  }
}

export default authOptions
