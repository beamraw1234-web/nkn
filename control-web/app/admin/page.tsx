'use client'

import { useEffect, useMemo, useState } from 'react'

type Offweb = { isOff: boolean; message: string; updatedAt?: string }
type ApiKeyRow = {
  id: string
  name: string
  apiKeyPrefix: string
  isActive: boolean
  lastSeen: string | null
  lastIp: string | null
  createdAt: string
  updatedAt: string
}

function isOnline(lastSeen: string | null) {
  if (!lastSeen) return false
  const ts = new Date(lastSeen).getTime()
  if (!Number.isFinite(ts)) return false
  return Date.now() - ts <= 60_000
}

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState('')
  const [tokenSaved, setTokenSaved] = useState(false)

  const [offweb, setOffweb] = useState<Offweb>({ isOff: false, message: 'ปิดปรับปรุงระบบ' })
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [newName, setNewName] = useState('')
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null)

  const stats = useMemo(() => {
    const total = keys.length
    const active = keys.filter(k => k.isActive).length
    const online = keys.filter(k => k.isActive && isOnline(k.lastSeen)).length
    return { total, active, online, offline: Math.max(0, active - online) }
  }, [keys])

  const headers = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    const token = adminToken.trim()
    if (token) next['X-ADMIN-TOKEN'] = token
    return next
  }, [adminToken])

  const loadAll = async () => {
    const [offRes, keysRes] = await Promise.all([
      fetch('/api/admin/offweb', { headers, cache: 'no-store' }),
      fetch('/api/admin/api-keys', { headers, cache: 'no-store' })
    ])

    if (offRes.ok) {
      const data = await offRes.json()
      setOffweb({ isOff: Boolean(data?.isOff), message: String(data?.message || ''), updatedAt: data?.updatedAt })
    }
    if (keysRes.ok) {
      const data = await keysRes.json()
      setKeys(Array.isArray(data?.keys) ? data.keys : [])
    }
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem('control-web:admin-token') || ''
      if (saved) {
        setAdminToken(saved)
        setTokenSaved(true)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!adminToken.trim()) return
    loadAll().catch(() => {})
  }, [adminToken])

  const saveToken = () => {
    const t = adminToken.trim()
    if (!t) return
    try {
      localStorage.setItem('control-web:admin-token', t)
      setTokenSaved(true)
    } catch {
      setTokenSaved(false)
    }
  }

  const saveOffweb = async () => {
    const res = await fetch('/api/admin/offweb', {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOff: offweb.isOff, message: offweb.message })
    })
    if (!res.ok) return
    await loadAll()
  }

  const createKey = async () => {
    const name = newName.trim()
    if (!name) return
    const res = await fetch('/api/admin/api-keys', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return
    setCreatedApiKey(String(data?.apiKey || ''))
    setNewName('')
    await loadAll()
  }

  const toggleKey = async (row: ApiKeyRow, next: boolean) => {
    const res = await fetch(`/api/admin/api-keys/${encodeURIComponent(row.id)}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: next })
    })
    if (!res.ok) return
    await loadAll()
  }

  const deleteKey = async (row: ApiKeyRow) => {
    if (!confirm(`ลบ API Key ของ "${row.name}" ?`)) return
    const res = await fetch(`/api/admin/api-keys/${encodeURIComponent(row.id)}`, {
      method: 'DELETE',
      headers
    })
    if (!res.ok) return
    await loadAll()
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // ignore
    }
  }

  return (
    <div className="container">
      <div className="row" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0 }}>Control Web</h1>
          <div className="muted">สั่งเปิด/ปิดเว็บหลัก + จัดการ API Keys</div>
        </div>
        <a className="btn" href="/api/web-status" target="_blank" rel="noreferrer">ดู /api/web-status</a>
      </div>

      <div style={{ height: 14 }} />

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800 }}>Admin Token</div>
            <div className="muted">ใช้เข้าหน้านี้และเรียก Admin APIs</div>
          </div>
          {tokenSaved ? <span className="pill pillOk">บันทึกแล้ว</span> : <span className="pill pillOff">ยังไม่บันทึก</span>}
        </div>
        <div style={{ height: 10 }} />
        <div className="row">
          <input className="input" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} placeholder="ใส่ ADMIN_TOKEN" />
          <button className="btn btnPrimary" onClick={saveToken}>บันทึก</button>
          <button className="btn" onClick={() => loadAll()}>รีเฟรช</button>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800 }}>สถานะเว็บหลักทั้งหมด</div>
            <div className="muted">ถ้า “ปิดเว็บ” เว็บหลักจะ redirect ไป /maintenance</div>
          </div>
          <span className={`pill ${offweb.isOff ? 'pillWarn' : 'pillOk'}`}>{offweb.isOff ? 'ปิดเว็บ' : 'เปิดเว็บ'}</span>
        </div>
        <div style={{ height: 10 }} />
        <div className="row" style={{ alignItems: 'center' }}>
          <button className="btn" onClick={() => setOffweb(s => ({ ...s, isOff: !s.isOff }))}>
            สลับเป็น: {offweb.isOff ? 'เปิดเว็บ' : 'ปิดเว็บ'}
          </button>
          <button className="btn btnPrimary" onClick={saveOffweb}>บันทึก</button>
        </div>
        <div style={{ height: 10 }} />
        <textarea className="textarea" value={offweb.message} onChange={(e) => setOffweb(s => ({ ...s, message: e.target.value }))} />
      </div>

      <div style={{ height: 14 }} />

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800 }}>API Keys</div>
            <div className="muted">Online = เรียก /api/web-status ภายใน 1 นาที</div>
          </div>
          <div className="row">
            <span className="pill pillOff">ทั้งหมด {stats.total}</span>
            <span className="pill pillOk">Online {stats.online}</span>
            <span className="pill pillOff">Offline {stats.offline}</span>
          </div>
        </div>
        <div style={{ height: 10 }} />

        <div className="row">
          <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ชื่อเว็บหลัก เช่น main-web-1" />
          <button className="btn btnPrimary" onClick={createKey}>สร้างคีย์</button>
        </div>

        {createdApiKey && (
          <>
            <div style={{ height: 10 }} />
            <div className="card" style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.25)' }}>
              <div style={{ fontWeight: 800 }}>API Key (แสดงครั้งเดียว)</div>
              <div className="mono" style={{ fontSize: 12, wordBreak: 'break-all', marginTop: 6 }}>{createdApiKey}</div>
              <div style={{ height: 8 }} />
              <button className="btn" onClick={() => copy(createdApiKey)}>คัดลอก</button>
            </div>
          </>
        )}

        <div style={{ height: 10 }} />
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>สถานะ</th>
                <th>ชื่อ</th>
                <th>Prefix</th>
                <th>Online</th>
                <th>IP ล่าสุด</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => {
                const online = k.isActive && isOnline(k.lastSeen)
                return (
                  <tr key={k.id}>
                    <td>{k.isActive ? <span className="pill pillOk">Active</span> : <span className="pill pillOff">Disabled</span>}</td>
                    <td style={{ fontWeight: 700 }}>{k.name}</td>
                    <td className="mono">{k.apiKeyPrefix}</td>
                    <td>{online ? <span className="pill pillOk">Online</span> : <span className="pill pillOff">Offline</span>}</td>
                    <td className="mono">{k.lastIp || '—'}</td>
                    <td>
                      <div className="row">
                        <button className="btn" onClick={() => toggleKey(k, !k.isActive)}>{k.isActive ? 'ปิดคีย์' : 'เปิดคีย์'}</button>
                        <button className="btn btnDanger" onClick={() => deleteKey(k)}>ลบ</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {keys.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted" style={{ padding: 16 }}>ยังไม่มี API Key</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
