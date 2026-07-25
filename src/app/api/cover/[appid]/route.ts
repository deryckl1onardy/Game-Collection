import { NextResponse } from "next/server";

/**
 * Serves Steam cover art from our own origin.
 *
 * WebGL refuses to upload a texture it isn't permitted to read, so the case
 * cannot use a cross-origin Steam CDN URL directly (gotcha 2 in
 * PROJECT_BRIEF.md). Proxying makes the bytes same-origin.
 *
 * This is the live-fetch stand-in. The real pipeline downloads each cover once
 * into blob storage (ADR-0004) rather than proxying on every request.
 */

const CDN = "https://cdn.cloudflare.steamstatic.com/steam/apps";

/** Portrait first — it is already box-cover proportioned. Then fall back. */
function candidates(appid: string) {
  return [
    `${CDN}/${appid}/library_600x900_2x.jpg`,
    `${CDN}/${appid}/library_600x900.jpg`,
    `${CDN}/${appid}/header.jpg`,
  ];
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ appid: string }> },
) {
  const { appid } = await params;

  if (!/^\d+$/.test(appid)) {
    return NextResponse.json({ error: "bad appid" }, { status: 400 });
  }

  for (const url of candidates(appid)) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok || !res.body) continue;

    return new NextResponse(res.body, {
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
        // Steam art effectively never changes; cache hard.
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  }

  // No art for this app — the caller falls back to generated cover art.
  return NextResponse.json({ error: "no cover" }, { status: 404 });
}
