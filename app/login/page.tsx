// app/login/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // UI-only: na mock přihlášení přesměruj podle emailu / role
    // pro demo: admin@ → admin, doctor@ → doctor, lab@ → lab, rec@ → reception
    if (email.includes("admin")) router.push("/admin");
    else if (email.includes("doctor")) router.push("/doctor");
    else if (email.includes("lab")) router.push("/lab");
    else router.push("/reception");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white p-6 rounded-lg shadow"
      >
        <h2 className="text-xl font-semibold mb-4">Přihlášení (demo)</h2>

        <label className="block mb-2 text-sm">Email</label>
        <input
          className="w-full mb-4 p-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="např. doctor@local"
        />

        <label className="block mb-2 text-sm">Heslo</label>
        <input
          type="password"
          className="w-full mb-4 p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="w-full bg-blue-600 text-white py-2 rounded">
          Přihlásit se
        </button>

        <p className="text-xs text-gray-500 mt-3">
          Demo: zadej email obsahující &quot;admin&quot;, &quot;doctor&quot;,
          &quot;lab&quot; nebo cokoli jiného pro recepci.
        </p>
      </form>
    </div>
  );
}
