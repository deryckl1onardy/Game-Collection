import { NextResponse } from "next/server";

import { createManualGame } from "@/lib/library";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // enrichment runs inline (ADR-0010), a few external calls

const MANUAL_PLATFORMS = ["Epic", "GOG", "PSN", "Xbox", "Switch", "Physical"] as const;
type ManualPlatform = (typeof MANUAL_PLATFORMS)[number];

function isManualPlatform(v: unknown): v is ManualPlatform {
  return typeof v === "string" && (MANUAL_PLATFORMS as readonly string[]).includes(v);
}

/**
 * Adds a hand-entered game — Steam is the only platform sync can see
 * (ADR-0006), so this is the only way a Switch/GOG/PSN/Xbox/physical copy
 * enters the library.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { title, platform, playtime, finished, note, tags } = body as Record<
    string,
    unknown
  >;

  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!isManualPlatform(platform)) {
    return NextResponse.json(
      { error: `platform must be one of ${MANUAL_PLATFORMS.join(", ")}` },
      { status: 400 },
    );
  }
  if (playtime !== undefined && typeof playtime !== "number") {
    return NextResponse.json({ error: "playtime must be a number" }, { status: 400 });
  }
  if (finished !== undefined && typeof finished !== "boolean") {
    return NextResponse.json({ error: "finished must be a boolean" }, { status: 400 });
  }
  if (note !== undefined && typeof note !== "string") {
    return NextResponse.json({ error: "note must be a string" }, { status: 400 });
  }
  if (tags !== undefined && (!Array.isArray(tags) || !tags.every((t) => typeof t === "string"))) {
    return NextResponse.json({ error: "tags must be an array of strings" }, { status: 400 });
  }

  try {
    const id = await createManualGame({
      title: title.trim(),
      platform,
      playtime: typeof playtime === "number" ? playtime : 0,
      finished: finished ?? false,
      note: typeof note === "string" ? note : "",
      tags: (tags as string[] | undefined)?.map((t) => t.trim()).filter(Boolean) ?? [],
    });
    return NextResponse.json({ id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
