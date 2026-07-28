import type { Platform } from "./games";

/**
 * How each platform dresses its cases.
 *
 * Every console maker prints its own livery: a moulded shell in the house
 * colour and a band across the top of the sleeve carrying the wordmark, sitting
 * over the artwork rather than beside it. That band is the reason you can pick a
 * platform out of a shelf from across a room, and it is the part this app was
 * throwing away by printing the platform as a caption underneath instead.
 *
 * Tones are pulled toward the deep end of each brand: these are moulded plastic
 * in a dim archive, not flat brand swatches.
 */
export type Livery = {
  /** The moulded plastic shell showing as a rim around the sleeve. */
  shell: string;
  /** The printed band across the top of the sleeve. */
  band: string;
  /** The wordmark, or the tint applied to `icon` when one is set. */
  ink: string;
  label: string;
  /**
   * A same-origin SVG printed on the band instead of `label`. Read two ways —
   * as a CSS `mask-image` in the 2D grid and rasterized onto the 3D case's
   * sleeve texture — so it must be solid-filled shapes on a transparent
   * background with a square viewBox; see the comment in the file itself.
   */
  icon?: string;
};

const LIVERY: Record<Platform, Livery> = {
  Steam: {
    shell: "#16222e",
    band: "#1b2b3a",
    ink: "#9fc0d8",
    label: "Steam",
    icon: "/platform-icons/steam.svg",
  },
  PSN: { shell: "#1c4f96", band: "#f1f3f6", ink: "#0d1420", label: "PlayStation" },
  Xbox: { shell: "#12631a", band: "#f1f3f6", ink: "#0d1420", label: "Xbox" },
  Switch: { shell: "#b41229", band: "#f1f3f6", ink: "#0d1420", label: "Switch" },
  Epic: { shell: "#191a1e", band: "#2a2d33", ink: "#d6d9df", label: "Epic" },
  GOG: { shell: "#512874", band: "#f1f3f6", ink: "#150f1c", label: "GOG" },
  Physical: { shell: "#2a251f", band: "#ded4bb", ink: "#221d15", label: "Physical" },
};

/** Falls back to the Steam livery — by far the commonest shelf here. */
export function livery(platform?: Platform): Livery {
  return (platform && LIVERY[platform]) || LIVERY.Steam;
}
