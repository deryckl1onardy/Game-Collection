# Neon Postgres + Vercel Blob for covers

The app deploys to Vercel and must serve cover art from its own origin, because WebGL refuses to upload textures it isn't permitted to read cross-origin (see the CORS gotcha in the project brief — hotlinking Steam's CDN fails outright). We chose Neon for Postgres (scales to zero when idle, so a single-user app with a nightly cron costs nothing; first-party Vercel integration wires up the connection string) and Vercel Blob for downloaded cover images (same-origin by default, CDN-served, no bucket policy or CORS configuration to get wrong).

Rejected alternative: Supabase, which would consolidate database and object storage into one account — rejected because its storage is served from a separate origin, which reintroduces exactly the CORS problem the download-covers-locally step exists to eliminate.

Consequence to watch: Vercel Blob's free tier is small. A few hundred 600x900 cover JPEGs is comfortably within it, but T1 assets (manual scans, disc art) could change that — check current limits before an asset-hunting push.
