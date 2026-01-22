import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // ดึงรายการห้องสาธารณะที่ยังเปิดอยู่
  const publicRooms = await prisma.voicecall.findMany({
      where: {
        isPublic: true,
        status: { in: ["ACTIVE", "WAITING"] }
      },
      select: {
        id: true,
        callId: true,
        roomName: true,
        creatorId: true,
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            profilePicture: true
          }
        },
        participantIds: true,
        maxParticipants: true,
        password: true, // null = ไม่มีรหัส, มีค่า = มีรหัส
        mode: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    const formattedRooms = publicRooms.map(room => {
      const participants = JSON.parse(room.participantIds) as string[];
      return {
        id: room.id,
        callId: room.callId,
        roomName: room.roomName || "ห้องที่ไม่มีชื่อ",
        creator: room.creator,
        participantCount: participants.length,
        maxParticipants: room.maxParticipants,
        hasPassword: !!room.password,
        mode: room.mode,
        status: room.status,
        createdAt: room.createdAt
      };
    });

    return NextResponse.json({
      success: true,
      rooms: formattedRooms,
      total: formattedRooms.length
    });
  } catch (error) {
    console.error("Error fetching public rooms:", error);
    return NextResponse.json(
      { error: "ไม่สามารถดึงรายการห้องได้" },
      { status: 500 }
    );
  }
}
