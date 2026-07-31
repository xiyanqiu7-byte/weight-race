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
    <div className="flex h-dvh flex-col">
      <ModeBanner />
      <div className="flex shrink-0 items-center justify-between px-5 py-4">
        <div className="text-[15px] font-bold tracking-tight">减脂对战</div>
        <Link
          href="/settings"
          className="rounded-full bg-sand px-3 py-1.5 text-[12px] font-semibold text-ink"
        >
          设置
        </Link>
      </div>
      {/* min-h-0 让 flex 子项真正成为滚动容器，避免手机第一次竖滑失灵 */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        {children}
      </div>
      <div className="shrink-0">
        <TabBar />
      </div>
    </div>
  );
}
