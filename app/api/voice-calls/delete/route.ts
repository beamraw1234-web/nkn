import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user;
    const userId = sessionUser?.id ? String(sessionUser.id) : null;
    const username = sessionUser?.username ? String(sessionUser.username) : null;

    if (!userId && !username) {
      return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: userId ? { id: userId } : { username: username || "" }
    });

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    const body = await req.json();
    const rawCallId = body?.callId;
    const callId = typeof rawCallId === "string" ? rawCallId.trim().toUpperCase() : "";

    if (!callId) {
      return NextResponse.json({ error: "ต้องระบุ Call ID" }, { status: 400 });
    }

    const room = await prisma.voicecall.findUnique({
      where: { callId }
    });

    if (!room) {
      return NextResponse.json({ error: "ไม่พบห้อง" }, { status: 404 });
    }

    if (room.creatorId !== user.id) {
      return NextResponse.json({ error: "เฉพาะเจ้าของห้องเท่านั้นที่ลบได้" }, { status: 403 });
    }

    const now = new Date();
    await prisma.voicecall.update({
      where: { id: room.id },
      data: {
        status: "ENDED",
        endedAt: now,
        participantIds: JSON.stringify([]),
        inviteToken: null,
        isPublic: false,
        updatedAt: now
      }
    });

    await prisma.voicecallhistory.create({
      data: {
        id: uuidv4(),
        callId: room.callId,
        voiceCallId: room.id,
        userId: user.id,
        action: "DELETED"
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting voice call:", error);
    return NextResponse.json({ error: "ไม่สามารถลบห้องได้" }, { status: 500 });
  }
}
