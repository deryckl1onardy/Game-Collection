# PGlite for local development, Neon in production

[ADR-0004](0004-neon-postgres-vercel-blob.md) chose Neon as the Postgres provider. That still holds for deployment, but it made local development depend on provisioning a cloud database before a single line of the sync pipeline could be run or verified — and the machine has neither Docker nor a local Postgres.

Decision: the database handle picks its driver from the environment. `DATABASE_URL` set → Neon over HTTP. Unset → PGlite, real Postgres compiled to WebAssembly, persisting to `.pglite/`. Same dialect, same Drizzle schema, same queries, same migrations; switching is one environment variable.

Rejected alternatives: requiring Neon before anything can run (blocks all progress on an account signup), and SQLite for development (a different dialect, so schema and query bugs would only surface in production — the exact failure mode this arrangement avoids).

Consequences:

- `.pglite/` is gitignored and disposable. Deleting it and re-running the sync rebuilds the library from Steam in about a second.
- Only one process may hold the PGlite data directory. Inspecting it with a script while the dev server is running reports missing tables — stop the server first.
- `@electric-sql/pglite` must stay in `serverExternalPackages` (see gotcha 8 in the project brief).
