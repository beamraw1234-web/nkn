import { Suspense } from 'react'
import MaintenanceClient from './MaintenanceClient'

export default function MaintenancePage() {
  return (
    <>
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>กำลังโหลด...</p>
          </div>
        </div>
      }>
        <MaintenanceClient />
      </Suspense>
    </>
  )
}