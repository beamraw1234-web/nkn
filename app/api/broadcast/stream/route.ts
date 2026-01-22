import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/authOptions'
import { onBroadcast } from '@/lib/broadcast'

export const runtime = 'nodejs'

function sseHeaders() {
  return {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Nginx/Proxies
    'X-Accel-Buffering': 'no',
  } as Record<string, string>
}

function encodeSseEvent(eventName: string, data: unknown, id?: string) {
  const lines: string[] = []
  if (id) lines.push(`id: ${id}`)
  if (eventName) lines.push(`event: ${eventName}`)
  lines.push(`data: ${JSON.stringify(data)}`)
  return lines.join('\n') + '\n\n'
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let cleanup: (() => void) | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()

      // Initial hello (also helps some proxies establish the stream).
      controller.enqueue(encoder.encode(': connected\n\n'))

      const unsubscribe = onBroadcast((payload) => {
        controller.enqueue(encoder.encode(encodeSseEvent('broadcast', payload, payload.id)))
      })

      const pingTimer = setInterval(() => {
        controller.enqueue(encoder.encode(': ping\n\n'))
      }, 25_000)

      const abort = () => {
        clearInterval(pingTimer)
        unsubscribe()
        try {
          controller.close()
        } catch {
          // ignore
        }
      }

      cleanup = abort
      req.signal.addEventListener('abort', abort)
    },
    cancel() {
      cleanup?.()
    },
  })

  return new Response(stream, { headers: sseHeaders() })
}
