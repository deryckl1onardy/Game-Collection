# A case travels from the shelf to the detail page instead of the page cutting

Picking a case off the shelf replaced one screen with another. The same object was on both — a thumbnail in a grid cell, then a large case in a hero — but nothing on screen connected them, so the app read as a set of documents rather than as a shelf you take things off. That is the wrong signal for a project whose entire premise is that these are objects you own.

Decision: the case is a shared element. It morphs from its grid cell into the detail hero, and back again, using React's `<ViewTransition>` (enabled by `experimental.viewTransition` in `next.config.ts`, which also makes route navigations trigger transitions). Both ends declare `name={`case-${id}`}` with `share="morph"`; the browser interpolates position and size between them. Everything that is not the case crossfades underneath, quickly, so the case is the only thing the eye tracks.

## The hero is WebGL, which a view transition cannot morph into

The detail hero is a `<Canvas>`, not a DOM element, so there is nothing for the browser to pair the grid's flat case with. The fix is a flat `CaseCover` rendered in the hero at exactly the position and size the WebGL case occupies, which *is* the morph target; the canvas then crossfades in over it once `onCreated` fires.

Those bounds are derived rather than eyeballed. The panel is W 1.86 × H 2.62 (`case-geometry.ts`), centred at the origin, viewed by a fov-32 camera 7 units back — ~6.87 to the front face. Visible height there is 2 · 6.87 · tan(16°) ≈ 3.94 units, so the case is 2.62/3.94 ≈ 66.3% of viewport height, and its width follows from the panel ratio. Measured against the real canvas, the stand-in lands within about 1%.

The stand-in is deliberately **never faded out**. The canvas is opaque and simply covers it, which means the flat case is still sitting there, in place, to morph *back* to the shelf on the return trip. Fading it would have made the return animate out of nothing. It also doubles as the first paint: the case is visible immediately instead of a black rectangle while the WebGL scene and its texture load.

## Returning to the shelf needed both a push and a restored scroll

An element outside the viewport cannot take part in a view transition — verified: returning to a shelf scrolled such that the case sat at y≈896 in a 900px viewport produced `old(case-…)` with no `new(…)` to pair with, so the morph silently degraded to a crossfade.

Two obvious approaches each fail on their own, and this was only caught by measuring rather than reasoning:

- **`router.back()`** restores scroll, so the case is on screen — but runs no view transition at all. Nothing animates.
- **A plain push to `/library`** does transition, but Next resets scroll to the top, so a case picked from further down the shelf is off-screen when the incoming state is captured.

So: push with `scroll={false}`, and restore the remembered position in the shelf itself (`shelf-history.ts`, applied in a `useLayoutEffect` so it lands before paint and therefore before the browser captures the incoming state). Both halves are required; either alone loses the morph.

## Consequences

- Timing is `520ms` on a mass-like easing curve, with a blur peak mid-flight to hide interpolation between two different renderings of the same case. In a production build the transition begins ~120–155ms after the click. In development it is closer to 300–600ms because the route is compiled on demand, so dev is not a fair read of this.
- `prefers-reduced-motion` drops all view-transition durations to zero, which is the browser's own default behaviour (an instant swap). Positional travel across the viewport is the main motion-sensitivity trigger, and this is the only place the app moves anything that far.
- Every grid case carries a `view-transition-name`, which must be unique per document. Game ids are unique and the home page's two lists are disjoint (the sealed pick has zero playtime; "continue" requires playtime above zero), so no duplicate can arise.
- Only the library grid records a scroll position. The home page also links into detail pages, but its back link is labelled "the shelf" and should go to `/library` rather than back to where the visitor came from.
- Mid-flight stills cannot be captured with Playwright — its screenshot pipeline settles animations first, even with the morph slowed to 4s. Verification is programmatic instead: asserting that `document.startViewTransition` is called and that `group`/`old`/`new`/`image-pair` pseudo-elements all exist for the case's name, which is what proves the two ends actually paired rather than crossfaded.
