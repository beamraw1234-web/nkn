import { NextResponse } from 'next/server'
import { updatePageAccess } from '@/lib/access-control'

export async function PATCH(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const p = (params instanceof Promise) ? await params : params
    const id = p.id
    const { allowedUsers, isMaintenance, maintenanceMessage } = await req.json()

    // Update the shared access control data
    updatePageAccess(id, allowedUsers, isMaintenance, maintenanceMessage)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'update_error', detail: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const p = (params instanceof Promise) ? await params : params
    const id = p.id

    // In a real app, this would delete from database
    // For demo, just return success
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'delete_error', detail: String(e) }, { status: 500 })
  }
}