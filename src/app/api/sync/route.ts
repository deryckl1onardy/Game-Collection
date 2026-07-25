import { NextResponse } from "next/server";

import { runSync } from "@/lib/sync";
import { steamIsConfigured } from "@/lib/steam";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The sync job. Runs nightly via Vercel Cron, and on demand from the "sync
 * now" button (ADR-0005).
 *
 * Deliberately not called on page load: sync-on-visit would fragment the
 * playtime deltas the library card is built from, and burn Steam API calls on
 * every request.
 */
async function handle() {
  if (!steamIsConfigured()) {
    return NextResponse.json(
      { error: "STEAM_API_KEY and STEAM_ID must be set in .env.local" },
      { status: 400 },
    );
  }

  try {
    const report = await runSync();
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  // Vercel Cron sends this header; in production, reject anything else so the
  // endpoint is not a public way to hammer Steam.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  return handle();
}

export async function POST() {
  return handle();
}
