import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kartotéka – DC Flipper",
  description: "Aplikace pro správu pacientů",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <head>
        {/* Brand písmo DC Flipper */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="bg-[#f4f7f8] dark:bg-neutral-950 text-gray-900 dark:text-gray-100">
        <div className="flex min-h-screen">
          {/* Sidebar menu */}

          {/* Obsah stránky */}
          <main className="flex-1 p-6 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
