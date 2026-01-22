import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'

// PATCH /api/friends/requests/[id] - Accept or reject friend request
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { action } = await req.json() // 'accept' or 'reject'

    const friendship = await prisma.friendship.findUnique({
      where: { id }
    })

    if (!friendship || friendship.friendId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (action === 'accept') {
      await prisma.friendship.update({
        where: { id },
        data: { status: 'ACCEPTED' }
      })
      return NextResponse.json({ success: true, status: 'ACCEPTED' })
    } else if (action === 'reject') {
      await prisma.friendship.delete({
        where: { id }
      })
      return NextResponse.json({ success: true, status: 'REJECTED' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating friend request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/friends/requests/[id] - Remove friend
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const friendship = await prisma.friendship.findFirst({
      where: {
        id,
        OR: [
          { userId: session.user.id },
          { friendId: session.user.id }
        ]
      }
    })

    if (!friendship) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // หาว่า friend คือใคร
    const deletedFriendId = friendship.userId === session.user.id 
      ? friendship.friendId 
      : friendship.userId

    await prisma.friendship.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, deletedFriendId })
  } catch (error) {
    console.error('Error removing friend:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
