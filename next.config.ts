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

  /**
   * Enables React's <ViewTransition> and makes route navigations trigger it,
   * so a case morphs from its place on the shelf into the detail hero rather
   * than the page cutting (ADR-0014).
   */
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
