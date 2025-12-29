import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    role: string
    id: string
    nickname?: string
    profilePicture?: string
    coverImage?: string
  }
  interface Session {
    user: User & {
      role: string
      id: string
      nickname?: string
      profilePicture?: string
      coverImage?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    id: string
    nickname?: string
    profilePicture?: string
    coverImage?: string
  }
}
