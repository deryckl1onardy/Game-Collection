# Try the public profile feed before asking for an API key

ADR-0012 replaced hand-editing `.env.local` with a sign-in flow, but the flow still ended in "paste a secret into a form" for every user — which, following a "Sign in through Steam" button, has the exact shape of a credential-phishing page even though the trust model here is different (this is the owner's own self-hosted app, not a third party). That resemblance is a legitimate reason to avoid the pattern whenever there's a real alternative, not just something to explain away.

There is one: Steam profiles expose a free, unauthenticated games-list feed at `steamcommunity.com/profiles/{steamid}/games?tab=all&xml=1` — no key, no auth header, just a GET request — provided the profile's "Game details" privacy is set to Public. This is very likely what makes competing tools (Backloggd and similar) feel seamless: sign in for identity, then read the public feed, no key ever collected from most users.

Decision: after Steam sign-in resolves a SteamID64, `/connect-steam` probes this feed automatically (`probePublicProfile` in `steam.ts`). If it succeeds, the user sees "found N games" and a single-click connect with no key involved at all. Only if the profile is private (or the feed is ever pulled) does the flow fall back to the ADR-0012 API-key form — still available, never removed, just no longer the default path most people hit.

This is a real trade against the official `GetOwnedGames` Web API, not a strictly-better replacement:

- **No self-key bypass.** The official API lets your own key read your own library even if it's private. The public feed has no such door — a private profile is simply unreadable this way, full stop.
- **No last-played timestamp.** The feed carries total hours and last-2-weeks hours, not `rtime_last_played`. `lastPlayedAt`-derived text (the game detail page's "last played <month>" note) falls back to "unknown" for games synced through this path.
- **Officially deprecated by Valve.** Unlike the other unofficial endpoints already in this codebase (ADR-0008's appdetails, ADR-0011's guide lookup), which are merely undocumented, this one is explicitly marked legacy in Valve's own developer documentation. It works today; there's no guarantee it keeps working. `fetchPublicOwnedGames` in `steam-public-profile.ts` treats any unrecognized response shape as "can't do this" rather than a partial read, so a future removal degrades to "ask for a key" rather than a silent bad sync.
- **Hand-rolled parsing.** The feed is XML and no XML dependency exists in this project; rather than add one, `steam-public-profile.ts` extracts the handful of needed tags (`appID`, `name`, `hoursOnRecord`, `hoursLast2Weeks`) with targeted regexes; CDATA and the common HTML entities are unescaped, thousands-separator commas in large hour totals are stripped before parsing.

Consequences:

- `steamConnection` gained a `mode` column (`'public-profile' | 'api-key'`) and `apiKey` became nullable — a public-profile connection stores only a SteamID.
- The public-profile probe is re-run server-side at save time (`POST /api/steam-connection`) rather than trusting the client's earlier read, since a profile's privacy setting can change between the probe and the save.
- A user who wants full data fidelity (last-played dates) can still choose the API-key path even when the public feed works fine — surfaced as an explicit opt-out on the connect screen, not hidden.
