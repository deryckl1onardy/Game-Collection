# Steam sign-in for SteamID, pasted API key for the rest — replaces .env.local

Connecting Steam meant hand-editing `.env.local` with `STEAM_API_KEY` and a 17-digit `STEAM_ID`, then restarting the dev server — the SteamID in particular has no obvious place to find it, and every edit needed a restart to take effect. This was tolerable for a solo build session but not for the actual daily-use artifact this app is meant to become.

Decision: "Sign in through Steam" (OpenID 2.0, the identity flow at `steamcommunity.com/openid/login`) auto-fills the SteamID64 — no more hunting for it in profile settings. This is genuinely all OpenID sign-in can do here: Steam has no OAuth-style flow that issues a scoped access token for the Web API, so the API key itself is still a manual step — generated at `steamcommunity.com/dev/apikey`, a CAPTCHA-gated form with no programmatic alternative, then pasted into a form on `/connect-steam`. Both values are saved to a new single-row `steamConnection` table (not `.env.local`) and take effect immediately, no restart.

`STEAM_API_KEY`/`STEAM_ID` env vars still work and take priority over the stored connection when both are set (`resolveSteamCredentials` in `steam.ts`) — the natural choice for a deployed Vercel Cron run, which has no browser to click a sign-in button with. The stored connection is what a person clicking around the UI uses; the env vars are what a deployment config uses.

Rejected: building a full credential-issuing OAuth-like proxy (e.g. impersonating the flow some third-party Steam tools use) — out of scope for a personal single-user app, more fragile than Valve's own documented OpenID identity flow, and doesn't remove the fundamental need for a hand-generated key regardless.

Consequences:

- The OpenID verification (`verifySteamCallback` in `steam-openid.ts`) has no CSRF state nonce beyond Steam's own `check_authentication` round-trip. Accepted for the same reason ADR-0003 accepts other simplifications here: this is a single-user personal app with no login of its own to hijack, and the worst case of a forged callback is the wrong SteamID getting connected, not a credential leak.
- A pasted API key is validated against a real Steam endpoint (`GetPlayerSummaries`) before being saved, so a typo surfaces immediately on `/connect-steam` instead of silently failing on the next sync.
- `steamIsConfigured()` and everything that calls it became async (it now has to check the database, not just `process.env`). Two call sites (`/` and `/library`) previously gated on Steam being configured *before even checking whether the database had anything* — a bug this change surfaced and fixed, since a Switch/GOG/physical-only library (ADR-0006) has always been a legitimate case with no Steam account involved at all.
