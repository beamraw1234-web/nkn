import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user;
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = sessionUser?.id ? String(sessionUser.id) : null;
    const username = sessionUser?.username ? String(sessionUser.username) : null;
    if (!userId && !username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: userId ? { id: userId } : { username: username || '' },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const rawCallId = body?.callId;
    const callId = typeof rawCallId === 'string' ? rawCallId.trim().toUpperCase() : '';

    if (!callId) {
      return NextResponse.json(
        { error: "Call ID is required" },
        { status: 400 }
      );
    }

    const voiceCall = await prisma.voicecall.findUnique({
      where: { callId },
    });

    if (!voiceCall) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // Remove user from participants
    let participants = JSON.parse(voiceCall.participantIds) as string[];
    participants = participants.filter((id) => id !== user.id);

    // If no more participants, mark room as waiting (will be auto-closed after 5 min)
    const isRoomEmpty = participants.length === 0;

    if (isRoomEmpty) {
      // Store empty timestamp in updatedAt temporarily, status changes to WAITING
      await prisma.voicecall.update({
        where: { id: voiceCall.id },
        data: {
          participantIds: JSON.stringify(participants),
          status: "WAITING", // Room is waiting for cleanup (empty for 5 min)
          updatedAt: new Date(), // Use updatedAt to track when room became empty
        },
      });
    } else {
      // Room still has participants, just update
      await prisma.voicecall.update({
        where: { id: voiceCall.id },
        data: {
          participantIds: JSON.stringify(participants),
          status: "ACTIVE",
          updatedAt: new Date(),
        },
      });
    }

    // Create history record
    await prisma.voicecallhistory.create({
      data: {        id: uuidv4(),        callId,
        voiceCallId: voiceCall.id,
        userId: user.id,
        action: "LEFT",
      },
    });

    return NextResponse.json({
      success: true,
      callEnded: false,
      isRoomEmpty,
      roomWillAutoClose: isRoomEmpty, // Will auto-close in 5 minutes
    });
  } catch (error) {
    console.error("Error leaving voice call:", error);
    return NextResponse.json(
      { error: "Failed to leave voice call" },
      { status: 500 }
    );
  }
}
