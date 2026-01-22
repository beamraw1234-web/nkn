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
    const { mode, participantIds = [] } = body; // mode: PRIVATE or ANONYMOUS

    if (!["PRIVATE", "ANONYMOUS"].includes(mode)) {
      return NextResponse.json(
        { error: "Invalid mode. Must be PRIVATE or ANONYMOUS" },
        { status: 400 }
      );
    }

    // Generate shorter call ID (6 characters)
    const callId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const voiceCall = await prisma.voicecall.create({
      data: {
        id: uuidv4(),
        callId,
        creatorId: user.id,
        mode,
        participantIds: JSON.stringify([user.id]),
        maxParticipants: 7,
      },
    });

    // Create history record for creator
    await prisma.voicecallhistory.create({
      data: {        id: uuidv4(),        callId,
        voiceCallId: voiceCall.id,
        userId: user.id,
        action: "JOINED",
      },
    });

    return NextResponse.json({
      voiceCall,
      callId,
    });
  } catch (error) {
    console.error("Error creating voice call:", error);
    return NextResponse.json(
      { error: "Failed to create voice call" },
      { status: 500 }
    );
  }
}
