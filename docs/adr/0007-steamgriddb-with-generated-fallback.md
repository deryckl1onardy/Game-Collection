# SteamGridDB for non-Steam cover art, generated fallback when it misses

Steam games get cover art from `library_600x900_2x.jpg`, which is already box-cover proportioned and maps to the front panel uncropped. Manually-tracked games (Switch, PSN, GOG, Epic, physical) have no such source, and because the case is a photo-real physical object, missing art reads as a broken artifact rather than a neutral placeholder.

Decision: look art up in SteamGridDB on manual add, and fall back to the prototype's generated cover when nothing suitable comes back.

SteamGridDB fits because it exists to solve this exact problem for custom launchers: its vertical grid format is 600x900, matching both the Steam asset proportions and the case geometry, and its API addresses games either by Steam appid (`type: 'steam'`) or by its own ID (`type: 'game'`), so non-Steam titles are reachable by name search. Auth is a single API key from the account preferences page.

The generated fallback (`fallbackCover()` in the v4 prototype — per-title gradient, name set in Georgia, grain and border) already looks deliberate rather than broken, so every manual game is presentable the moment it is added, with zero sourcing work. This is what satisfies the brief's "no visual tell about which platform was easy to pull".

Unverified at decision time: SteamGridDB publishes no rate limit in its API docs or first-party wrapper, and dimension filtering is visible on the website but not documented in the wrapper. Mitigated by the fact that art is fetched once per game and downloaded to our own blob storage anyway (see [ADR-0004](0004-neon-postgres-vercel-blob.md)), so steady-state request volume is near zero.

Deferred: manual cover upload as an escape hatch when SteamGridDB returns wrong or poor art. Nearly free to add later — the v4 prototype already implements drag-and-drop local image loading.
