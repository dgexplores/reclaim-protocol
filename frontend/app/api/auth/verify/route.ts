import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// Minimal SIWE-like verify placeholder. In production, use viem verifyMessage / siwe lib.
// This endpoint demonstrates authentication flow without external deps.
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { address, message, signature } = body;
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "address required (0x...)", code: "BAD_ADDRESS" }, { status: 422 });
  }
  if (!message || typeof message !== "string" || message.length < 10) {
    return NextResponse.json({ error: "message required" }, { status: 422 });
  }
  if (!signature || !/^0x[0-9a-fA-F]+$/.test(signature)) {
    return NextResponse.json({ error: "signature required (0x...)" }, { status: 422 });
  }

  // Mock verify: check signature length plausible (132 chars for 65 bytes)
  // Real: await verifyMessage({ address, message, signature })
  const plausible = signature.length === 132;
  if (!plausible) {
    return NextResponse.json({ verified: false, reason: "signature length invalid" }, { status: 401 });
  }

  // Issue a short-lived demo token (edge, stateless). Prod: JWT + httpOnly cookie
  const token = btoa(`${address}:${Date.now()}:${crypto.randomUUID()}`).slice(0, 32);
  return NextResponse.json(
    { verified: true, address: address.toLowerCase(), token, expiresIn: 3600 },
    {
      status: 200,
      headers: {
        // Example auth cookie (demo, not httpOnly for edge without key)
        "Set-Cookie": `reclaim_auth=${token}; Path=/; Max-Age=3600; SameSite=Lax`,
      },
    }
  );
}
