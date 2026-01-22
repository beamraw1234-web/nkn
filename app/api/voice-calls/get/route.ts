import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const rawCallId = req.nextUrl.searchParams.get("callId");
    const callId = typeof rawCallId === 'string' ? rawCallId.trim().toUpperCase() : '';

    if (!callId) {
      return NextResponse.json(
        { error: "Call ID is required" },
        { status: 400 }
      );
    }

    const voiceCall = await prisma.voicecall.findUnique({
      where: { callId },
      select: {
        callId: true,
        creatorId: true,
        mode: true,
        status: true,
        roomName: true,
        password: true,
        participantIds: true,
        maxParticipants: true,
        startedAt: true,
        endedAt: true,
      },
    });

    if (!voiceCall) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const participants = JSON.parse(voiceCall.participantIds) as string[];

    return NextResponse.json({
      call: {
        callId: voiceCall.callId,
        creatorId: voiceCall.creatorId,
        mode: voiceCall.mode,
        status: voiceCall.status,
        roomName: voiceCall.roomName,
        hasPassword: !!voiceCall.password,
        maxParticipants: voiceCall.maxParticipants,
        startedAt: voiceCall.startedAt,
        endedAt: voiceCall.endedAt
      },
      participants,
      participantCount: participants.length
    });
  } catch (error) {
    console.error("Error fetching voice call:", error);
    return NextResponse.json(
      { error: "Failed to fetch voice call" },
      { status: 500 }
    );
  }
}
