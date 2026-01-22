import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'

/**
 * Hook to automatically redirect to login if session is expired
 * Use this in any component that requires authentication
 */
export function useSessionGuard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // If session is loaded and not authenticated, redirect to login
    if (status === 'unauthenticated' && pathname !== '/login') {
      router.push('/login')
    }
  }, [status, pathname, router])

  return {
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    session
  }
}
