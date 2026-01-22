import { NextRequest, NextResponse } from "next/server";

/**
 * Cron handler to run voice call cleanup every 1 minute
 * This should be triggered by an external cron service or middleware
 */
export async function GET(req: NextRequest) {
  try {
    // Run the cleanup endpoint
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/voice-calls/cleanup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    return NextResponse.json({
      success: true,
      cleanupResult: data,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Cron job failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}
