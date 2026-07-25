import { NextResponse } from "next/server";

import { verifySteamCallback } from "@/lib/steam-openid";

export const dynamic = "force-dynamic";

/**
 * Steam redirects here after sign-in. Only identity comes out of this —
 * the API key still has to be pasted in by hand on the next step
 * (ADR-0012) — so this just verifies and hands the SteamID64 to the
 * connect-steam page via query param rather than saving anything yet.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const steamId = await verifySteamCallback(url.searchParams);

  const dest = new URL("/connect-steam", url.origin);
  if (steamId) {
    dest.searchParams.set("steamid", steamId);
  } else {
    dest.searchParams.set("error", "verification_failed");
  }

  return NextResponse.redirect(dest);
}
