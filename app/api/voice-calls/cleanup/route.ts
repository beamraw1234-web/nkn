import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * Cleanup route for automatically ending empty voice calls after 5 minutes
 * Can be called by a cron job or periodic task
 */
export async function POST(req: NextRequest) {
  try {
    // Optional: Add authentication check if needed
    // You can set an authorization header or use a secret token

    const now = new Date();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

    // Find all WAITING calls (empty rooms) that have been waiting for 5+ minutes
    // Use updatedAt to track when room became empty
    const expiredCalls = await prisma.voicecall.findMany({
      where: {
        status: "WAITING",
        updatedAt: {
          lte: fiveMinutesAgo, // Updated at or before 5 minutes ago
        },
      },
    });

    if (expiredCalls.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expired calls to cleanup",
        cleaned: 0,
      });
    }

    // End all expired calls
    const updateResult = await prisma.voicecall.updateMany({
      where: {
        status: "WAITING",
        updatedAt: {
          lte: fiveMinutesAgo,
        },
      },
      data: {
        status: "ENDED",
        endedAt: now,
      },
    });

    console.log(`Cleaned up ${updateResult.count} expired voice calls`);

    return NextResponse.json({
      success: true,
      message: "Cleanup completed",
      cleaned: updateResult.count,
      expiredCalls: expiredCalls.map((call) => ({
        callId: call.callId,
        updatedAt: call.updatedAt,
        endedAt: call.endedAt,
      })),
    });
  } catch (error) {
    console.error("Error during voice call cleanup:", error);
    return NextResponse.json(
      { error: "Cleanup failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}
