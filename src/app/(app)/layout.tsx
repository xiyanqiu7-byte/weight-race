"use client";

import { TabBar } from "@/components/TabBar";
import { ModeBanner } from "@/components/ModeBanner";
import { useCouple } from "@/hooks/useCouple";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, bundle, loading, error } = useCouple();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/enter");
      return;
    }
    if (error) return;
    const me = bundle?.profiles.find((p) => p.id === session.profileId);
    if (bundle && me && me.start_weight_kg == null) {
      router.replace("/onboard");
    }
  }, [session, bundle, loading, error, router]);

  return (
    <div className="flex min-h-dvh flex-col">
      <ModeBanner />
      <div className="flex items-center justify-between px-5 py-4">
        <div className="text-[15px] font-bold tracking-tight">减脂对战</div>
        <Link
          href="/settings"
          className="rounded-full bg-sand px-3 py-1.5 text-[12px] font-semibold text-ink"
        >
          设置
        </Link>
      </div>
      <div className="flex flex-1 flex-col overflow-auto">{children}</div>
      <TabBar />
    </div>
  );
}
