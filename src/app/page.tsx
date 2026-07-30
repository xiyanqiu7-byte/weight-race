"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCouple } from "@/hooks/useCouple";

export default function HomePage() {
  const router = useRouter();
  const { session, bundle, loading } = useCouple();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/enter");
      return;
    }
    const me = bundle?.profiles.find((p) => p.id === session.profileId);
    if (!me || me.start_weight_kg == null) {
      router.replace("/onboard");
      return;
    }
    router.replace("/battle");
  }, [session, bundle, loading, router]);

  return (
    <main className="flex flex-1 items-center justify-center p-8 text-sm text-muted">
      加载中…
    </main>
  );
}
