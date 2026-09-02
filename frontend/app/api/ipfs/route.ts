import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Pins a proof image to IPFS. Keys stay server-side.
 *
 * Two providers because reachability varies by network: Lighthouse is blocked
 * outright on some ISPs (observed on the dev machine, DNS resolves but the
 * connection never opens), while Pinata is reachable. Whichever is configured
 * wins, Pinata first.
 */
async function pinToPinata(file: File, jwt: string) {
  const form = new FormData();
  form.append("file", file, "proof.jpg");
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Pinata rejected the upload (${res.status})`);
  const data = await res.json();
  if (!data?.IpfsHash) throw new Error("Pinata returned no CID");
  return data.IpfsHash as string;
}

async function pinToLighthouse(file: File, key: string) {
  const form = new FormData();
  form.append("file", file, "proof.jpg");
  const res = await fetch("https://node.lighthouse.storage/api/v0/add", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Lighthouse rejected the upload (${res.status})`);
  const data = await res.json();
  if (!data?.Hash) throw new Error("Lighthouse returned no CID");
  return data.Hash as string;
}

export async function POST(req: NextRequest) {
  const pinataJwt = process.env.PINATA_JWT;
  const lighthouseKey = process.env.LIGHTHOUSE_API_KEY;
  if (!pinataJwt && !lighthouseKey) {
    return NextResponse.json(
      { error: "IPFS pinning is not configured. Set PINATA_JWT or LIGHTHOUSE_API_KEY.", code: "IPFS_UNCONFIGURED" },
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

  const attempts: Array<[string, () => Promise<string>]> = [];
  if (pinataJwt) attempts.push(["Pinata", () => pinToPinata(file, pinataJwt)]);
  if (lighthouseKey) attempts.push(["Lighthouse", () => pinToLighthouse(file, lighthouseKey)]);

  const failures: string[] = [];
  for (const [name, run] of attempts) {
    try {
      const cid = await run();
      return NextResponse.json({ cid, provider: name });
    } catch (e: any) {
      failures.push(`${name}: ${e?.message || "unreachable"}`);
    }
  }
  return NextResponse.json(
    { error: `Could not pin the proof. ${failures.join("; ")}`, code: "PIN_FAILED" },
    { status: 502 }
  );
}
