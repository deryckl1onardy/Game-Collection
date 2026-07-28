import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * PGlite ships Postgres as WebAssembly and loads it from its own package
   * directory. Bundling it breaks that lookup — the first query fails with an
   * opaque "Failed query: CREATE SCHEMA ...". Left external, it loads normally.
   *
   * Only affects local development; production uses Neon (ADR-0004).
   */
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    // Powers the cover -> case shared-element morph (PROJECT_BRIEF.md
    // "Transition") and the filtered-grid crossfade, both via React's
    // <ViewTransition>. See node_modules/next/dist/docs/.../view-transitions.md.
    viewTransition: true,
  },
};

export default nextConfig;
