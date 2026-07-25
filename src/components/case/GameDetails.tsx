import type { Game } from "@/lib/games";
import { hltbSearchUrl, steamGuidesUrl } from "@/lib/games";

/**
 * One field of the catalogue record: label in the left rail, content in the
 * body — the layout of an actual card in a card catalog, where every entry
 * has its field name printed beside it.
 */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-12 gap-y-4 border-t border-[var(--rule)] py-10 md:grid-cols-[9rem_minmax(0,1fr)]">
      <p className="catalog pt-1 text-paper-ghost">{label}</p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * The circulation card.
 *
 * `sessions` rows are the only record of *when* this game was actually
 * played, and printing them as inked date stamps on ruled card stock is the
 * whole reason the sync job records deltas rather than just overwriting
 * playtime (ADR-0005). It is the one artefact here that could plausibly
 * have been sitting in a sleeve inside the case.
 */
function CirculationCard({ game, stamps }: { game: Game; stamps: string[] }) {
  return (
    <div className="mb-4 [perspective:1400px]">
      <div className="card-stock relative max-w-md rotate-[-0.8deg] rounded-[2px] px-7 pb-7 pt-6 transition-transform duration-500 hover:rotate-0">
        <p
          className="text-[10px] uppercase tracking-[0.3em]"
          style={{ color: "rgba(42,36,25,0.55)" }}
        >
          circulation record
        </p>
        <p
          className="mt-2 font-display text-2xl font-semibold leading-tight"
          style={{ color: "#221d14" }}
        >
          {game.title}
        </p>

        <div
          className="my-5 h-px w-full"
          style={{ background: "rgba(42,36,25,0.3)" }}
        />

        <p
          className="text-[10px] uppercase tracking-[0.3em]"
          style={{ color: "rgba(42,36,25,0.55)" }}
        >
          date issued
        </p>

        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-3.5">
          {stamps.map((s, i) => (
            <span
              key={`${s}-${i}`}
              className="stamp stamp-ink px-2.5 py-1 text-[10px]"
              // Deterministic jitter — a stamp is never square to the page,
              // but it also must not move between renders.
              style={{ transform: `rotate(${((i * 37) % 7) - 3}deg)` }}
            >
              {s}
            </span>
          ))}
        </div>

        {/* punch hole, like a card that lived in a pocket */}
        <span
          className="absolute right-6 top-6 h-3.5 w-3.5 rounded-full"
          style={{
            background: "var(--ink)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9)",
          }}
        />
      </div>
    </div>
  );
}

function Duration({ label, hours }: { label: string; hours: number | null | undefined }) {
  if (!hours) return null;
  return (
    <div>
      <p className="font-display text-[2rem] leading-none text-paper">
        {hours}
        <span className="ml-0.5 text-base text-paper-faint">h</span>
      </p>
      <p className="catalog mt-2.5 text-paper-ghost">{label}</p>
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
  const editions = [
    ...(game.platformsAvailable ?? []),
    ...(game.storesAvailable ?? []),
  ];
  const isSteam = game.source === "steam";
  const stamps = game.stamps ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 pb-32 pt-24 sm:px-10">
      <p className="drawer-label mb-12">the record</p>

      {stamps.length > 0 && <CirculationCard game={game} stamps={stamps} />}

      {game.description && (
        <Field label="synopsis">
          <p className="max-w-prose font-display text-[1.0625rem] leading-[1.75] text-paper-dim first-letter:float-left first-letter:mr-2.5 first-letter:mt-1 first-letter:font-display first-letter:text-[3.25rem] first-letter:leading-[0.8] first-letter:text-amber">
            {game.description}
          </p>
        </Field>
      )}

      {game.screenshots && game.screenshots.length > 0 && (
        <Field label="plates">
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-3">
            {game.screenshots.map((src, i) => (
              <figure key={src} className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- external, unoptimized store art */}
                <img
                  src={src}
                  alt=""
                  className="h-36 w-auto rounded-[2px] border border-[var(--rule)] object-cover shadow-[0_16px_28px_-14px_rgba(0,0,0,0.9)] sm:h-44"
                />
                <figcaption className="catalog mt-2.5 text-paper-ghost">
                  pl. {String(i + 1).padStart(2, "0")}
                </figcaption>
              </figure>
            ))}
          </div>
        </Field>
      )}

      {editions.length > 0 && (
        <Field label="editions">
          <ul className="max-w-sm">
            {editions.map((e) => {
              const held = e.toLowerCase().includes(game.platform.toLowerCase());
              return (
                <li
                  key={e}
                  className="flex items-baseline justify-between gap-4 border-b border-[var(--rule)] py-2.5 last:border-0"
                >
                  <span
                    className={`font-display text-[15px] ${held ? "text-paper" : "text-paper-faint"}`}
                  >
                    {e}
                  </span>
                  {held && (
                    <span className="catalog text-amber">held</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Field>
      )}

      <Field label="duration">
        {hasHltb ? (
          <div className="flex flex-wrap gap-x-14 gap-y-7">
            <Duration label="main story" hours={game.hltbMainHours} />
            <Duration label="main + extra" hours={game.hltbMainExtraHours} />
            <Duration label="completionist" hours={game.hltbCompletionistHours} />
          </div>
        ) : (
          <a
            href={hltbSearchUrl(game.title)}
            target="_blank"
            rel="noreferrer"
            className="catalog text-paper-faint underline decoration-[var(--rule-strong)] underline-offset-4 transition-colors hover:text-amber hover:decoration-[var(--amber)]"
          >
            look it up on howlongtobeat →
          </a>
        )}
      </Field>

      <Field label="references">
        <div className="flex flex-col items-start gap-3">
          {game.topGuideUrl && (
            <a
              href={game.topGuideUrl}
              target="_blank"
              rel="noreferrer"
              className="font-display text-[15px] text-paper-dim underline decoration-[var(--rule-strong)] underline-offset-4 transition-colors hover:text-amber hover:decoration-[var(--amber)]"
            >
              {game.topGuideTitle || "top guide"} →
            </a>
          )}
          {isSteam && (
            <a
              href={steamGuidesUrl(game.id)}
              target="_blank"
              rel="noreferrer"
              className="catalog text-paper-faint underline decoration-[var(--rule-strong)] underline-offset-4 transition-colors hover:text-amber hover:decoration-[var(--amber)]"
            >
              browse community guides →
            </a>
          )}
          {!game.topGuideUrl && !isSteam && (
            <p className="catalog text-paper-ghost">
              no guide source for this platform yet
            </p>
          )}
        </div>
      </Field>

      <div className="border-t border-[var(--rule)]" />
    </div>
  );
}
