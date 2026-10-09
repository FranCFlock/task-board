import type { Metadata } from "next";
import "./globals.css";

const title = "Status Board";
const description = "Salud del proyecto de un vistazo y status report ejecutivo con un clic.";

// Absolute base for the link-preview image: Vercel sets the production domain; local dev falls back to localhost.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: { title, description, type: "website", locale: "es_AR", siteName: title },
  twitter: { card: "summary_large_image", title, description },
};

// Runs before the first paint so the page never flashes the wrong theme.
// The key must match THEME_KEY in components/ThemeToggle.tsx.
const themeScript = `(function(){try{var s=localStorage.getItem("status-board:theme");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the script above may add the "dark" class before React hydrates.
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
