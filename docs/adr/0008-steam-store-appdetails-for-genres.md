# Genres come from Steam's store appdetails endpoint, cached locally

Grid-first browsing depends on filtering by genre and tag, but neither Steam endpoint in the sync pipeline returns genre data — `GetOwnedGames` gives appid, name, playtime and `rtime_last_played`; `GetPlayerAchievements` gives completion. As originally sketched, `genres[]` would never be populated and the primary filter would have nothing to work with.

Decision: fetch `store.steampowered.com/api/appdetails?appids=` once per newly-discovered game at import, and cache the genres in our own database.

Chosen over RAWG and IGDB because it is keyed by **appid**, which eliminates the fuzzy title-matching that both alternatives require, and returns genres that already match how the Steam library is mentally organised. Because it is called once per new game rather than per sync or per page load, its rate limiting is not a practical constraint at personal-library volume.

Accepted risk: this endpoint is undocumented and unofficial, and can change without notice. Contained — a failure loses *new* genre imports, not stored ones, and hand-tagging remains available as a fallback.

Note: hand-applied tags are complementary, not an alternative. The tags actually worth browsing by ("comfort game", "co-op with friends") will never come from any API, so user tagging should exist alongside imported genres regardless of source.
