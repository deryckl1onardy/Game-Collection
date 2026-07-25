# RAWG for cross-platform data, Steam appdetails for Steam-game description/screenshots

The detail page needs a description, store screenshots, and — new beyond what ADR-0008 covered — which platforms/storefronts a game is available on besides the copy actually owned. Steam's own APIs have no notion of other storefronts, so a second source is required for that specifically.

Decision: RAWG (searched by title) supplies `platformsAvailable`/`storesAvailable` for every game, since it's the only source in this pipeline that knows about Epic/GOG/Switch/etc. For description and screenshots specifically, Steam's own `store.steampowered.com/api/appdetails` — already decided as the genre source in ADR-0008, now actually implemented rather than just planned — wins over RAWG for Steam games, because it's keyed by appid and can't return the wrong game the way a RAWG title search can. RAWG is the fallback for description/screenshots only when Steam has nothing (manual games, or an appdetails miss).

Manually-tracked games have no appid at all, so RAWG is their only source for description, screenshots, and genres alike.

Rejected: IGDB, for the same reason ADR-0008 rejected it originally — a Twitch Developer app and OAuth client-credentials flow is more setup than RAWG's single API key for materially the same coverage at personal-library scale.

Consequences:

- Requires `RAWG_API_KEY` (free tier: 1,000 req/hour) in the environment. Enrichment degrades gracefully without it — `platformsAvailable`/`storesAvailable` stay empty, description/screenshots fall back to whatever Steam provided, nothing breaks.
- RAWG match is by title text search, so an ambiguous or unusual title can silently attach the wrong game's platform list. Accepted for the same reason ADR-0008 accepted this for genres: a miss just leaves fields empty, and there is no per-user cost to a wrong guess beyond a slightly wrong "available on" chip.
- Fetched once per game and cached in `games` (see `enrichedAt` in the schema and `MAX_ENRICH_PER_SYNC` in sync.ts) rather than per page load, both to respect RAWG's rate limit and because this data changes rarely enough that staleness is a non-issue for a personal library.
