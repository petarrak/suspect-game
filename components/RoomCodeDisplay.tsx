"use client";

import { useState } from "react";

export default function RoomCodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — silently ignore, code is visible on screen anyway
    }
  }

  return (
    <div className="card px-6 py-6 flex flex-col items-center gap-3">
      <span className="text-xs uppercase tracking-widest text-white/40">
        Room Code
      </span>
      <span className="text-5xl font-bold tracking-[0.2em] text-white">
        {code}
      </span>
      <button onClick={handleCopy} className="btn-secondary mt-2 w-auto px-6 py-2 text-sm">
        {copied ? "Copied!" : "Copy Code"}
      </button>
    </div>
  );
}
