import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Pins a proof image to IPFS via Lighthouse. The API key stays server-side.
 */
export async function POST(req: NextRequest) {
  const key = process.env.LIGHTHOUSE_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "IPFS pinning is not configured. Set LIGHTHOUSE_API_KEY.", code: "IPFS_UNCONFIGURED" },
      { status: 503 }
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided", code: "NO_FILE" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image exceeds 8MB", code: "TOO_LARGE" }, { status: 413 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images can be pinned", code: "BAD_TYPE" }, { status: 415 });
  }

  const upstream = new FormData();
  upstream.append("file", file, "proof.jpg");

  try {
    const res = await fetch("https://node.lighthouse.storage/api/v0/add", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: upstream,
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Lighthouse rejected the upload (${res.status})`, code: "UPSTREAM" }, { status: 502 });
    }
    const data = await res.json();
    if (!data?.Hash) {
      return NextResponse.json({ error: "Lighthouse returned no CID", code: "NO_CID" }, { status: 502 });
    }
    return NextResponse.json({ cid: data.Hash as string });
  } catch {
    return NextResponse.json({ error: "Could not reach the IPFS node", code: "NETWORK" }, { status: 502 });
  }
}
