"use client";
import { useRef, useState, useEffect } from "react";

const MATERIALS = [
  { id: 0, label: "PET Plastic", reward: 20 },
  { id: 1, label: "HDPE Plastic", reward: 20 },
  { id: 2, label: "Aluminum", reward: 50 },
  { id: 3, label: "Glass", reward: 30 },
  { id: 4, label: "E-Waste", reward: 100 },
  { id: 5, label: "Organic", reward: 10 },
];

// Mock classifier — replace with TensorFlow.js MobileNet in production
function mockClassify(): { label: string; confidence: number; id: number } {
  const idx = Math.floor(Math.random() * MATERIALS.length);
  const conf = 88 + Math.floor(Math.random() * 10); // 88-98
  return { label: MATERIALS[idx].label, confidence: conf, id: idx };
}

export default function Scanner({ onSuccess }: { onSuccess: (tx: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamOn, setStreamOn] = useState(false);
  const [result, setResult] = useState<{ label: string; confidence: number; id: number } | null>(null);
  const [cid, setCid] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function startCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) { videoRef.current.srcObject = s; setStreamOn(true); }
    } catch (e) { console.error(e); alert("Camera failed, use file upload fallback"); }
  }

  function stopCamera() {
    const s = videoRef.current?.srcObject as MediaStream | null;
    s?.getTracks().forEach(t => t.stop());
    setStreamOn(false);
  }

  function handleScan() {
    const r = mockClassify();
    setResult(r);
    // mock IPFS + hash
    const mockCid = "Qm" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    const mockHash = "0x" + Array.from({length:64},()=>Math.floor(Math.random()*16).toString(16)).join("");
    setCid(mockCid);
    setHash(mockHash);
  }

  async function handleSubmit() {
    if (!result || !cid || !hash) return;
    setSubmitting(true);
    // Mock on-chain tx — replace with wagmi writeContract in production:
    // await writeContract({ address: CONTRACT, abi: ReClaimABI, functionName: "submitProof", args: [result.id, result.confidence, cid, hash] })
    setTimeout(() => {
      const fakeTx = "0x" + Array.from({length:64},()=>Math.floor(Math.random()*16).toString(16)).join("");
      onSuccess(fakeTx);
      setSubmitting(false);
      alert(`Minted! Receipt NFT + ${MATERIALS[result.id].reward} $RECLAIM\nCID: ${cid}\nHash: ${hash.slice(0,18)}...`);
    }, 1200);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) handleScan();
  }

  useEffect(()=>()=>stopCamera(),[]);

  return (
    <div>
      <div className="aspect-[4/3] bg-black rounded-xl overflow-hidden relative flex items-center justify-center">
        {streamOn ? <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" /> : <p className="text-zinc-500 text-sm">Camera off</p>}
        {result && <span className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">{result.label} {result.confidence}%</span>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {!streamOn ? <button onClick={startCamera} className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium">Start camera</button> : <button onClick={stopCamera} className="bg-zinc-700 px-4 py-2 rounded-full text-sm">Stop</button>}
        <button onClick={handleScan} className="bg-reclaim-500 text-white px-4 py-2 rounded-full text-sm font-medium">Scan trash</button>
        <label className="bg-zinc-800 px-4 py-2 rounded-full text-sm cursor-pointer">Upload<input type="file" accept="image/*" className="hidden" onChange={handleFile} /></label>
      </div>

      {result && cid && (
        <div className="mt-4 bg-zinc-800 rounded-xl p-3 text-xs space-y-1">
          <p><span className="text-zinc-400">Material:</span> {result.label} (ID {result.id})</p>
          <p><span className="text-zinc-400">Confidence:</span> {result.confidence}% {result.confidence < 85 && <span className="text-red-400">— below threshold, retake</span>}</p>
          <p><span className="text-zinc-400">IPFS CID:</span> {cid}</p>
          <p><span className="text-zinc-400">Image hash:</span> {hash?.slice(0,22)}...</p>
          <p><span className="text-zinc-400">Reward:</span> {MATERIALS[result.id].reward} $RECLAIM</p>
          <button disabled={submitting || result.confidence < 85} onClick={handleSubmit} className="mt-2 w-full bg-reclaim-500 disabled:bg-zinc-700 text-white py-2 rounded-full font-medium">
            {submitting ? "Submitting on-chain..." : "Submit proof → Mint"}
          </button>
          <p className="text-[10px] text-zinc-500 pt-1">Demo uses mock IPFS + mock tx. Wire to contracts via wagmi for testnet.</p>
        </div>
      )}
    </div>
  );
}
