import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Prisma } from "@prisma/client";

export async function PUT(req: NextRequest) {
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
    const { callId, roomName, password, action, maxParticipants } = body;

    if (!callId) {
      return NextResponse.json(
        { error: "ต้องระบุ Call ID" },
        { status: 400 }
      );
    }

    // ค้นหาห้อง
    const room = await prisma.voicecall.findUnique({
      where: { callId }
    });

    if (!room) {
      return NextResponse.json({ error: "ไม่พบห้อง" }, { status: 404 });
    }

    // ตรวจสอบว่าเป็นเจ้าของห้อง
    if (room.creatorId !== user.id) {
      return NextResponse.json(
        { error: "เฉพาะเจ้าของห้องเท่านั้นที่สามารถแก้ไขได้" },
        { status: 403 }
      );
    }

    const updateData: Prisma.voicecallUpdateInput = {};

    // อัปเดตชื่อห้อง
    if (roomName !== undefined) {
      updateData.roomName = { set: roomName.trim() || null };
    }

    // จัดการรหัสผ่าน
    if (action === "set_password" && password) {
      if (password.length < 4) {
        return NextResponse.json(
          { error: "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร" },
          { status: 400 }
        );
      }
      updateData.password = { set: await bcrypt.hash(password, 10) };
    } else if (action === "remove_password") {
      updateData.password = { set: null };
    }

    // สร้างหรืออัปเดต invite token
    if (action === "generate_invite") {
      updateData.inviteToken = { set: crypto.randomBytes(16).toString("hex") };
    }

    // ตั้งค่าจำนวนผู้เข้าร่วมสูงสุด
    if (action === "set_max_participants") {
      const max = Number(maxParticipants);
      if (!Number.isFinite(max) || !Number.isInteger(max)) {
        return NextResponse.json({ error: "จำนวนคนต้องเป็นตัวเลขจำนวนเต็ม" }, { status: 400 });
      }

      if (max < 2 || max > 20) {
        return NextResponse.json({ error: "จำนวนคนต้องอยู่ระหว่าง 2-20" }, { status: 400 });
      }

      const participants = JSON.parse(room.participantIds) as string[];
      if (participants.length > max) {
        return NextResponse.json({ error: "จำนวนคนปัจจุบันมากกว่าที่ตั้งไว้" }, { status: 400 });
      }

      updateData.maxParticipants = { set: max };
    }

    updateData.updatedAt = { set: new Date() };

    const updatedRoom = await prisma.voicecall.update({
      where: { id: room.id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      room: {
        id: updatedRoom.id,
        callId: updatedRoom.callId,
        roomName: updatedRoom.roomName,
        hasPassword: !!updatedRoom.password,
        inviteToken: updatedRoom.inviteToken,
        maxParticipants: updatedRoom.maxParticipants
      }
    });
  } catch (error) {
    console.error("Error updating room settings:", error);
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตตั้งค่าได้" },
      { status: 500 }
    );
  }
}
