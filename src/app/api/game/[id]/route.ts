import { NextResponse } from "next/server";

import { updateUserGame } from "@/lib/library";

export const dynamic = "force-dynamic";

/**
 * Saves the owner's own annotations for a game (ADR-0006): finished flag,
 * tags, note, and — for manually-tracked platforms Steam cannot see —
 * playtime. Sync never touches this data (see the `userGames` doc comment
 * in the schema), so this is the only writer.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { finished, note, tags, manualPlaytime } = body as Record<string, unknown>;

  if (typeof finished !== "boolean") {
    return NextResponse.json({ error: "finished must be a boolean" }, { status: 400 });
  }
  if (typeof note !== "string") {
    return NextResponse.json({ error: "note must be a string" }, { status: 400 });
  }
  if (!Array.isArray(tags) || !tags.every((t) => typeof t === "string")) {
    return NextResponse.json({ error: "tags must be an array of strings" }, { status: 400 });
  }
  if (manualPlaytime !== null && typeof manualPlaytime !== "number") {
    return NextResponse.json(
      { error: "manualPlaytime must be a number or null" },
      { status: 400 },
    );
  }

  try {
    await updateUserGame(id, {
      finished,
      note,
      tags: tags.map((t) => t.trim()).filter(Boolean),
      manualPlaytime,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
