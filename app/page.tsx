"use client";

/** Rozcestník: přihlášený → jeho plocha, jinak přihlášení. */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/auth/SessionProvider";

export default function Home() {
  const router = useRouter();
  const { ready, user, home } = useSession();
  useEffect(() => {
    if (ready) router.replace(user ? home : "/login");
  }, [ready, user, home, router]);
  return null;
}
