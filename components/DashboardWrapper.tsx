"use client"

import dynamic from 'next/dynamic'

const UserDashboard = dynamic(() => import('@/components/dashboard/UserDashboard'), { ssr: false })
const AdminDashboard = dynamic(() => import('@/components/dashboard/AdminDashboard'), { ssr: false })

export default function DashboardWrapper({ session, logoUrl, viewAsUser }: { session: any, logoUrl: string, viewAsUser: boolean }) {
  if (session.user?.role === 'ADMIN' && !viewAsUser) {
    return <AdminDashboard session={session} logoUrl={logoUrl} />
  }

  return <UserDashboard session={session} logoUrl={logoUrl} />
}