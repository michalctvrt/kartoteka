import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kartotéka",
  description: "Aplikace pro správu pacientů",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body className="bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-gray-100">
        <div className="flex min-h-screen">
          {/* Sidebar menu */}

          {/* Obsah stránky */}
          <main className="flex-1 p-6 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
