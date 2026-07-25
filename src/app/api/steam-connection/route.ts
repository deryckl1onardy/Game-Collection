import { NextResponse } from "next/server";

import {
  clearSteamConnection,
  saveApiKeyConnection,
  savePublicProfileConnection,
} from "@/lib/steam-connection";
import { probePublicProfile, validateSteamCredentials } from "@/lib/steam";

export const dynamic = "force-dynamic";

const STEAMID_RE = /^\d{17}$/;

/**
 * Saves a Steam connection (ADR-0012, ADR-0013) — the SteamID64 came from
 * the OpenID sign-in step. `mode: "public-profile"` needs nothing else, but
 * is re-probed here rather than trusted from the client, since the client's
 * earlier probe (shown on the connect-steam page) could be stale by the
 * time this request lands. `mode: "api-key"` needs the pasted key,
 * validated against a real Steam endpoint so a typo surfaces immediately
 * instead of failing silently on the next sync.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { steamId, mode, apiKey } = body as Record<string, unknown>;
  if (typeof steamId !== "string" || !STEAMID_RE.test(steamId)) {
    return NextResponse.json(
      { error: "steamId must be a 17-digit SteamID64" },
      { status: 400 },
    );
  }

  if (mode === "public-profile") {
    const result = await probePublicProfile(steamId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    await savePublicProfileConnection(steamId);
    return NextResponse.json({ ok: true });
  }

  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
  }

  const trimmedKey = apiKey.trim();
  const result = await validateSteamCredentials(trimmedKey, steamId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await saveApiKeyConnection(steamId, trimmedKey);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearSteamConnection();
  return NextResponse.json({ ok: true });
}
