"use client";
import { keccak256 } from "viem";

/** Grabs the current video frame as a JPEG blob, capped at 1024px on the long edge. */
export async function captureFrame(video: HTMLVideoElement): Promise<{ blob: Blob; canvas: HTMLCanvasElement }> {
  const max = 1024;
  const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.85));
  return { blob, canvas };
}

/** Loads a user-selected file into an <img> we can both classify and hash. */
export function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * The on-chain imageHash. keccak256 over the exact bytes that get pinned to
 * IPFS, so anyone can fetch the CID and recompute this to verify the receipt.
 */
export async function hashImage(blob: Blob): Promise<`0x${string}`> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return keccak256(bytes);
}

/** Pins via our own route so the Lighthouse key never reaches the browser. */
export async function pinToIPFS(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("file", blob, "proof.jpg");
  const res = await fetch("/api/ipfs", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "IPFS pin failed");
  return data.cid as string;
}
