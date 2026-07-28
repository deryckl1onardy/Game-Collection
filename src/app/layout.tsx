import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { ShelfSceneProvider } from "@/lib/shelf-scene";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

/**
 * Three voices, borrowed from the objects this app is about:
 *
 * - Fraunces sets titles. A high-contrast serif with optical sizing and a
 *   little wonk in the letterforms — it reads as printed, not rendered.
 * - Plex Mono is the catalog: call numbers, hours, dates, drawer labels.
 *   Everything a librarian would have typed rather than written.
 * - Plex Sans carries prose. Same superfamily as the mono, so descriptions
 *   sit next to metadata without a seam.
 */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Shelf",
  description: "A private archive of the games you own.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
      // Set by the boot script below before paint; declared here so the
      // server markup already carries an attribute for CSS to match on.
      data-theme="dark"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      {/*
        The 3D scene is mounted here, above the router, so that moving between
        the shelf and a game keeps one WebGL context alive instead of
        destroying the renderer and rebuilding it (see lib/shelf-scene.tsx).
        The provider renders nothing at all until a route claims it, so every
        other page is unaffected.
      */}
      <body className="flex min-h-full flex-col">
        <ShelfSceneProvider>{children}</ShelfSceneProvider>
      </body>
    </html>
  );
}
