import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

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
    const { inviteToken, password } = body;

    if (!inviteToken) {
      return NextResponse.json(
        { error: "ต้องระบุลิงค์เชิญ" },
        { status: 400 }
      );
    }

    // ค้นหาห้องผ่าน invite token
    const room = await prisma.voicecall.findUnique({
      where: { inviteToken }
    });

    if (!room) {
      return NextResponse.json(
        { error: "ลิงค์เชิญไม่ถูกต้อง" },
        { status: 404 }
      );
    }

    if (room.status === "ENDED") {
      return NextResponse.json(
        { error: "ห้องพูดคุยนี้ปิดแล้ว" },
        { status: 400 }
      );
    }

    // ตรวจสอบรหัสผ่านถ้ามี
    if (room.password) {
      if (!password) {
        return NextResponse.json(
          { error: "ต้องกรอกรหัสผ่าน" },
          { status: 403 }
        );
      }

      const isPasswordValid = await bcrypt.compare(password, room.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "รหัสผ่านไม่ถูกต้อง" },
          { status: 403 }
        );
      }
    }

    // ตรวจสอบจำนวนผู้เข้าร่วม
    const participants = JSON.parse(room.participantIds) as string[];
    if (participants.length >= room.maxParticipants) {
      return NextResponse.json(
        { error: "ห้องเต็มแล้ว" },
        { status: 400 }
      );
    }

    // เพิ่มผู้ใช้เข้าห้อง
    if (!participants.includes(user.id)) {
      participants.push(user.id);

      await prisma.voicecall.update({
        where: { id: room.id },
        data: {
          participantIds: JSON.stringify(participants),
          status: "ACTIVE",
          updatedAt: new Date()
        }
      });
    }

    // บันทึกประวัติ
    await prisma.voicecallhistory.create({
      data: {
        id: uuidv4(),
        callId: room.callId,
        voiceCallId: room.id,
        userId: user.id,
        action: "JOINED"
      }
    });

    return NextResponse.json({
      success: true,
      room: {
        id: room.id,
        callId: room.callId,
        roomName: room.roomName,
        mode: room.mode,
        isPublic: room.isPublic,
        participantCount: participants.length
      }
    });
  } catch (error) {
    console.error("Error joining via invite:", error);
    return NextResponse.json(
      { error: "ไม่สามารถเข้าร่วมห้องได้" },
      { status: 500 }
    );
  }
}
