// Lighthouse IPFS helper — replace mock in Scanner.tsx with this for prod
export async function uploadToIPFS(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("https://node.lighthouse.storage/api/v0/add", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_LIGHTHOUSE_KEY}` },
    body: form
  });
  const data = await res.json();
  return data.Hash as string; // CID
}
export function gatewayUrl(cid: string) {
  return `${process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.lighthouse.storage/ipfs/"}${cid}`;
}
