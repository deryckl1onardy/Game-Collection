# Deferred ideas

Things deliberately not built yet, with the reasoning, so they don't get silently forgotten or accidentally re-litigated.

- **Animated shrink-wrap tear** — MVP uses the prototype's opacity fade (`wrapT` easing toward 0). A real tear (splitting geometry / peel) is a lot of engineering for a moment seen once per game. Revisit once the core is built and the fade can be judged in practice.
- **Pullable disc** — MVP: opening the case is enough; the disc keeps its existing idle spin tied to open amount. Deferred because disc removal adds a persistent `disc_out` state with no backlog meaning attached (unlike `wrapped`, which *is* the mechanic). Worth trying later as pure tactility.
- **Multi-user** — see [ADR-0003](adr/0003-true-single-user-no-user-scoping.md) for the full reasoning and the expected migration path.
