"use client";

import { useCouple } from "@/hooks/useCouple";

export function ModeBanner() {
  const { cloud } = useCouple();
  if (cloud) return null;
  return (
    <div className="mx-4 mt-3 rounded-[20px] bg-sand px-4 py-2.5 text-[11px] leading-relaxed text-muted">
      本地模式：数据只在这台设备。双人同步请看{" "}
      <span className="font-semibold text-ink">DEPLOY.md</span>
    </div>
  );
}
