"use client";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-paper text-ink">
      <div className="text-center px-5">
        <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-inkMuted mb-2">404 * RECEIPT NOT FOUND</p>
        <h1 className="font-display font-semibold text-[48px] sm:text-[64px] leading-[0.9] tracking-[-0.03em] mb-4">
          That receipt<br />never printed.
        </h1>
        <p className="max-w-[40ch] mx-auto text-[16px] leading-6 text-inkMuted mb-8">
          The scanner found no match. Check the CID, or start a fresh scan.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-ink text-paper px-6 py-3 text-[14px] font-medium hover:bg-black transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 8H6M6 8l4-4M6 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            Back to scanner
          </Link>
          <a href="https://github.com/dgexplores/reclaim-protocol" target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-rule bg-white px-6 py-3 text-[14px] font-medium hover:border-ink transition-colors">
            View on GitHub
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M7 0C3.14 0 0 3.14 0 7c0 3.07 1.98 5.66 4.72 6.59.34.06.47-.15.47-.33 0-.16-.01-.63-.01-1.24-1.92.41-2.32-.94-2.32-.94-.31-.79-.76-.99-.76-.99-.62-.42.05-.41.05-.41.69.05 1.05.7 1.05.7.61 1.04 1.6.74 2 .57.06-.44.24-.74.43-.91-1.51-.3-3.1-.75-3.1-3.35 0-.74.26-1.34.7-1.81-.07-.17-.3-.85.07-1.78 0 0 .57-.18 1.87.7.54-.15 1.12-.23 1.7-.23.58 0 1.16.08 1.7.23 1.3-.88 1.87-.7 1.87-.7.37.93.14 1.61.07 1.78.43.47.7 1.07.7 1.81 0 2.6-1.59 3.05-3.24 3.35.25.21.48.62.48 1.25 0 .91-.01 1.65-.01 1.87 0 .18.13.4.48.33A7.97 7.97 0 0014 7c0-3.86-3.14-7-7-7z"/></svg>
          </a>
        </div>
        <p className="mt-8 font-mono text-[11px] tracking-[0.06em] uppercase text-inkMuted">
          ReClaim Protocol * Base Sepolia * MIT
        </p>
      </div>
    </main>
  );
}