# PC Game Collection App — Feature & API Research

Research date: 2026-07-19. Sources are primary (official docs, official product pages, GitHub READMEs) wherever they were reachable; where a primary source returned an error or was inaccessible, that is noted explicitly.

## Summary Table

| Product | Type | Library/Import | Backlog / Status | Ratings/Reviews | Playtime | Journal / Notes | Source |
|---|---|---|---|---|---|---|---|
| **Backloggd** | Web backlog tracker (Letterboxd-style) | Manual add via search of Backloggd's game DB (no first-party Steam import found in the fetched pages) | Played / Playing / Backlog / Wishlist toggles per game | 5-star ratings, multiple reviews per "log" (one log = one playthrough) | Tracked per-playthrough in the "Playthroughs" section (added in the 1.3 journal revamp) | Journal = calendar view of days played; split into "Log" (definitive status) and "Playthroughs" (time played, physical/digital, start/end dates, play type) | [backloggd.com/about](https://backloggd.com/about/), [Backloggd 1.3 release notes](https://backloggd.medium.com/1-3-release-49e801ad7665) |
| **Grouvee** | Web backlog tracker | Automatic Steam library import ("shelving") | 4 built-in shelves (Playing, Played, Backlog, Wish List) + unlimited custom shelves | Rate & review games | Not explicitly documented in fetched pages | Personal Lists (ordered, with notes, public/private) and Community Lists (crowd-voted) | [grouvee.com](https://www.grouvee.com/), [Grouvee forum: Collection button](https://discuss.grouvee.com/t/collection-button/726) |
| **HowLongToBeat** | Completion-time database | N/A (not a collection manager) | N/A | N/A | Main data point: main story / main+extra / completionist time estimates | No official API — third-party wrappers scrape the site | [github.com/ckatzorke/howlongtobeat](https://github.com/ckatzorke/howlongtobeat), [howlongtobeatpy PyPI](https://pypi.org/project/howlongtobeatpy/) |
| **Playnite** | Open-source Windows library manager/launcher | Aggregates Steam, Epic, GOG, EA App, Battle.net, Xbox and more via library plugins; installed-game detection needs no credentials, account-linked libraries reuse web-login session cookies/tokens | N/A (launcher, not a tracker) — extensible via plugins | N/A (extensible via plugins) | Tracks/aggregates playtime from connected clients | Extensible via .NET plugins, PowerShell scripts, and UI themes | [github.com/JosefNemec/Playnite README](https://github.com/JosefNemec/Playnite/blob/master/README.md) |
| **GOG Galaxy** | Storefront-agnostic library aggregator (client app) | Unifies Steam, Epic, Xbox Live, Origin/EA and others (natively + via open-source integrations); shows games from connected platforms even if uninstalled | Filter by platform, genre, installation status, custom tags | N/A | Cloud-synced library data; per-platform playtime surfaced | Unified friends/activity feed across GOG, Xbox Live, Epic (+ community integrations for Steam, PSN) | [gog.com/galaxy](https://www.gog.com/galaxy), [gogcom/galaxy-integrations-python-api](https://github.com/gogcom/galaxy-integrations-python-api) |
| **Steam (native library)** | Storefront + client library | Native, Steam-only | Dynamic Collections auto-sort by play state, genre, tag, or feature, and auto-update as criteria change | Steam Store reviews (not a personal rating system) | Native per-game playtime shown in Library | Store Tags (community + developer + moderator applied) act as informal genre/theme metadata | [store.steampowered.com/libraryupdate](https://store.steampowered.com/libraryupdate), [Steam Tags — Steamworks docs](https://partner.steamgames.com/doc/store/tags) |

## Core Features

Features a new game collection web app should treat as baseline table stakes, informed by the products above:

- **Library view** — a single grid/list of all owned games, unified across sources (Steam, manual entries, etc.), modeled on Playnite's "one unified interface for your games" approach ([Playnite README](https://github.com/JosefNemec/Playnite/blob/master/README.md)) and GOG Galaxy's unified "Games" section with platform/genre/install-status filters ([gog.com/galaxy](https://www.gog.com/galaxy)).
- **Filter/sort** — by platform, status, genre/tag, playtime, recently played/added — matching Steam's Dynamic Collections model (auto-updating filtered views) ([Steam library update](https://store.steampowered.com/libraryupdate)) and GOG Galaxy's filter-by-platform/genre/install-status ([gog.com/galaxy](https://www.gog.com/galaxy)).
- **Search** — quick lookup across the collection (all reviewed products with a library view provide this).
- **Tagging** — free-form or curated tags per game, similar to Steam Store Tags (community/developer/moderator-applied) ([Steamworks Store Tags doc](https://partner.steamgames.com/doc/store/tags)) and Grouvee's custom shelves ([Grouvee](https://www.grouvee.com/)).
- **Platform import/detection** — at minimum Steam import (Grouvee does this automatically: [grouvee.com](https://www.grouvee.com/)); Playnite-style local install detection is a stretch goal since it requires a desktop agent, not just a web app ([Playnite README](https://github.com/JosefNemec/Playnite/blob/master/README.md)).
- **Cover art & metadata display** — box art/grid images plus genre, platform, and summary text, the core value proposition of IGDB/RAWG/SteamGridDB (see Technical Considerations below).

## Nice-to-Have Features

- **Wishlist** — a distinct status bucket, as in Backloggd (Wishlist toggle) and Grouvee (built-in Wish List shelf) ([backloggd.com/about](https://backloggd.com/about/), [grouvee.com](https://www.grouvee.com/)).
- **Playtime tracking** — either imported from Steam (native per-game playtime, see Steam docs) or logged manually per playthrough, as Backloggd's Playthroughs section does ([Backloggd 1.3 release](https://backloggd.medium.com/1-3-release-49e801ad7665)).
- **Backlog/completion status** — Played / Playing / Backlog / Wishlist style states, the shared pattern across Backloggd and Grouvee ([backloggd.com/about](https://backloggd.com/about/), [grouvee.com](https://www.grouvee.com/)); completion-time targets could optionally be sourced from HowLongToBeat via an unofficial wrapper (no official API exists — see below).
- **Ratings/reviews** — 5-star (or similar) rating per game or per playthrough/log, as in Backloggd, with support for multiple logs per game each carrying its own rating ([backloggd.com/about](https://backloggd.com/about/)).
- **Custom tags/genres** — user-defined shelves/tags beyond the default set, as in Grouvee's unlimited custom shelves ([Grouvee forum](https://discuss.grouvee.com/t/collection-button/726)).
- **Screenshots** — pulled from a metadata API (IGDB exposes a dedicated Screenshot endpoint/resource — see below).
- **Achievements** — not covered by any of the primary sources reviewed here; would require the Steam Web API's separate achievements endpoints (out of scope for this pass — flagged for follow-up research if prioritized).
- **Notes/journal** — free-text or calendar-based logging, directly modeled on Backloggd's Journal (calendar view of days played) and Playthroughs (start/end dates, play type) ([Backloggd 1.3 release](https://backloggd.medium.com/1-3-release-49e801ad7665)).

## Technical Considerations

### Metadata APIs (IGDB, RAWG, SteamGridDB)

**IGDB API** ([api-docs.igdb.com](https://api-docs.igdb.com/))
- Auth: IGDB authenticates through Twitch as a Twitch Developer. You obtain a Client ID/Secret from a Twitch Developer app, then POST `grant_type=client_credentials` to `https://id.twitch.tv/oauth2/token` to get an app access token; both the `Client-ID` header and `Authorization: Bearer <token>` header are required on every IGDB call ([api-docs.igdb.com](https://api-docs.igdb.com/) — note: direct WebFetch to this page returned HTTP 403 during this research session, so this is corroborated via search-result excerpts of the same official doc plus the [Twitch Developer Forums](https://discuss.dev.twitch.com/t/igdb-authentication-and-tokens-need-server-app/28394)).
- Rate limits: 4 requests/second, up to 8 concurrent open requests; exceeding this returns HTTP 429.
- Data model: query endpoints such as `games`, `covers`, `genres`, `platforms`, `screenshots` via POST to `https://api.igdb.com/v4/<endpoint>`, selecting fields in the request body (e.g. `fields name,release_dates.*,cover.*,genres.*;`). Free for non-commercial use under the Twitch Developer Services Agreement.
- Caveat: the api-docs.igdb.com page could not be fetched directly (403) in this session; details above are drawn from search-engine-rendered excerpts of that same page and corroborating Twitch developer forum threads, not a direct fetch. Verify directly before implementation.

**RAWG API** ([rawg.io/apidocs](https://rawg.io/apidocs), [api.rawg.io/docs](https://api.rawg.io/docs/))
- Auth: requires a free API key, obtained by signing up and filling out a developer info form on the RAWG site; the key must be included on every request ([rawg.readme.io/reference/authentication](https://rawg.readme.io/reference/authentication)).
- Rate limits: free plan = 1,000 requests/hour; paid plans = 4,000 requests/hour. Remaining quota is reported in the `X-Rate-Limit-Remaining` response header.
- Usage terms: free for personal use with attribution; free for commercial/hobby use under 100,000 MAU or 500,000 monthly page views.
- Caveat: a direct WebFetch of `api.rawg.io/docs/` in this session returned only the page title, not full field-level content — the auth/rate-limit facts above come from RAWG's linked `readme.io`-hosted reference page, but the exact list of metadata fields (genres, platforms, screenshots, ratings) was not independently re-verified against fetched page content in this session and should be checked directly before implementation.

**SteamGridDB API** ([steamgriddb.com/api/v2](https://www.steamgriddb.com/api/v2))
- Purpose: cover art / grid / hero / logo images for games (fills the gap IGDB/RAWG covers don't fully solve for Steam-style grid art).
- Auth: generate an API key from your account preferences page at `steamgriddb.com/profile/preferences/api`; send it as a Bearer token in the `Authorization` header. Base URL is `https://www.steamgriddb.com/api/v2` (v1 is deprecated).
- Rate limits: not confirmed in this session — the official API v2 landing page was identified but rate-limit specifics were not directly fetched; verify at `steamgriddb.com/api/v2` before relying on a specific quota.

### Steam Web API for importing a user's owned games

Endpoint (from the official Steamworks partner documentation, [partner.steamgames.com/doc/webapi/iplayerservice](https://partner.steamgames.com/doc/webapi/iplayerservice)):

- **Method/URL**: `GET https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/` (public Web API host; the partner-only host `partner.steam-api.com` also exposes the same interface for approved partners).
- **Auth**: a Steamworks Web API key (`key` parameter), obtained at [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey).
- **Required parameter**: `steamid` — the target user's 64-bit SteamID (SteamID64).
- **Optional parameters**: `include_appinfo` (bool — include name/icon per game; default is appids only), `include_played_free_games` (bool), `appids_filter` (restrict to specific app IDs).
- **Example**: `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=XXXXXXXXXXXXXXXXX&steamid=76561197960434622&format=json`
- **Privacy constraint**: only returns data if the profile's owned-games list is publicly visible to the caller, unless the API key belongs to the same account as the requested `steamid` (i.e., you can always pull your own library with your own key, but pulling another user's requires their profile to be public).

This is the practical, verified path for a "connect your Steam account and import your library" feature in an MVP: user supplies (or the app helps them generate) a Steam Web API key and their SteamID64, and the backend calls `GetOwnedGames`.

### Epic Games Store, GOG, and Xbox: no public "get my library" API

- **Epic Games Store**: Epic's official developer docs (`dev.epicgames.com`) do not expose an endpoint that returns a user's full game library/entitlements list for third-party apps. Community threads on Epic's own help/forum sites confirm this is a recurring, unanswered ask ([Is there a web API endpoint to retrieve a user's library or games? — eoshelp.epicgames.com](https://eoshelp.epicgames.com/s/article/Is-there-a-web-API-endpoint-to-retrieve-a-user-s-library-or-games?language=en_US), [Epic Dev Community forum thread](https://forums.unrealengine.com/t/how-to-retrieve-game-library-details-and-purchase-dates-via-epic-games-api/2245578)). Third-party wrappers exist (e.g. `epicstore_api`, `egs-api`) but rely on unofficial/reverse-engineered endpoints and anti-bot workarounds, not a supported public API.
- **GOG**: GOG has no official public API for a user's owned-games library. There is community-maintained unofficial documentation, and GOG Galaxy's own client uses undocumented endpoints (e.g. `embed.gog.com/user/data/games` for owned game IDs, `auth.gog.com` for OAuth) that are not officially supported for third-party use ([GOG forum: Unofficial GOG API Documentation](https://www.gog.com/forum/general/unofficial_gog_api_documentation), [GOG forum: Read Only Library API? (Not platform integration)](https://www.gog.com/forum/general_beta_gog_galaxy_2.0/read_only_library_api_not_platform_integration), [gogapidocs.readthedocs.io](https://gogapidocs.readthedocs.io/)). GOG Galaxy does provide an official *integrations* SDK (`galaxy-integrations-python-api`) for building platform-connector plugins inside the Galaxy client itself, but that's not equivalent to a hosted web API a third-party website can call. There's also an open GOG "wishlist" request from users asking for a read-only library API, itself evidence none exists today ([gog.com/wishlist/galaxy/user_api_to_track_library_usage](https://www.gog.com/wishlist/galaxy/user_api_to_track_library_usage)).
- **Xbox**: not directly researched in this pass (out of the requested scope), but flagged here since it's the same pattern as Epic/GOG — Microsoft's official Xbox Live APIs are oriented around game services/achievements for registered titles, not third-party "read my whole library" access; treat as unverified and confirm separately if Xbox import becomes a requirement.

**Practical implication for this app**: Steam is the only PC storefront with a straightforward, documented, key-based way to pull a user's owned-games list. For Epic and GOG, the realistic MVP fallback is **manual entry** or **CSV/JSON import** (user exports or manually lists their library), rather than building against unofficial/reverse-engineered endpoints, which carries ToS and breakage risk.

## Recommended MVP vs Phase 2/3

**MVP (solo/small hobby project scope)**
- Manual "add a game" flow, backed by search against a metadata API (RAWG is the simplest to start with: single API key, generous free tier of 1,000 req/hour) for cover art, genre, platform, and summary auto-fill.
- Steam library import via `GetOwnedGames` (user pastes their own Steam Web API key + SteamID64) — the one storefront with a real, documented, low-friction API.
- Manual/CSV import path for everything else (Epic, GOG, physical copies, itch.io, etc.) since no public library API exists for those stores.
- Core library view: grid/list with cover art, platform badge, and basic filter/sort (status, platform, genre, alphabetical, recently added).
- Backlog status field: Playing / Played / Backlog / Wishlist (the four-state pattern shared by Backloggd and Grouvee).
- Basic search across the collection.
- Simple free-text tags (no complex dynamic-collection logic yet).

**Phase 2**
- SteamGridDB integration for higher-quality/custom grid art (nicer visuals than default store art, matches the "polish" of GOG Galaxy/Playnite).
- Playtime tracking, pulled from Steam's own playtime field on `GetOwnedGames` responses (already available via `include_appinfo`/playtime fields in the same call) plus manual entry for non-Steam games.
- Ratings (5-star or similar) and short reviews per game.
- HowLongToBeat-sourced completion-time estimates via a community wrapper library (e.g. `howlongtobeatpy`), clearly labeled as unofficial/best-effort since there's no supported API or SLA.
- Journal/notes: free-text or calendar-style log of play sessions, modeled loosely on Backloggd's Log/Playthroughs split.
- IGDB integration as a second/fallback metadata source for richer data (screenshots, more complete genre/platform taxonomy) once the Twitch OAuth client-credentials flow is set up.

**Phase 3 / stretch**
- Dynamic, auto-updating collections/smart-lists (Steam-style: auto-sort by criteria and keep current as the library changes).
- Custom curated Lists (Grouvee-style personal + community lists with voting).
- Social features (follow friends, compare libraries/ratings) — high build cost, low priority for a personal-use hobby app.
- Desktop companion agent for local install detection à la Playnite (meaningfully larger scope — a full desktop app, not just a web app).
- Achievement tracking via Steam's separate achievements endpoints (not yet verified in this research pass — would need its own investigation).
- Xbox/other-platform import once/if an official or reliable unofficial path is confirmed.

## Notes on Source Reliability

- Most facts above are corroborated by official pages (Steamworks partner docs, RAWG's readme.io auth reference, GOG's own forum/wishlist pages, Epic's own help site, IGDB's docs as surfaced via search) or the project's own GitHub README (Playnite).
- Two direct-fetch attempts failed and are flagged inline: `api-docs.igdb.com` returned HTTP 403 to WebFetch (IGDB facts are instead sourced from search-engine excerpts of that same official page plus Twitch developer forum corroboration); `api.rawg.io/docs/` returned only a page title with no body content on WebFetch (RAWG auth/rate-limit facts came from RAWG's linked readme.io page instead, but the full metadata field list was not independently re-verified against fetched content).
- SteamGridDB's exact rate limits were not confirmed by a direct fetch of primary docs in this session — only the base URL, key-generation location, and Bearer-auth mechanism were confirmed.
