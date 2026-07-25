import { notFound } from "next/navigation";

import { CaseView } from "@/components/case/CaseView";
import { SEED_GAMES } from "@/lib/games";
import { getGame } from "@/lib/library";

export const dynamic = "force-dynamic";

/**
 * The database is always the source of truth here, regardless of whether
 * Steam is configured — manual games (ADR-0006) can exist with no Steam
 * account attached at all. SEED_GAMES is only a fallback for the seed-data
 * ids shown in the library page's DB-error notice, which never exist in a
 * real database.
 */
export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const game = (await getGame(id).catch(() => null)) ?? SEED_GAMES.find((g) => g.id === id);

  if (!game) notFound();

  return <CaseView game={game} />;
}
