import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Status Board",
  description: "Tablero de estado del proyecto y status report ejecutivo",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
