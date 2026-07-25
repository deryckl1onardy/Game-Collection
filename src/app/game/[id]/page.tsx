import { notFound } from "next/navigation";

import { CaseView } from "@/components/case/CaseView";
import { SEED_GAMES } from "@/lib/games";
import { getGame } from "@/lib/library";
import { steamIsConfigured } from "@/lib/steam";

export const dynamic = "force-dynamic";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const game = steamIsConfigured()
    ? await getGame(id)
    : (SEED_GAMES.find((g) => g.id === id) ?? null);

  if (!game) notFound();

  return <CaseView game={game} />;
}
