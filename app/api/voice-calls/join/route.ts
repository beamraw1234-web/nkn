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
      return NextResponse.json({ error: "ไม่พบห้องพูดคุย" }, { status: 404 });
    }

    if (voiceCall.status === "ENDED") {
      return NextResponse.json(
        { error: "ห้องพูดคุยนี้ปิดแล้ว" },
        { status: 400 }
      );
    }

    // Check max participants
    const participants = JSON.parse(voiceCall.participantIds) as string[];
    if (participants.length >= voiceCall.maxParticipants) {
      return NextResponse.json(
        { error: "Maximum participants reached" },
        { status: 400 }
      );
    }

    // Add user to participants if not already present
    if (!participants.includes(user.id)) {
      participants.push(user.id);
      
      // If room was WAITING (empty), re-activate it
      const isReactivating = voiceCall.status === "WAITING";
      
      await prisma.voicecall.update({
        where: { id: voiceCall.id },
        data: {
          participantIds: JSON.stringify(participants),
          status: isReactivating ? "ACTIVE" : "ACTIVE",
          updatedAt: new Date(),
        },
      });
    }

    // Create history record
    await prisma.voicecallhistory.create({
      data: {        id: uuidv4(),        callId,
        voiceCallId: voiceCall.id,
        userId: user.id,
        action: "JOINED",
      },
    });

    return NextResponse.json({
      voiceCall,
      participants: participants.length,
    });
  } catch (error) {
    console.error("Error joining voice call:", error);
    return NextResponse.json(
      { error: "Failed to join voice call" },
      { status: 500 }
    );
  }
}
