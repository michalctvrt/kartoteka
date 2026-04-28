// app/(dashboard)/admin/page.tsx
export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Administrator — Přehled</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded shadow">
          Statistika: počet vyšetření (demo)
        </div>
        <div className="bg-white p-6 rounded shadow">
          Pobočky — přehled (demo)
        </div>
      </div>
    </div>
  );
}
