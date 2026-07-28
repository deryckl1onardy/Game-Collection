import { NextResponse } from "next/server";

/**
 * Serves a game's logo — the transparent wordmark — from our own origin.
 *
 * The spine shelf prints this along the spine the way a real case does, so
 * what is needed is the mark on transparency, not the cover art: the cover is
 * already the front face, and a cropped strip of it reads as a mistake rather
 * than as a spine.
 *
 * Same proxy reasoning as `/api/cover` — the bytes have to be same-origin —
 * and the same live-fetch stand-in status: the real pipeline downloads these
 * once into blob storage (ADR-0004).
 */

const CDN = "https://cdn.cloudflare.steamstatic.com/steam/apps";

/**
 * Newest asset first. `library_logo` is the mark Steam draws over the library
 * hero and is the best-cut of the three; `logo` is the older small mark, kept
 * because plenty of back-catalogue apps never got the library set.
 */
function candidates(appid: string) {
  return [
    `${CDN}/${appid}/library_logo_2x.png`,
    `${CDN}/${appid}/library_logo.png`,
    `${CDN}/${appid}/logo.png`,
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
        "Content-Type": res.headers.get("content-type") ?? "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  }

  // Plenty of apps have no logo at all — the spine sets the title as type
  // instead, which is why this is a plain 404 and not an error worth logging.
  return NextResponse.json({ error: "no logo" }, { status: 404 });
}
