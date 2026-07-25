# The archive has a day and a night, not a dark mode and an inverted one

The design committed hard to a single look — warm ink, aged card stock, oxidised amber, a room at night (ADR-0013's redesign). A light theme built by mechanically inverting those values would have produced grey-on-white with an amber that no longer carries, losing the identity the dark theme exists to establish.

Decision: light is the same archive by daylight. The semantic roles hold — `--ink` is always the ground, `--paper` always the text on it — but the pigments change rather than invert. Aged card stock becomes the room; the amber deepens from `#d9963f` to `#9c6216`, because a varnish tone that reads as warm light against near-black is far too pale to carry against cream. The cases themselves do **not** change: a game case is dark moulded plastic in any lighting, and against a lit room it reads *more* like an object than it does at night.

## Everything that a variable swap does not cover

Surfaces whose treatment is a function of the ground, not just its colour, needed their own tokens:

- **Grain.** `mix-blend-mode: overlay` gives tooth on a dark ground and blows out on a pale one; light multiplies instead, at lower opacity.
- **The shelf plank.** A shelf in a lit room is mid-tone timber, not the near-silhouette it is at night.
- **Washes and bevels.** `--wash`/`--bevel` invert in kind: a pale film over dark becomes a dark film over pale, and a pale inset highlight becomes a white one.
- **The circulation card.** By day it is nearly the tone of the room it lies in, so it needs an edge and a tighter shadow to still read as a separate object rather than a patch of page. At night the contrast does that work by itself.
- **The WebGL hero.** A canvas cannot reference a CSS variable, so `--ink` is read live and passed in (`useThemeColor`, a `MutationObserver` on `data-theme`). Without it the case would sit in a black rectangle punched into a cream page.

The card's punch hole is the one thing that needed no handling at all: it is `var(--ink)` in both themes, because a hole genuinely does show the page behind it.

## Mechanics

- The choice is stored in `localStorage` and falls back to `prefers-color-scheme`, applied by an inline script in `<head>` so the page never renders in the wrong theme and then snaps. `<html>` ships with `data-theme="dark"` and `suppressHydrationWarning`, since the script corrects the attribute before React hydrates.
- The toggle's label is chosen in CSS from `data-theme` rather than from React state. Reading the theme into state during render would mismatch between server and client on the first paint; letting CSS pick means there is no theme-dependent markup to mismatch.
- Switching is wrapped in `document.startViewTransition`, so the room changes light rather than cutting — reusing the mechanism from ADR-0014. Only the root crossfades: React applies its `<ViewTransition>` names during React-driven transitions, and this is a plain attribute change.

## Consequences

- Adding a hardcoded colour anywhere now silently breaks one theme. This is not hypothetical — `CaseView`'s `<main>` still carried `bg-[#101113]`, a colour left over from *before* the redesign, which made the whole record section below the hero render dark-on-dark in the light theme. Colours belong in `globals.css` as tokens; components should reference them.
- Contrast in light was chosen against the cream ground rather than white, so the muted greys are darker than their dark-theme counterparts are light. `--paper-ghost` is the weakest pairing in both themes by design, since it carries de-emphasised field labels rather than content.
