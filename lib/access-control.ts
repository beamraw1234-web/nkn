// Shared access control data
// In production, this would be in a database with proper caching
import fs from 'fs'
import path from 'path'

export interface PageAccess {
  id: string
  page: string
  allowedUsers: string[]
  isMaintenance: boolean
  maintenanceMessage?: string
}

const DATA_FILE = path.join(process.cwd(), 'lib', 'access-data.json')

// In-memory cache to avoid reading file on every request
let dataCache: Record<string, { allowedUsers: string[], isMaintenance: boolean, maintenanceMessage?: string }> | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 5000 // 5 seconds

export const accessControlData: Record<string, { allowedUsers: string[], isMaintenance: boolean, maintenanceMessage?: string }> = {
  '/admin': { allowedUsers: [], isMaintenance: false }, // Empty means only admins
  '/admin/files': { allowedUsers: [], isMaintenance: false },
  '/admin/users': { allowedUsers: [], isMaintenance: false },
  '/admin/categories': { allowedUsers: [], isMaintenance: false },
  '/admin/access': { allowedUsers: [], isMaintenance: false },
  '/profile': { allowedUsers: [], isMaintenance: false }, // Empty means authenticated users
  '/settings': { allowedUsers: [], isMaintenance: false },
}

// Load initial data synchronously
try {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, 'utf8')
    const parsed = JSON.parse(data)
    Object.assign(accessControlData, parsed)
    // Removed verbose console log
  } else {
    // Removed verbose console log
  }
} catch (error) {
  console.error('Failed to load initial access data:', error)
}

// Load saved data from JSON file with caching
function loadAccessData() {
  const now = Date.now()

  // Use cache if it's still valid
  if (dataCache && (now - cacheTimestamp) < CACHE_DURATION) {
    Object.assign(accessControlData, dataCache)
    return
  }

  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8')
      const parsed = JSON.parse(data)
      Object.assign(accessControlData, parsed)
      dataCache = { ...parsed }
      cacheTimestamp = now
      // Removed annoying console log
    } else {
      // Removed annoying console log - only log errors
      // Create the file with defaults
      saveAccessData()
    }
  } catch (error) {
    console.error('Failed to load access data:', error)
    console.error('File path:', DATA_FILE)
  }
}

// Save data to JSON file
function saveAccessData() {
  try {
    // Ensure directory exists
    const dir = path.dirname(DATA_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(accessControlData, null, 2), 'utf8')
    // Clear cache to force reload on next access
    dataCache = null
    cacheTimestamp = 0
    // Removed verbose console log
  } catch (error) {
    console.error('Failed to save access data:', error)
    console.error('File path:', DATA_FILE)
    console.error('Data to save:', accessControlData)
  }
}

export function updatePageAccess(pageId: string, allowedUsers: string[], isMaintenance: boolean, maintenanceMessage?: string) {
  // Removed verbose console log

  loadAccessData()

  // Map page IDs to paths
  const idToPath: Record<string, string> = {
    '1': '/admin',
    '2': '/admin/files',
    '3': '/admin/users',
    '4': '/admin/categories',
    '5': '/admin/access',
    '6': '/profile',
    '7': '/settings'
  }

  const pagePath = idToPath[pageId]
  if (pagePath) {
    accessControlData[pagePath] = { allowedUsers, isMaintenance, maintenanceMessage }
    // Removed verbose console log
    saveAccessData()
  } else {
    console.error('Invalid pageId:', pageId, 'available IDs:', Object.keys(idToPath))
  }
}

export function getPageAccess(path: string) {
  loadAccessData()
  const result = accessControlData[path]
  // Removed annoying console log that appears on every request
  return result
}

export function getAllPageAccess() {
  // Ensure we load the latest data from file
  loadAccessData()

  const pathToId: Record<string, string> = {
    '/admin': '1',
    '/admin/files': '2',
    '/admin/users': '3',
    '/admin/categories': '4',
    '/admin/access': '5',
    '/profile': '6',
    '/settings': '7'
  }

  const result = Object.entries(accessControlData).map(([path, data]) => ({
    id: pathToId[path] || '1',
    page: path === '/admin' ? 'จัดการผู้ใช้' :
          path === '/admin/files' ? 'จัดการไฟล์' :
          path === '/admin/users' ? 'จัดการผู้ดูแล' :
          path === '/admin/categories' ? 'จัดการหมวดหมู่' :
          path === '/admin/access' ? 'จัดการการเข้าถึง' :
          path === '/profile' ? 'โปรไฟล์' :
          path === '/settings' ? 'ตั้งค่า' : path,
    allowedUsers: data.allowedUsers,
    isMaintenance: data.isMaintenance,
    maintenanceMessage: data.maintenanceMessage
  }))

  // Removed verbose console log
  return result
}