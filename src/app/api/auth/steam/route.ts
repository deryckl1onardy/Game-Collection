import { NextResponse } from "next/server";

import { buildSteamLoginUrl } from "@/lib/steam-openid";

export const dynamic = "force-dynamic";

/** Kicks off "sign in through Steam" (ADR-0012) — redirects to Steam's own login page. */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const returnTo = `${origin}/api/auth/steam/callback`;
  return NextResponse.redirect(buildSteamLoginUrl(returnTo));
}
