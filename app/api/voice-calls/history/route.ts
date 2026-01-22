import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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

    // Get call history for this user
    const history = await prisma.voicecallhistory.findMany({
      where: {
        userId: user.id,
      },
      include: {
        voiceCall: {
          select: {
            callId: true,
            creatorId: true,
            mode: true,
            status: true,
            roomName: true,
            participantIds: true,
            startedAt: true,
            endedAt: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      take: 50,
    });

    // Group by unique calls and calculate duration
    const callsMap = new Map<string, {
      callId: string
      mode: string
      creatorId: string
      status: string
      roomName: string | null
      participantCount: number
      startedAt: Date
      endedAt: Date | null
      duration: number | null
      firstJoinedAt: Date
    }>()
    
    history.forEach((record) => {
      const callId = record.voiceCall.callId;
      if (!callsMap.has(callId)) {
        const duration = record.voiceCall.endedAt
          ? Math.floor(
              (record.voiceCall.endedAt.getTime() -
                record.voiceCall.startedAt.getTime()) /
                1000
            )
          : null;

        callsMap.set(callId, {
          callId,
          mode: record.voiceCall.mode,
          creatorId: record.voiceCall.creatorId,
          status: record.voiceCall.status,
          roomName: record.voiceCall.roomName,
          participantCount: (
            JSON.parse(record.voiceCall.participantIds) as string[]
          ).length,
          startedAt: record.voiceCall.startedAt,
          endedAt: record.voiceCall.endedAt,
          duration, // in seconds
          firstJoinedAt: record.timestamp,
        });
      }
    });

    const calls = Array.from(callsMap.values());

    return NextResponse.json({
      calls,
      total: calls.length,
    });
  } catch (error) {
    console.error("Error fetching voice call history:", error);
    return NextResponse.json(
      { error: "Failed to fetch call history" },
      { status: 500 }
    );
  }
}
