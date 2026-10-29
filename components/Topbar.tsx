// components/Topbar.tsx
export default function Topbar() {
  return (
    <header className="h-16 bg-ui-sheet border-b flex items-center justify-between px-6">
      <div className="text-lg font-medium">Přehled</div>
      <div className="flex items-center gap-4">
        <div className="text-sm text-ui-muted">Uživatel (demo)</div>
      </div>
    </header>
  );
}
