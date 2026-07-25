# Manually-tracked games carry an editable playtime

Only Steam syncs playtime; Switch, PSN, GOG, Epic and physical discs are manual entry (see the platform table in the project brief). Combined with [ADR-0005](0005-playtime-tears-the-wrap.md) — only playtime tears the wrap — this would leave every manually-entered game wrapped forever, which is the loudest possible violation of the brief's requirement that non-Steam games show no visual tell about which platform was easy to pull.

Resolution: manually-tracked games get an editable playtime value. The single rule from ADR-0005 holds unchanged — playtime is the truth and the wrap follows it — and the only difference between a Steam game and a Switch game is how playtime arrives (synced vs. typed).

Considered and rejected:

- **A manual "opened" toggle for manual games only** — reintroduces the gesture model ADR-0005 rejected, and creates two different meanings for the same visual state.
- **Manual games start unwrapped** — quietly makes the entire backlog mechanic Steam-exclusive, the opposite of the unification goal.

Consequences:

- A typed playtime increase is still a session delta, so manually-tracked games accumulate library-card stamps like synced ones.
- Manual games need editing UI in the MVP. The brief's build order does not currently account for this.
- Self-reported hours are estimates. This is accepted: the wrap only cares about the zero / above-zero boundary, and the library card shows *when* play happened more than exactly how much.
