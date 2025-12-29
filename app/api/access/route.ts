import { NextResponse } from 'next/server'
import { getAllPageAccess } from '@/lib/access-control'

export async function GET() {
  try {
    const pages = getAllPageAccess()
    return NextResponse.json(pages)
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'get_error', detail: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // In a real app, this would save to database
    // For demo, we'll just return success
    const newPage = {
      id: Date.now().toString(),
      ...body,
    }
    return NextResponse.json({ ok: true, page: newPage })
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'create_error', detail: String(e) }, { status: 500 })
  }
}