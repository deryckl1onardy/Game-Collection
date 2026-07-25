# Only playtime tears the wrap

A game's shrink wrap comes off when sync reports `playtime_forever > 0`, not when the owner opens the case in the app. The wrap is therefore derived from sync data, not a persisted user action — the `wrapped` column in the original schema sketch is unnecessary, since wrap state is a function of playtime.

Considered options:

1. **Gesture tears it, permanently** (what the v4 prototype does — a `torn` set, relabelling a 0-hour game as unfinished on click). Rejected: it lets the shelf show a torn, never-played case, which is a sharper guilt signal than the wrap was, cutting against the project's primary goal of anticipation over shame.
2. **Only playtime tears it** — chosen. The shelf stays an honest mirror of real behaviour; progress cannot be faked from inside the app.
3. **Gesture tears it, reversible until played.** Rejected: destroys the permanence that gives the state change its meaning.

Consequences:

- The case view must not offer an "open" affordance on an unopened game — under this model there is nothing the gesture could truthfully do. Wrapped cases are look-don't-touch until real play is recorded.
- Wrap removal is now gated on **sync freshness**. Play a game for twenty minutes and the wrap stays on until the next sync runs. This dependency did not exist under option 1.

Resolution of the freshness problem: keep the nightly cron as the backbone and add a manual "sync now" control hitting the same `/api/sync` route. **Do not add sync-on-visit** — it burns Steam API calls on every page load and, more importantly, fragments the playtime deltas the library card is built from. The nightly cadence is what makes stamp history legible; irregular syncs make it noise. The overnight lag is also mildly desirable: the wrap coming off by morning fits the intended "small ritual" of opening the site.
