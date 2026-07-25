# Next.js + Postgres + Drizzle as the stack

The project is a solo-built web app (library grid, filters, external API calls to Steam, plus an interactive 3D case view) with no existing stack preference. We chose Next.js (React, App Router) as a single full-stack framework so UI and API routes (including server-side calls to RAWG/Steam that keep API keys off the client) live in one codebase and deploy as one app, Postgres as the database since the domain (users, games, statuses, tags) is naturally relational, and Drizzle over Prisma as the ORM for a lighter, more SQL-shaped tool that suits a solo developer. Rejected alternatives: a separate frontend+backend split (unnecessary overhead for this scope), SQLite/Mongo (less natural fit for the relational domain), and Prisma (more tooling/magic than needed here).

The 3D case view uses React Three Fiber with drei, not raw Three.js, because UI state and 3D state are tightly coupled here (open/closed, current game, wrap state) and drei supplies `Environment`, `ContactShadows`, `PresentationControls` and `useTexture` off the shelf. This reinforces the Next.js/React choice rather than being incidental to it.

Note: the multi-user reasoning originally cited here was superseded by [ADR-0003](0003-true-single-user-no-user-scoping.md); the stack choice itself is unaffected.
