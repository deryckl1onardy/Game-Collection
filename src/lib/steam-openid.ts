import "server-only";

/**
 * "Sign in through Steam" (ADR-0012) — OpenID 2.0, not OAuth.
 *
 * This proves identity only: which SteamID64 the visitor is. It cannot hand
 * out an API key — Steam has no scoped-token flow for the Web API, so
 * `steamcommunity.com/dev/apikey` (a manual, CAPTCHA-gated form) is still the
 * only way to get one. This flow exists to remove the "hunt for your 17-digit
 * SteamID64" step, not the API key step.
 */

const STEAM_OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
const CLAIMED_ID_RE = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

/** The URL to send the browser to. `returnTo` must be this app's own origin. */
export function buildSteamLoginUrl(returnTo: string) {
  const realm = new URL(returnTo).origin;

  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": realm,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });

  return `${STEAM_OPENID_ENDPOINT}?${params.toString()}`;
}

/**
 * Verifies Steam's callback and extracts the SteamID64.
 *
 * Steam's response can't be trusted as-is — anyone can hit the callback URL
 * with a hand-crafted `claimed_id`. The OpenID 2.0 protocol's answer is to
 * echo every param straight back to the provider with `openid.mode` switched
 * to `check_authentication`; Steam replies `is_valid:true` only for an
 * assertion it actually issued.
 *
 * No CSRF state nonce here beyond that — this is a single-user personal app
 * (ADR-0003) with no login of its own to hijack; the worst case of a forged
 * callback is the wrong SteamID getting connected, not a credential leak.
 */
export async function verifySteamCallback(
  query: URLSearchParams,
): Promise<string | null> {
  if (query.get("openid.mode") !== "id_res") return null;

  const claimedId = query.get("openid.claimed_id");
  if (!claimedId) return null;
  const match = CLAIMED_ID_RE.exec(claimedId);
  if (!match) return null;

  const verify = new URLSearchParams(query);
  verify.set("openid.mode", "check_authentication");

  const res = await fetch(STEAM_OPENID_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verify.toString(),
    cache: "no-store",
  });
  if (!res.ok) return null;

  const body = await res.text();
  if (!/is_valid\s*:\s*true/.test(body)) return null;

  return match[1];
}
