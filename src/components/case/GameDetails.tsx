import type { Game } from "@/lib/games";
import { hltbSearchUrl, steamGuidesUrl } from "@/lib/games";

function Chip({ children, owned }: { children: React.ReactNode; owned?: boolean }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs ${
        owned
          ? "border-[#7fb6df]/50 bg-[#1d3040] text-[#7fb6df]"
          : "border-white/15 text-[#8e8d86]"
      }`}
    >
      {children}
    </span>
  );
}

function HltbStat({ label, hours }: { label: string; hours: number | null | undefined }) {
  if (!hours) return null;
  return (
    <div>
      <p className="text-lg text-[#e9e7e0]">{hours}h</p>
      <p className="text-xs text-[#75746e]">{label}</p>
    </div>
  );
}

/**
 * Everything enrichment (ADR-0010, ADR-0011) adds beyond the case itself:
 * description, store screenshots, cross-platform availability, guides, and
 * completion time. Rendered below the fixed 3D hero in normal document flow
 * so the page scrolls to reveal it (see the layout split in CaseView).
 */
export function GameDetails({ game }: { game: Game }) {
  const hasHltb =
    game.hltbMainHours || game.hltbMainExtraHours || game.hltbCompletionistHours;
  const hasPlatforms = (game.platformsAvailable?.length ?? 0) > 0;
  const isSteam = game.source === "steam";

  return (
    <div className="mx-auto max-w-3xl px-6 py-14 sm:px-10">
      {game.description && (
        <section className="mb-12">
          <h2 className="mb-3 text-sm uppercase tracking-wider text-[#75746e]">About</h2>
          <p className="text-[15px] leading-relaxed text-[#c9c7c0]">{game.description}</p>
        </section>
      )}

      {game.screenshots && game.screenshots.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-3 text-sm uppercase tracking-wider text-[#75746e]">Screenshots</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {game.screenshots.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element -- external, unoptimized store art
              <img
                key={src}
                src={src}
                alt=""
                className="h-32 w-auto shrink-0 rounded-lg border border-white/10 object-cover sm:h-40"
              />
            ))}
          </div>
        </section>
      )}

      {(hasPlatforms || (game.storesAvailable?.length ?? 0) > 0) && (
        <section className="mb-12">
          <h2 className="mb-3 text-sm uppercase tracking-wider text-[#75746e]">
            Available on
          </h2>
          <div className="flex flex-wrap gap-2">
            {game.platformsAvailable?.map((p) => (
              <Chip key={p} owned={p.toLowerCase().includes(game.platform.toLowerCase())}>
                {p}
              </Chip>
            ))}
            {game.storesAvailable?.map((s) => (
              <Chip key={s} owned={s.toLowerCase() === game.platform.toLowerCase()}>
                {s}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-xs text-[#4e4d49]">
            highlighted: the copy you own ({game.platform})
          </p>
        </section>
      )}

      <section className="mb-12">
        <h2 className="mb-3 text-sm uppercase tracking-wider text-[#75746e]">
          How long to beat
        </h2>
        {hasHltb ? (
          <div className="flex gap-8">
            <HltbStat label="main story" hours={game.hltbMainHours} />
            <HltbStat label="main + extra" hours={game.hltbMainExtraHours} />
            <HltbStat label="completionist" hours={game.hltbCompletionistHours} />
          </div>
        ) : (
          <a
            href={hltbSearchUrl(game.title)}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[#7fb6df] hover:underline"
          >
            look it up on HowLongToBeat →
          </a>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm uppercase tracking-wider text-[#75746e]">Guides</h2>
        <div className="flex flex-col gap-1.5">
          {game.topGuideUrl && (
            <a
              href={game.topGuideUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[#7fb6df] hover:underline"
            >
              {game.topGuideTitle || "top guide"} →
            </a>
          )}
          {isSteam && (
            <a
              href={steamGuidesUrl(game.id)}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[#7fb6df] hover:underline"
            >
              browse Steam Community guides →
            </a>
          )}
          {!game.topGuideUrl && !isSteam && (
            <p className="text-sm text-[#75746e]">no guide source for this platform yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
