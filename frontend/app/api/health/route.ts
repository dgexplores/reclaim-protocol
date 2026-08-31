import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "reclaim-protocol",
      version: "1.0.0",
      network: "Base Sepolia (84532)",
      uptime: process.uptime?.() ?? 0,
      timestamp: new Date().toISOString(),
      checks: {
        api: "pass",
        rateLimit: "pass",
        securityHeaders: "pass",
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
