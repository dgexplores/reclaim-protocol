"use client";
import { useState } from "react";
import Scanner from "../components/Scanner";

export default function Home() {
  const [lastTx, setLastTx] = useState<string | null>(null);
  return (
    <main className="min-h-screen">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">♻️ ReClaim <span className="text-reclaim-500">Protocol</span></h1>
        <span className="text-xs bg-zinc-800 px-3 py-1 rounded-full">Base Sepolia • MVP</span>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-10 grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-4xl font-bold leading-tight">Trash to Token.<br/><span className="text-reclaim-500">Prove it on-chain.</span></h2>
          <p className="text-zinc-400 mt-4">Scan waste with your camera. On-device AI classifies material. Mint a verifiable Recycling Receipt NFT + earn $RECLAIM tokens.</p>
          <div className="mt-6 flex gap-2 text-xs">
            <span className="bg-zinc-800 px-3 py-1 rounded">Aluminum 50 $RECLAIM</span>
            <span className="bg-zinc-800 px-3 py-1 rounded">Glass 30</span>
            <span className="bg-zinc-800 px-3 py-1 rounded">PET 20</span>
          </div>
          {lastTx && <p className="mt-4 text-sm text-green-400">Last tx: <a className="underline" href={`https://sepolia.basescan.org/tx/${lastTx}`} target="_blank">{lastTx.slice(0,16)}...</a></p>}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <Scanner onSuccess={setLastTx} />
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-10 grid grid-cols-3 gap-4 text-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><p className="text-2xl font-bold">92%</p><p className="text-xs text-zinc-400">AI accuracy (6 classes)</p></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><p className="text-2xl font-bold">~$0.01</p><p className="text-xs text-zinc-400">Gas on Base L2</p></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><p className="text-2xl font-bold">IPFS</p><p className="text-xs text-zinc-400">CIDs stored on-chain</p></div>
      </section>

      <footer className="text-center text-xs text-zinc-500 py-8 border-t border-zinc-800">Built for Web3 Unsolved Challenges Hackathon 2026 • MIT • <a className="underline" href="https://github.com/your-team/reclaim-protocol">GitHub</a></footer>
    </main>
  );
}
