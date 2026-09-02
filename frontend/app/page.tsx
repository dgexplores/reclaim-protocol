"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { useAccount, useConnect, useDisconnect, useWriteContract, usePublicClient, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { MATERIALS, loadModel, classify, type Material } from "@/lib/classify";
import { captureFrame, fileToImage, hashImage, pinToIPFS } from "@/lib/proof";
import { RECLAIM_ABI, CONTRACT_ADDRESS } from "@/lib/contract";

type Result = Material & { confidence: number; rawClass: string };

const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://ipfs.io/ipfs/";

// Presentation only. The material list itself lives with the classifier.
const TINT: Record<number, string> = {
  0: "bg-[#F3F3F0] border-[#E5E2DA] text-inkMuted",
  1: "bg-[#F3F3F0] border-[#E5E2DA] text-inkMuted",
  2: "bg-[#FFF2F2] border-[#FFD6D6] text-[#8A1F1F]",
  3: "bg-[#EAF6F4] border-[#C7E8E1] text-[#0E5A4F]",
  4: "bg-[#FFF8E6] border-[#FFE9A8] text-[#7A5B00]",
  5: "bg-[#F0F7E6] border-[#D7EAC2] text-[#3D5A18]",
};

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamOn, setStreamOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [cid, setCid] = useState<string | null>(null);
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [tx, setTx] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [successDrawn, setSuccessDrawn] = useState(false);
  const [now, setNow] = useState<Date | null>(null); // null on the server, so SSR and client agree

  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  useEffect(() => setNow(new Date()), []);

  // Warm the classifier up front so the first scan is not the slow one.
  useEffect(() => {
    let alive = true;
    loadModel()
      .then(() => alive && setModelReady(true))
      .catch(() => alive && setErr("Could not load the on-device classifier. Check your connection and reload."));
    return () => { alive = false; };
  }, []);

  async function startCamera() {
    setErr(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
        setStreamOn(true);
      }
    } catch {
      setErr("Camera blocked. Use Upload instead. Live camera needs HTTPS and permission.");
    }
  }
  const stopCamera = useCallback(() => {
    const s = videoRef.current?.srcObject as MediaStream | null;
    s?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreamOn(false);
  }, []);
  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" && !scanning && streamOn) {
        e.preventDefault();
        triggerScan();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scanning, streamOn]);

  useEffect(() => {
    if (result) {
      setIsSwapping(true);
      const t = setTimeout(() => setIsSwapping(false), 280);
      return () => clearTimeout(t);
    }
  }, [result?.label]);

  useEffect(() => {
    if (err) {
      setIsShaking(true);
      const t = setTimeout(() => setIsShaking(false), 520);
      return () => clearTimeout(t);
    }
  }, [err]);

  useEffect(() => {
    if (tx) {
      setSuccessDrawn(false);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setSuccessDrawn(true)));
      return () => cancelAnimationFrame(id);
    } else setSuccessDrawn(false);
  }, [tx]);

  // Real on-chain receipts. Empty until the contract is deployed and used.
  const [proofs, setProofs] = useState<Array<{ tokenId: bigint; material: number; imageHash: string; auditFlagged: boolean; txHash: string }>>([]);
  useEffect(() => {
    if (!CONTRACT_ADDRESS || !publicClient) return;
    let alive = true;
    // Base Sepolia caps eth_getLogs at a 10,000 block range, which is only about
    // 5.5 hours. Walk a few windows back so receipts minted yesterday still show.
    const WINDOW = 9_000n;
    const WINDOWS = 5n;
    const proofEvent = RECLAIM_ABI.find((x) => x.type === "event" && x.name === "ProofSubmitted") as any;
    publicClient
      .getBlockNumber()
      .then(async (head) => {
        const floor = head > WINDOW * WINDOWS ? head - WINDOW * WINDOWS : 0n;
        const ranges = [];
        for (let to = head; to > floor; to -= WINDOW) {
          const from = to - WINDOW + 1n > floor ? to - WINDOW + 1n : floor;
          ranges.push({ from, to });
        }
        const batches = await Promise.all(
          ranges.map((r) =>
            publicClient
              .getLogs({ address: CONTRACT_ADDRESS, event: proofEvent, fromBlock: r.from, toBlock: r.to })
              .catch(() => [])
          )
        );
        return batches.flat();
      })
      .then((logs) => {
        if (!alive) return;
        setProofs(
          logs.slice(-12).reverse().map((l: any) => ({
            tokenId: l.args.tokenId as bigint,
            material: Number(l.args.material),
            imageHash: l.args.imageHash as string,
            auditFlagged: Boolean(l.args.auditFlagged),
            txHash: l.transactionHash as string,
          }))
        );
      })
      .catch((e) => console.warn("Could not load on-chain receipts:", e));
    return () => { alive = false; };
  }, [publicClient, tx]);

  const totalRewards = proofs.reduce((n, p) => n + (MATERIALS[p.material]?.reward ?? 0), 0);
  const flaggedCount = proofs.filter((p) => p.auditFlagged).length;

  function reset() {
    setResult(null); setCid(null); setHash(null); setTx(null); setErr(null); setStatus(null);
  }

  /**
   * The real pipeline: frame -> on-device MobileNet -> keccak256 of the exact
   * bytes -> IPFS pin. Nothing is fabricated; a failure at any step stops here.
   */
  async function runProof(source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement, blob: Blob) {
    setStatus("Classifying on device…");
    const c = await classify(source);
    if (!c.ok) { setErr(c.reason); return; }

    setResult({ ...c.material, confidence: c.confidence, rawClass: c.rawClass });
    setPrinting(true);
    setTimeout(() => setPrinting(false), 640);

    setStatus("Hashing proof…");
    const h = await hashImage(blob);
    setHash(h);

    // Duplicate check against chain before we spend an IPFS pin on it.
    if (CONTRACT_ADDRESS && publicClient) {
      const used = await publicClient.readContract({
        address: CONTRACT_ADDRESS, abi: RECLAIM_ABI, functionName: "usedImageHashes", args: [h],
      }).catch(() => false);
      if (used) {
        setErr("This exact image was already claimed on-chain. Duplicates are rejected by the contract.");
        return;
      }
    }

    setStatus("Pinning to IPFS…");
    try {
      setCid(await pinToIPFS(blob));
    } catch (e: any) {
      setErr(e?.message || "Could not pin the proof to IPFS.");
    }
  }

  async function triggerScan() {
    if (!videoRef.current || !streamOn) { setErr("Start the camera or upload an image first."); return; }
    if (!modelReady) { setErr("Classifier is still loading, give it a moment."); return; }
    reset(); setScanning(true);
    try {
      const { blob, canvas } = await captureFrame(videoRef.current);
      await runProof(canvas, blob);
    } catch (e: any) {
      setErr(e?.message || "Scan failed.");
    } finally {
      setScanning(false); setStatus(null);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setErr("Image too large, max 8MB."); return; }
    if (!modelReady) { setErr("Classifier is still loading, give it a moment."); return; }
    reset(); setScanning(true);
    try {
      const img = await fileToImage(file);
      await runProof(img, file);
    } catch (e: any) {
      setErr(e?.message || "Could not read that image.");
    } finally {
      setScanning(false); setStatus(null);
      e.target.value = "";
    }
  }

  /** Real Base Sepolia write. No tx hash exists unless the chain produced one. */
  async function submitProof() {
    if (!result || !cid || !hash) return;
    if (!CONTRACT_ADDRESS) { setErr("No contract address configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS after deploying."); return; }
    if (!isConnected) { setErr("Connect a wallet to mint the receipt."); return; }
    if (chainId !== baseSepolia.id) {
      try { await switchChain({ chainId: baseSepolia.id }); }
      catch { setErr("Switch your wallet to Base Sepolia to continue."); return; }
    }
    setSubmitting(true); setErr(null); setStatus("Confirm in your wallet…");
    try {
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: RECLAIM_ABI,
        functionName: "submitProof",
        args: [result.id, result.confidence, cid, hash],
      });
      setStatus("Waiting for confirmation…");
      await publicClient?.waitForTransactionReceipt({ hash: txHash });
      setTx(txHash);
      setStatus(null);
    } catch (e: any) {
      const m: string = e?.shortMessage || e?.message || "Transaction failed.";
      setErr(
        m.includes("DuplicateImage") ? "Contract rejected it: this image hash is already claimed."
        : m.includes("LowConfidence") ? "Contract rejected it: confidence is below the 85% threshold."
        : m.includes("User rejected") ? "You rejected the transaction in your wallet."
        : m
      );
      setStatus(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper paper-fiber selection:bg-caution">
      {/* Top store strip — perforated */}
      <div className="w-full border-b border-rule bg-paperDeep">
        <div className="max-w-[1160px] mx-auto px-5 md:px-6 py-[10px] flex items-center justify-between text-[11px] leading-none tracking-[0.08em] font-mono text-inkMuted uppercase">
          <span className="flex items-center gap-3"><span className="hidden sm:inline">RECLAIM PROTOCOL</span><span className="sm:hidden">RECLAIM</span><span className="h-3 w-px bg-ruleDark hidden sm:block" /><span>EST. 2026 • BASE SEPOLIA</span></span>
          <span className="flex items-center gap-3"><span className="hidden md:inline">INV · #{now?.getFullYear() ?? "––––"}·0419</span><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-verified animate-pulse" /> SYSTEM LIVE</span></span>
        </div>
        <div className="perforation opacity-60" />
      </div>

      {/* Header — minimal, store aisle */}
      <header className="max-w-[1160px] mx-auto px-5 md:px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-[9px] bg-ink text-paper grid place-items-center shadow-stamp">
            <span className="font-mono text-[11px] font-medium tracking-[0.08em]">RC</span>
          </div>
          <div className="leading-none">
            <p className="font-display font-semibold text-[15px] tracking-[-0.02em]">ReClaim</p>
            <p className="font-mono text-[11px] text-inkMuted tracking-[0.06em] uppercase">Phone-as-oracle • DePIN</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-6 font-mono text-[12px] tracking-[0.06em] uppercase text-inkMuted">
          <a href="#mechanism" className="hover:text-ink transition-colors focus-ring rounded">Mechanism</a>
          <a href="#proofs" className="hover:text-ink transition-colors focus-ring rounded">Live proofs</a>
          <a href="https://github.com/dgexplores/reclaim-protocol" target="_blank" className="inline-flex items-center gap-2 border border-rule bg-white px-3 py-1.5 rounded-full hover:border-ink transition-colors">
            <span className="h-2 w-2 rounded-full bg-ink" /> GitHub
          </a>
          {isConnected ? (
            <button onClick={() => disconnect()} className="focus-ring inline-flex items-center gap-2 rounded-full bg-ink text-paper px-3 py-1.5 hover:bg-black transition-colors" title={address}>
              <span className="h-2 w-2 rounded-full bg-verified" />
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </button>
          ) : (
            <button
              onClick={() => connectors[0] && connect({ connector: connectors[0] })}
              disabled={!connectors.length}
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-ink text-paper px-3 py-1.5 hover:bg-black transition-colors disabled:opacity-40"
            >
              {connectors.length ? "Connect wallet" : "No wallet found"}
            </button>
          )}
        </nav>
        <a href="https://github.com/dgexplores/reclaim-protocol" className="md:hidden font-mono text-[12px] border border-rule bg-white px-3 py-1.5 rounded-full">GitHub</a>
      </header>

      {/* HERO — receipt + scanner thesis */}
      <section className="max-w-[1160px] mx-auto px-5 md:px-6 pt-2 pb-8 md:pb-12">
        <div className="grid lg:grid-cols-[1.06fr_0.92fr] gap-7 lg:gap-8 items-start">
          {/* Left: headline + gun + receipt */}
          <div className="order-2 lg:order-1">
            <h1 className="font-display font-[600] tracking-[-0.035em] leading-[0.88] text-[42px] sm:text-[54px] lg:text-[64px] text-ink">
              Trash in.<br />
              <span className="relative inline-block">
                Receipt out.
                <span className="absolute -bottom-1 left-0 right-0 h-[8px] bg-caution/50 -rotate-[0.6deg]" aria-hidden />
              </span>
            </h1>
            <p className="mt-4 max-w-[52ch] text-[16px] leading-6 text-inkMuted">
              Point your phone. The scanner reads material, the printer mints the proof. <span className="text-ink font-medium">Receipt NFT + $RECLAIM</span> on Base — under ten seconds, under a cent.
            </p>

            {/* Pegboard material chips — varied sizes, not uniform cards */}
            <div className="mt-5 flex flex-wrap gap-2">
              {MATERIALS.map((m) => (
                <span key={m.sku} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-mono tracking-[0.04em] ${TINT[m.id]}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                  {m.label} <span className="opacity-60">•</span> {m.reward}
                </span>
              ))}
            </div>

            {/* Gun + receipt stack */}
            <div className="relative mt-8">
              {/* Receipt */}
              <div className="relative ml-2 md:ml-6 mr-2 md:mr-10 rounded-[16px] bg-white border border-rule shadow-receipt overflow-hidden">
                <div className="perforation absolute top-0 inset-x-0" />
                {/* receipt header */}
                <div className="px-5 md:px-7 pt-7 pb-4 flex items-start justify-between">
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-inkMuted">ReClaim • Store #0419 • Base Sepolia</p>
                    <p className="font-mono text-[11px] text-inkMuted mt-1">THERMAL RECEIPT — PROOF OF RECYCLING</p>
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="font-mono text-[11px] tracking-[0.06em]">{now?.toLocaleDateString("en-GB") ?? "––/––/––––"}</p>
                    <p className="font-mono text-[11px] text-inkMuted">#{hash ? `${hash.slice(2, 6)}-${hash.slice(6, 9)}`.toUpperCase() : "––––-–––"}</p>
                  </div>
                </div>
                <div className="h-px bg-rule mx-5 md:mx-7" />
                {/* lines */}
                <div className="px-5 md:px-7 py-4 font-mono text-[13px] leading-5">
                  <div className="flex justify-between"><span className="text-inkMuted">ITEM</span><span className="text-inkMuted">AMT</span></div>
                  <div className="mt-2 flex justify-between"><span className="text-ink">{result ? result.label : "— scan to identify —"}</span><span className="font-medium">{result ? `${result.reward} RECLAIM` : "—"}</span></div>
                  <div className="flex justify-between text-[11px] text-inkMuted"><span>SKU {result?.sku ?? "—"}  •  CONF {result ? `${result.confidence}%` : "—"}</span><span>{result ? "VERIFIED" : "PENDING"}</span></div>
                  {cid && (
                    <>
                      <div className="mt-3 space-y-1 text-[11px] leading-4">
                        <div className="flex gap-2"><span className="text-inkMuted shrink-0">CID</span><a href={`${IPFS_GATEWAY}${cid}`} target="_blank" rel="noreferrer" className="truncate text-ink underline decoration-rule underline-offset-2 hover:decoration-ink">{cid}</a></div>
                        <div className="flex gap-2"><span className="text-inkMuted shrink-0">HASH</span><span className="truncate text-ink">{hash?.slice(0, 34)}…</span></div>
                        {tx && <div className="flex gap-2"><span className="text-inkMuted shrink-0">TX</span><a href={`https://sepolia.basescan.org/tx/${tx}`} target="_blank" className="truncate underline decoration-ruleDark underline-offset-2 hover:decoration-ink">{tx.slice(0, 32)}…</a></div>}
                      </div>
                      {/* barcode */}
                      <div className="mt-4 h-[44px] w-full overflow-hidden rounded-[6px] border border-rule bg-paper flex items-center px-2">
                        <div className="flex gap-[2px] h-7 items-center w-full">
                          {Array.from({ length: 64 }).map((_, i) => (
                            <span key={i} className="flex-1 h-full bg-ink" style={{ opacity: (i * 37) % 100 < 48 ? 1 : 0.14, transform: `scaleY(${0.7 + ((i * 13) % 30) / 100})` }} />
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {!cid && <p className="mt-3 text-[11px] text-inkMuted">No image hash yet. Scanner idle — pull trigger.</p>}
                </div>
                <div className="h-px bg-rule mx-5 md:mx-7" />
                <div className="px-5 md:px-7 py-4 flex items-center justify-between">
                  <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-inkMuted">Total earned</p>
                  <p className="font-display font-semibold text-[18px]">{result ? `${result.reward}.00 RECLAIM` : "0.00 RECLAIM"}</p>
                </div>
                {result && (
                  <div className="absolute right-6 md:right-8 top-[58%] -translate-y-1/2 rotate-[-12deg] select-none pointer-events-none">
                    <div className={`rounded-full border-[2.5px] px-3 py-1.5 font-mono text-[11px] font-medium tracking-[0.12em] uppercase bg-white ${result.confidence >= 85 ? "border-verified text-verified" : "border-scanner text-scanner"} ${printing ? "animate-stamp" : ""}`}>
                      {result.confidence >= 85 ? "✓ VERIFIED" : "LOW CONFIDENCE"}
                    </div>
                    <p className="mt-1 text-center font-mono text-[8px] tracking-[0.1em] uppercase text-inkMuted">Base Sepolia • {now?.toLocaleTimeString() ?? "––:––:––"}</p>
                  </div>
                )}
                <div className="perforation rotate-180 opacity-60" />
                <div className="bg-paperDeep px-5 md:px-7 py-3 flex items-center justify-between">
                  <p className="font-mono text-[11px] text-inkMuted">Keep this receipt — it is your on-chain reputation.</p>
                  <span className="hidden sm:inline-flex h-6 w-6 rounded-full bg-ink text-paper place-items-center text-[10px] font-mono">✂</span>
                </div>
              </div>

              {/* Scanner gun — overlapping */}
              <div className="pointer-events-none absolute -right-2 md:-right-1 -top-6 md:-top-8 select-none hidden sm:block" aria-hidden>
                <div className="relative w-[260px] md:w-[300px] h-[180px] md:h-[200px]">
                  {/* gun body shadow */}
                  <div className="absolute inset-0 bg-ink/10 blur-[18px] rounded-full translate-y-6" />
                  {/* gun svg */}
                  <svg viewBox="0 0 300 200" className="relative w-full h-full drop-shadow-[0_12px_20px_rgba(15,15,14,0.18)]">
                    <path d="M38 44 H 132 L 150 74 H 188 L 200 88 H 240 L 252 100 L 240 112 H 200 L 188 126 H 150 L 132 156 H 92 L 78 126 H 62 L 38 100 Z" fill="#E8E8E6" stroke="#0F0F0E" strokeWidth="2.2" />
                    <path d="M44 68 H 118 L 130 86 H 182" stroke="#0F0F0E" strokeWidth="1.8" strokeLinecap="round" />
                    <rect x="94" y="104" width="36" height="34" rx="4" fill="#0F0F0E" />
                    <rect x="98" y="108" width="28" height="14" rx="2" fill="#FF3B30" />
                    <text x="112" y="118" textAnchor="middle" fontFamily="Geist Mono" fontSize="6" fill="white" fontWeight="700">SCAN</text>
                    <rect x="98" y="126" width="28" height="6" rx="1" fill="white" opacity="0.9" />
                    <circle cx="216" cy="100" r="14" fill="#0F0F0E" />
                    <circle cx="216" cy="100" r="7" fill="#FF3B30" className={scanning ? "animate-pulse" : ""} />
                    <g opacity="0.5"><line x1="48" y1="56" x2="48" y2="42" stroke="#0F0F0E" strokeWidth="1.4" /><line x1="56" y1="48" x2="70" y2="48" stroke="#0F0F0E" strokeWidth="1.4" /><line x1="42" y1="112" x2="42" y2="126" stroke="#0F0F0E" strokeWidth="1.4" /><line x1="34" y1="120" x2="42" y2="120" stroke="#0F0F0E" strokeWidth="1.4" /></g>
                    {scanning && <line x1="188" y1="88" x2="228" y2="112" stroke="#FF3B30" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.9" />}
                  </svg>
                  <div className="absolute left-6 -bottom-1 font-mono text-[9px] tracking-[0.12em] uppercase text-inkMuted">MODEL RC-S1 • PULL TRIGGER TO PRINT</div>
                </div>
              </div>
            </div>

            {/* Trust row — ink stamps */}
            <div className="mt-6 flex flex-wrap items-center gap-3 font-mono text-[11px]">
              <span className="inline-flex items-center gap-2 rounded-full border border-verified/30 bg-verifiedBg px-3 py-1.5 text-verified"><span className="h-1.5 w-1.5 rounded-full bg-verified" /> Base L2 • ~$0.01</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-rule bg-white px-3 py-1.5"><span className="h-1.5 w-1.5 rounded-full bg-ink" /> IPFS • Lighthouse</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-rule bg-white px-3 py-1.5">231k gas • audited</span>
            </div>
          </div>

          {/* Right: scanner window */}
          <div className="order-1 lg:order-2">
            <div className="rounded-[20px] border border-rule bg-white shadow-receipt overflow-hidden">
              {/* Window chrome — like scanner viewfinder */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-rule bg-paperDeep">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-scanner shadow-[0_0_0_4px_rgba(255,59,48,0.14)]" />
                  <span className="font-mono text-[11px] tracking-[0.1em] uppercase font-medium">Scanner window • Live</span>
                  <span className="hidden sm:inline font-mono text-[11px] text-inkMuted">— fill frame, avoid glare</span>
                </div>
                <span className="font-mono text-[11px] tracking-[0.06em] uppercase text-inkMuted">{streamOn ? "CAM ON" : "CAM OFF"}</span>
              </div>

              <div className="relative aspect-[4/3] bg-[#0A0A09] overflow-hidden">
                {/* Video */}
                {streamOn ? (
                  <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center p-6">
                    <div className="w-full max-w-[360px] rounded-[14px] border border-white/10 bg-white/[0.06] backdrop-blur p-4 text-center">
                      <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-white/70">Place waste on neutral surface</p>
                      <p className="mt-2 font-display text-[18px] leading-5 text-white">Center the item. We read the material, not the brand.</p>
                      <div className="mt-3 flex justify-center gap-1.5">
                        <span className="h-1 w-12 rounded-full bg-white/60" /><span className="h-1 w-6 rounded-full bg-white/30" /><span className="h-1 w-8 rounded-full bg-white/40" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Corner brackets — scanner targeting (viewfinder, not card accent) */}
                <div className="pointer-events-none absolute inset-3">
                  <span className="absolute left-0 top-0 h-5 w-5 rounded-tl-[8px] border-white/85" style={{ borderLeft: "2px solid rgba(255,255,255,0.85)", borderTop: "2px solid rgba(255,255,255,0.85)" }} />
                  <span className="absolute right-0 top-0 h-5 w-5 rounded-tr-[8px] border-white/85" style={{ borderRight: "2px solid rgba(255,255,255,0.85)", borderTop: "2px solid rgba(255,255,255,0.85)" }} />
                  <span className="absolute left-0 bottom-0 h-5 w-5 rounded-bl-[8px] border-white/85" style={{ borderLeft: "2px solid rgba(255,255,255,0.85)", borderBottom: "2px solid rgba(255,255,255,0.85)" }} />
                  <span className="absolute right-0 bottom-0 h-5 w-5 rounded-br-[8px] border-white/85" style={{ borderRight: "2px solid rgba(255,255,255,0.85)", borderBottom: "2px solid rgba(255,255,255,0.85)" }} />
                  {scanning && <span className="absolute left-3 right-3 h-[2px] bg-scanner shadow-[0_0_12px_rgba(255,59,48,0.9)] animate-scan" />}
                </div>

                {/* Confidence pill — text swap on material change */}
                {result && (
                  <div className="absolute left-3 bottom-3 right-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-medium shadow-[0_6px_16px_rgba(0,0,0,0.24)]">
                      <span className={`h-2 w-2 rounded-full ${result.confidence >= 85 ? "bg-verified" : "bg-scanner"}`} />
                      <span className={`t-textswap ${isSwapping ? "is-swapping" : ""}`}>
                        <span className="t-textswap-inner">{result.label} • {result.confidence}%</span>
                      </span>
                    </span>
                    <span className="hidden sm:inline-flex rounded-full bg-ink text-paper px-3 py-1.5 font-mono text-[11px] tracking-[0.06em] uppercase">{result.sku}</span>
                  </div>
                )}

                {/* Kraft edge hint */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-kraft via-paperDeep to-kraft opacity-60" />
              </div>

              {/* Controls — tactile, hardware */}
              <div className="p-4 bg-white">
                <div className="grid grid-cols-[1.1fr_0.9fr] gap-3">
                  {!streamOn ? (
                    <button onClick={startCamera} aria-label="Start camera" className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-ink text-paper px-5 py-[13px] text-[14px] font-medium tracking-[-0.01em] hover:bg-black transition-colors">
                      <span className="h-2 w-2 rounded-full bg-verified shadow-[0_0_0_6px_rgba(14,124,107,0.18)]" /> Start camera
                    </button>
                  ) : (
                    <button onClick={stopCamera} aria-label="Stop camera" className="focus-ring rounded-full border border-rule bg-white px-5 py-[13px] text-[14px] font-medium hover:border-ink transition-colors">Stop</button>
                  )}
                  <label className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-rule bg-paperDeep px-5 py-[13px] text-[14px] font-medium hover:border-ruleDark transition-colors cursor-pointer">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 3v10M3 8h10" stroke="#0F0F0E" strokeWidth="1.6" strokeLinecap="round" /></svg> Upload
                    <input type="file" accept="image/*" className="hidden" onChange={handleFile} aria-label="Upload image" />
                  </label>
                </div>

                <button
                  onClick={triggerScan}
                  disabled={scanning || !modelReady}
                  aria-label="Scan trash"
                  className="focus-ring mt-3 w-full inline-flex items-center justify-center gap-3 rounded-full bg-scanner text-white px-6 py-[14px] text-[15px] font-semibold tracking-[-0.01em] shadow-scanner hover:bg-scannerDark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-scanner">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 5h10M2 9h10M5 2v10M9 2v10" stroke="currentColor" strokeWidth="1.4" /></svg>
                  </span>
                  {scanning ? (status || "Reading material…") : modelReady ? "Pull trigger, scan" : "Loading classifier…"}
                  <span className="ml-auto hidden sm:inline font-mono text-[11px] tracking-[0.08em] uppercase opacity-85">SPACE</span>
                </button>

                <div className={`t-shake ${isShaking ? "is-shaking" : ""}`}>
                  {err && (
                    <p role="alert" className={`mt-3 rounded-[10px] px-3 py-2 font-mono text-[12px] leading-4 border t-shake-field ${err ? "is-error" : ""} bg-[#FFF2F2] border-[#FFD6D6] text-[#8A1F1F] t-shake-msg ${err ? "is-visible" : ""}`}>
                      {err}
                    </p>
                  )}
                </div>

                {/* Mint rail — panel reveal */}
                <div className={`t-panel ${result && cid ? "is-open" : ""}`}>
                  <div className="t-panel-inner">
                    <div className="t-panel-content">
                      {result && cid && (
                        <div className="mt-3 rounded-[14px] border border-rule bg-paper p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-inkMuted">Ready to mint</p>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium ${result.confidence >= 85 ? "bg-verifiedBg text-verified" : "bg-[#FFF2F2] text-[#8A1F1F]"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${result.confidence >= 85 ? "bg-verified" : "bg-scanner"}`} /> {result.confidence >= 85 ? "Above threshold" : "Below 85 — retake"}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[11px]">
                      <span className="rounded-[10px] border border-rule bg-white px-2.5 py-2"><span className="block text-inkMuted leading-none">MATERIAL</span><span className="block font-medium text-ink mt-1">{result.label}</span></span>
                      <span className="rounded-[10px] border border-rule bg-white px-2.5 py-2"><span className="block text-inkMuted leading-none">REWARD</span><span className="block font-medium text-ink mt-1">{result.reward} RECLAIM</span></span>
                      <span className="rounded-[10px] border border-rule bg-white px-2.5 py-2"><span className="block text-inkMuted leading-none">CID</span><a href={`${IPFS_GATEWAY}${cid}`} target="_blank" rel="noreferrer" className="block font-medium truncate text-ink mt-1 underline decoration-rule underline-offset-2 hover:decoration-ink">{cid.slice(0, 12)}…</a></span>
                    </div>
                    <button
                      onClick={submitProof}
                      disabled={!!tx || submitting || !cid || result.confidence < 85}
                      className="focus-ring mt-3 w-full rounded-full bg-ink text-paper py-3 text-[14px] font-medium hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {tx ? "✓ Minted on Base Sepolia" : submitting ? (status || "Submitting…") : !isConnected ? "Connect wallet to mint" : "Submit proof, mint receipt NFT"}
                    </button>
                    <p className="mt-2 text-center font-mono text-[10px] tracking-[0.06em] uppercase text-inkMuted">
                      MobileNet v2 on device{result?.rawClass ? ` \u00b7 saw "${result.rawClass}"` : ""} \u00b7 keccak256 of the pinned bytes
                      {CONTRACT_ADDRESS ? " \u00b7 Base Sepolia" : " \u00b7 set NEXT_PUBLIC_CONTRACT_ADDRESS to mint"}
                    </p>
                  </div>
                )}
                    </div>
                  </div>
                </div>

                {/* Success check — focal moment */}
                {tx && (
                  <div className={`mt-3 rounded-[12px] border px-3 py-2.5 flex items-center gap-3 bg-verifiedBg border-[#C7E8E1] t-success ${successDrawn ? "is-drawn" : ""}`}>
                    <span className="t-success-pop inline-flex h-7 w-7 shrink-0 place-items-center rounded-full bg-verified text-white">
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
                        <circle cx="11" cy="11" r="8.5" stroke="white" strokeWidth="1.6" className="t-success-circle" fill="none" />
                        <path d="M7 11.2L10 14L15.2 8.2" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="t-success-check" fill="none" />
                      </svg>
                    </span>
                    <p className="font-mono text-[12px] text-verified font-medium flex-1">Minted — open on BaseScan</p>
                    <a href={`https://sepolia.basescan.org/tx/${tx}`} target="_blank" rel="noreferrer" className="font-mono text-[12px] underline underline-offset-2 text-verified hover:text-ink">View tx ↗</a>
                  </div>
                )}
              </div>
            </div>
            <p className="mt-3 text-center font-mono text-[11px] tracking-[0.04em] text-inkMuted">No image leaves your device before the hash. Privacy kept, proof kept.</p>
          </div>
        </div>
      </section>

      {/* Mechanism — brick-instruction exploded steps */}
      <section id="mechanism" className="max-w-[1160px] mx-auto px-5 md:px-6">
        <div className="rounded-[18px] border border-rule bg-white overflow-hidden">
          <div className="grid md:grid-cols-[0.9fr_1.1fr] gap-0">
            <div className="p-6 md:p-8">
              <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-inkMuted">How it works — 3 steps, no app install</p>
              <h2 className="mt-2 font-display text-[28px] md:text-[32px] leading-[0.95] tracking-[-0.02em]">Built like instructions,<br />not a dashboard.</h2>
              <p className="mt-3 text-[14px] leading-5 text-inkMuted max-w-[40ch]">Each step adds one part on the stud grid. No jargon. Follow the arrows.</p>
              <div className="mt-6 space-y-4">
                {[
                  { n: "01", t: "Place & Scan", d: "Frame fills the waste. On-device model reads material, confidence appears.", c: "bg-scanner text-white" },
                  { n: "02", t: "Hash & Pin", d: "Image + time + GPS → keccak256, CID pinned to IPFS. Hash checked on-chain for dupes.", c: "bg-ink text-paper" },
                  { n: "03", t: "Mint & Earn", d: "submitProof(m, conf, CID, hash) mints Receipt NFT + $RECLAIM. 10% hit auditor lottery.", c: "bg-verified text-white" },
                ].map((s) => (
                  <div key={s.n} className="flex gap-4">
                    <span className={`shrink-0 h-9 w-9 rounded-full grid place-items-center font-mono text-[12px] font-medium ${s.c}`}>{s.n}</span>
                    <div>
                      <p className="font-medium tracking-[-0.01em]">{s.t}</p>
                      <p className="text-[13px] leading-5 text-inkMuted">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Exploded diagram — stud grid */}
            <div className="relative bg-paperDeep border-t md:border-t-0 md:border-l border-rule p-6 md:p-8 overflow-hidden">
              <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(#0F0F0E 1.2px, transparent 1.2px)", backgroundSize: "16px 16px" }} aria-hidden />
              <div className="relative grid grid-cols-3 gap-3 md:gap-4">
                {[
                  { k: "SCAN", v: "94%", m: "Aluminum • 15g", f: "border-scanner" },
                  { k: "HASH", v: "0x9F…6E0", m: "keccak256", f: "border-ink" },
                  { k: "RECEIPT", v: "#0419", m: "ERC-721", f: "border-verified" },
                ].map((b) => (
                  <div key={b.k} className={`rounded-[14px] bg-white border-2 ${b.f} p-4 shadow-stamp`}>
                    <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-inkMuted">{b.k}</p>
                    <p className="mt-1 font-display font-semibold text-[18px] tracking-[-0.02em]">{b.v}</p>
                    <p className="font-mono text-[11px] text-inkMuted">{b.m}</p>
                  </div>
                ))}
              </div>
              <div className="relative mt-4 flex items-center justify-center gap-2 font-mono text-[11px] text-inkMuted">
                <span className="h-px w-12 bg-ink/20" /> <span className="rounded-full border border-rule bg-white px-2 py-1">230,681 gas • ~$0.01</span> <span className="h-px w-12 bg-ink/20" />
              </div>
              {/* Arrow diagram */}
              <svg viewBox="0 0 320 48" className="relative mt-4 w-full h-12" aria-hidden>
                <path d="M 24 24 H 96" stroke="#0F0F0E" strokeWidth="1.4" strokeDasharray="6 6" />
                <polygon points="96,20 96,28 106,24" fill="#0F0F0E" />
                <path d="M 124 24 H 196" stroke="#0F0F0E" strokeWidth="1.4" strokeDasharray="6 6" />
                <polygon points="196,20 196,28 206,24" fill="#0F0F0E" />
                <path d="M 224 24 H 296" stroke="#0F0F0E" strokeWidth="1.4" />
                <polygon points="296,20 296,28 306,24" fill="#FF3B30" />
              </svg>
              <p className="relative text-center font-mono text-[11px] tracking-[0.06em] uppercase text-inkMuted">Stud grid locks every part. Wordless arrows teach assembly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live proofs — barcode lattice */}
      <section id="proofs" className="max-w-[1160px] mx-auto px-5 md:px-6 mt-8">
        <div className="rounded-[18px] border border-ink bg-ink text-paper overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 md:px-6 py-4 border-b border-white/10">
            <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-white/70">Live lattice • ProofSubmitted events on Base Sepolia</p>
            <span className="inline-flex items-center gap-2 rounded-full bg-white text-ink px-3 py-1.5 font-mono text-[11px] font-medium"><span className="h-1.5 w-1.5 rounded-full bg-verified animate-pulse" /> {proofs.length} receipt{proofs.length === 1 ? "" : "s"}</span>
          </div>
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-0">
            <div className="p-5 md:p-6">
              <div className="h-[120px] rounded-[12px] bg-white/[0.06] border border-white/10 p-3 overflow-hidden">
                <div className="flex gap-[3px] h-full items-stretch">
                  {Array.from({ length: 72 }).map((_, i) => (
                    <span key={i} className="flex-1 bg-white" style={{ opacity: (i * 53) % 100 < 46 ? 0.92 : 0.14, transform: `scaleY(${0.55 + ((i * 17) % 45) / 100})` }} />
                  ))}
                </div>
                <div className="mt-2 flex justify-between font-mono text-[10px] tracking-[0.08em] uppercase text-white/55">
                  <span>BARCODE COLUMNS • 72 LANES</span><span>SINE TRACE • FROZEN FRAME</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 font-mono text-[11px]">
                <span className="rounded-[12px] bg-white text-ink px-3 py-3"><span className="block text-inkMuted text-[10px] tracking-[0.08em] uppercase">Receipts minted</span><span className="block font-display text-[18px] font-semibold tracking-[-0.02em] mt-1">{proofs.length}</span></span>
                <span className="rounded-[12px] bg-white text-ink px-3 py-3"><span className="block text-inkMuted text-[10px] tracking-[0.08em] uppercase">Audit flagged</span><span className="block font-display text-[18px] font-semibold tracking-[-0.02em] mt-1">{flaggedCount}</span></span>
                <span className="rounded-[12px] bg-scanner text-white px-3 py-3"><span className="block text-white/80 text-[10px] tracking-[0.08em] uppercase">Rewards paid</span><span className="block font-display text-[18px] font-semibold tracking-[-0.02em] mt-1">{totalRewards.toLocaleString()}</span></span>
              </div>
            </div>
            <div className="border-t lg:border-t-0 lg:border-l border-white/10 p-5 md:p-6">
              <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-white/70">Recent receipts</p>
              <div className="mt-3 space-y-2">
                {proofs.length === 0 ? (
                  <p className="rounded-[12px] border border-dashed border-white/20 px-3 py-4 font-mono text-[11px] leading-4 text-white/55">
                    {CONTRACT_ADDRESS
                      ? "No receipts minted yet. Scan something to be the first."
                      : "Not connected to a deployment. Set NEXT_PUBLIC_CONTRACT_ADDRESS to stream live receipts."}
                  </p>
                ) : proofs.map((r) => (
                  <a
                    key={r.txHash + String(r.tokenId)}
                    href={`https://sepolia.basescan.org/tx/${r.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-[12px] border border-white/10 bg-white/[0.06] px-3 py-2.5 font-mono text-[12px] hover:border-white/30 transition-colors"
                  >
                    <span className="text-white font-medium">
                      #{String(r.tokenId).padStart(4, "0")} • {MATERIALS[r.material]?.label}
                      {r.auditFlagged && <span className="ml-2 rounded-full bg-caution/90 text-ink px-1.5 py-0.5 text-[10px]">AUDIT</span>}
                    </span>
                    <span className="text-white/70">
                      {r.imageHash.slice(0, 6)}…{r.imageHash.slice(-3)} • <span className="text-white">{MATERIALS[r.material]?.reward} RECLAIM</span>
                    </span>
                  </a>
                ))}
              </div>
              <a href="https://sepolia.basescan.org" target="_blank" className="mt-4 inline-flex items-center gap-2 font-mono text-[12px] text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">View on BaseScan ↗</a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer — store coupon */}
      <footer className="max-w-[1160px] mx-auto px-5 md:px-6 mt-8 mb-10">
        <div className="rounded-[18px] border border-rule bg-white overflow-hidden">
          <div className="perforation" />
          <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-6 p-6 md:p-8 items-center">
            <div>
              <p className="font-display text-[22px] leading-6 tracking-[-0.02em]">Your receipt is your reputation.</p>
              <p className="mt-2 max-w-[48ch] text-[13px] leading-5 text-inkMuted">Receipt NFTs stack into a verifiable green score — for campuses, brands, and future airdrops. No spam: duplicate hashes revert, low confidence retake, auditors stake and get slashed.</p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <a href="https://github.com/dgexplores/reclaim-protocol" className="focus-ring inline-flex items-center justify-center rounded-full bg-ink text-paper px-6 py-3 text-[14px] font-medium hover:bg-black transition-colors">Open GitHub</a>
              <a href="#mechanism" className="focus-ring inline-flex items-center justify-center rounded-full border border-rule bg-white px-6 py-3 text-[14px] font-medium hover:border-ink transition-colors">Read docs</a>
            </div>
          </div>
          <div className="bg-paperDeep border-t border-rule px-6 py-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] tracking-[0.06em] uppercase text-inkMuted">
            <span>© 2026 ReClaim Protocol • MIT • Base Sepolia</span>
            <span>Built for Web3 Unsolved Challenges • Phone becomes oracle</span>
          </div>
        </div>
        <p className="mt-3 text-center font-mono text-[11px] text-inkMuted">Demo uses synthetic data labeled as such. Replace QR/boros with real captures for submission video.</p>
      </footer>
    </main>
  );
}
