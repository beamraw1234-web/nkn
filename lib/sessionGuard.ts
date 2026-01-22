import { getSession, signOut } from 'next-auth/react'

/**
 * Check session status and redirect to login if expired
 * Call this in useEffect on any protected page
 */
export async function checkSessionStatus() {
  try {
    const session = await getSession()
    
    if (!session) {
      // Session is invalid/expired, sign out and redirect to login
      await signOut({ redirect: true, callbackUrl: '/login' })
      return false
    }
    
    return true
  } catch (error) {
    console.error('Session check error:', error)
    // On error, sign out as a safety measure
    await signOut({ redirect: true, callbackUrl: '/login' })
    return false
  }
}

/**
 * Verify if current session is still valid
 * Returns true if valid, false if expired
 */
export async function isSessionValid(): Promise<boolean> {
  const session = await getSession()
  return !!session
}
