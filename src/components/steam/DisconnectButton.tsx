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
    <button onClick={disconnect} disabled={busy} className="btn">
      {busy ? "disconnecting…" : "disconnect"}
    </button>
  );
}
