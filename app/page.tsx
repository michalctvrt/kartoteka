// app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Kartotéka — UI prototype</h1>
        <p className="text-gray-600 mb-6">
          Rychlý přehled rolí a dashboardů. Fokus: frontend.
        </p>

        <div className="flex gap-3 justify-center">
          <Link
            href="/login"
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Přihlásit
          </Link>
          <Link href="/(dashboard)/doctor" className="px-4 py-2 border rounded">
            Zkusit lékaře
          </Link>
          <Link
            href="/(dashboard)/reception"
            className="px-4 py-2 border rounded"
          >
            Zkusit recepci
          </Link>
        </div>
      </div>
    </main>
  );
}
