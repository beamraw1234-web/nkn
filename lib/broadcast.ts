import { EventEmitter } from 'events'

export type BroadcastPayload = {
  id: string
  type: 'ADMIN_ANNOUNCEMENT' | 'BROADCAST'
  title?: string
  message: string
  meta?: Record<string, unknown>
  createdAt: string
}

export type BroadcastLevel = 'info' | 'success' | 'warning' | 'error'

type BroadcastEvents = {
  broadcast: (payload: BroadcastPayload) => void
}

function getEmitter(): EventEmitter {
  const g = globalThis as unknown as { __broadcastEmitter?: EventEmitter }
  if (!g.__broadcastEmitter) {
    g.__broadcastEmitter = new EventEmitter()
    // Avoid memory leak warnings if many clients connect.
    g.__broadcastEmitter.setMaxListeners(0)
  }
  return g.__broadcastEmitter
}

export function publishBroadcast(payload: BroadcastPayload) {
  getEmitter().emit('broadcast', payload)
}

export function onBroadcast(listener: BroadcastEvents['broadcast']) {
  const emitter = getEmitter()
  emitter.on('broadcast', listener)
  return () => emitter.off('broadcast', listener)
}
