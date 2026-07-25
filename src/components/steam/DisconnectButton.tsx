"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DisconnectButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    setBusy(true);
    try {
      await fetch("/api/steam-connection", { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={disconnect}
      disabled={busy}
      className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-[#c9c7c0] transition hover:border-white/40 hover:bg-white/5 disabled:opacity-40"
    >
      {busy ? "disconnecting…" : "disconnect"}
    </button>
  );
}
