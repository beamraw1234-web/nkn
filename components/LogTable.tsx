'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, User, Activity, Info } from 'lucide-react'
interface Log {
  id: string
  username: string
  action: string
  details: string
  ip: string
  createdAt: string
}

interface LogTableProps {
  role: 'USER' | 'ADMIN'
  title: string
}

export default function LogTable({ role, title }: LogTableProps) {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/logs?role=${role}`)
      .then(res => res.json())
      .then(data => {
        setLogs(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [role])

  if (loading) return <div className="p-8 text-center dark:text-white">{'กำลังโหลด...'}</div>

  return (
    <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 md:p-8 border border-white/20 dark:border-neutral-800">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
        <Activity className="text-blue-500" />
        {title}
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-200 dark:border-neutral-800">
              <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">{'เวลา'}</th>
              <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">{'ผู้ใช้งาน'}</th>
              <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">{'การกระทำ'}</th>
              <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">{'รายละเอียด'}</th>
              <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-gray-100 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                <td className="p-4 text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    {new Date(log.createdAt).toLocaleString('th-TH')}
                  </div>
                </td>
                <td className="p-4 font-medium text-gray-800 dark:text-gray-200">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400" />
                    {log.username}
                  </div>
                </td>
                <td className="p-4">
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {log.action}
                  </span>
                </td>
                <td className="p-4 text-gray-600 dark:text-gray-300 max-w-xs truncate" title={log.details}>
                  {log.details}
                </td>
                <td className="p-4 text-gray-500 dark:text-gray-400 font-mono text-sm">
                  {log.ip}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                  {'ไม่มีข้อมูล'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
