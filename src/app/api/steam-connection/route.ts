import { NextResponse } from "next/server";

import { clearSteamConnection, saveSteamConnection } from "@/lib/steam-connection";
import { validateSteamCredentials } from "@/lib/steam";

export const dynamic = "force-dynamic";

const STEAMID_RE = /^\d{17}$/;

/**
 * Saves a Steam connection (ADR-0012) — the SteamID64 came from the OpenID
 * sign-in step, the API key was pasted by hand. Validated against a real
 * Steam endpoint before saving so a typo surfaces immediately with a clear
 * message rather than silently failing on the next sync.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { steamId, apiKey } = body as Record<string, unknown>;
  if (typeof steamId !== "string" || !STEAMID_RE.test(steamId)) {
    return NextResponse.json(
      { error: "steamId must be a 17-digit SteamID64" },
      { status: 400 },
    );
  }
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
  }

  const trimmedKey = apiKey.trim();
  const result = await validateSteamCredentials(trimmedKey, steamId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await saveSteamConnection(steamId, trimmedKey);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearSteamConnection();
  return NextResponse.json({ ok: true });
}
