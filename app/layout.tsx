import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "../styles/globals.css";
import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { SessionProvider } from "@/components/auth/SessionProvider";

export const metadata: Metadata = {
  title: "Kartotéka – DC Flipper",
  description: "Aplikace pro správu pacientů",
};

// Brand písmo DC Flipper – stáhne se při sestavení a přibalí do aplikace (funguje i bez internetu na pobočce)
const montserrat = Montserrat({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], variable: "--font-montserrat" });

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs" className={montserrat.variable}>
      <head>
        {/*
          Nastavení pobočky (lib/runtimeConfig.ts) – musí se načíst PŘED aplikací, proto blokující skript.
          V produkci (statický web v EARu) ho každá pobočka upraví; vzor public/config.js, docs/PRODUKCE.md.
        */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src={`${BASE_PATH}/config.js`} />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
