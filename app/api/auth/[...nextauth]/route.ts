import NextAuth from "next-auth"
import authOptions from "@/lib/authOptions"

const handler = NextAuth(authOptions as any)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders })
}

export { handler as GET, handler as POST }
