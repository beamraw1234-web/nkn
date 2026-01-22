import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

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
    const { 
      mode = "PRIVATE", 
      roomName = null, 
      isPublic = false, 
      participantIds = [],
      maxParticipants = 7
    } = body;

    if (!["PRIVATE", "ANONYMOUS"].includes(mode)) {
      return NextResponse.json(
        { error: "โหมดไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const max = Number(maxParticipants);
    if (!Number.isFinite(max) || !Number.isInteger(max) || max < 2 || max > 20) {
      return NextResponse.json(
        { error: "จำนวนคนต้องอยู่ระหว่าง 2-20" },
        { status: 400 }
      );
    }

    // สร้าง Call ID
    const callId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // สร้าง invite token สำหรับห้องสาธารณะ
    const inviteToken = isPublic ? crypto.randomBytes(16).toString("hex") : null;

    const voiceCall = await prisma.voicecall.create({
      data: {
        id: uuidv4(),
        callId,
        creatorId: user.id,
        mode,
        isPublic,
        roomName: isPublic ? (roomName?.trim() || "ห้องที่ไม่มีชื่อ") : null,
        inviteToken,
        participantIds: JSON.stringify([user.id]),
        maxParticipants: max
      }
    });

    // บันทึกประวัติ
    await prisma.voicecallhistory.create({
      data: {
        id: uuidv4(),
        callId,
        voiceCallId: voiceCall.id,
        userId: user.id,
        action: "JOINED"
      }
    });

    return NextResponse.json({
      success: true,
      voiceCall: {
        id: voiceCall.id,
        callId: voiceCall.callId,
        mode: voiceCall.mode,
        isPublic: voiceCall.isPublic,
        roomName: voiceCall.roomName,
        inviteToken: voiceCall.inviteToken
      }
    });
  } catch (error) {
    console.error("Error creating voice call:", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้างห้องได้" },
      { status: 500 }
    );
  }
}
