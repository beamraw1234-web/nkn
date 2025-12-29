'use client'

import LogTable from '@/components/LogTable'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
export default function UserLogsPage() {
  return (
    <div className="min-h-screen p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="inline-flex items-center px-4 py-2 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md text-gray-700 dark:text-gray-300 rounded-xl shadow-sm hover:bg-white dark:hover:bg-neutral-800 transition-all mb-6 group border border-gray-200 dark:border-neutral-800">
          <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={20} />
          {'กลับหน้าหลัก'}
        </Link>
        
        <LogTable role="USER" title="User Logs" />
      </div>
    </div>
  )
}
