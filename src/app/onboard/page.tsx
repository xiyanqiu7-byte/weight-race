"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { NumberPad } from "@/components/NumberPad";
import { useCouple } from "@/hooks/useCouple";
import { api } from "@/lib/api";
import { displayToKg, todayISO, type Unit } from "@/lib/units";

export default function OnboardPage() {
  const router = useRouter();
  const { session, bundle, unit, refresh, loading } = useCouple();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [startDate, setStartDate] = useState(todayISO());
  const [startWeightDisplay, setStartWeightDisplay] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) router.replace("/enter");
  }, [loading, session, router]);

  if (!session) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-muted">
        加载中…
      </main>
    );
  }

  const me = bundle?.profiles.find((p) => p.id === session.profileId);

  async function saveStart(weightDisplay: number) {
    setStartWeightDisplay(weightDisplay);
    setStep(2);
  }

  async function saveDate(e: FormEvent) {
    e.preventDefault();
    setStep(3);
  }

  async function finish(currentDisplay: number | null, skip = false) {
    if (!session || startWeightDisplay == null) return;
    setBusy(true);
    setError(null);
    try {
      const startKg = displayToKg(startWeightDisplay, unit);
      await api.updateProfile(session.profileId, {
        start_weight_kg: startKg,
        start_date: startDate,
      });
      if (!skip && currentDisplay != null) {
        const currentKg = displayToKg(currentDisplay, unit);
        await api.upsertWeighIn(
          session.coupleId,
          session.profileId,
          todayISO(),
          currentKg,
        );
      }
      await refresh();
      router.replace("/battle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col px-5 py-8">
      <header className="mb-6">
        <p className="text-[12px] font-semibold text-muted">
          首次引导 · {session.nickname}
        </p>
        <h1 className="mt-2 text-[26px] font-bold tracking-tight">
          录入比赛起点
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          进度按「起始体重 − 当前体重」计算。已经减了一段也没关系，起点填比赛开始那天的体重即可。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                step === n ? "bg-moss text-ink" : "bg-sand text-muted"
              }`}
            >
              {n === 1 ? "起始体重" : n === 2 ? "开始日期" : "当前体重"}
            </span>
          ))}
        </div>
      </header>

      {step === 1 && (
        <NumberPad
          unit={unit}
          onSubmit={saveStart}
          submitLabel={`下一步（${unit === "jin" ? "斤" : "kg"}）`}
        />
      )}

      {step === 2 && (
        <form onSubmit={saveDate} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-xs">
            比赛开始日期
            <input
              type="date"
              className="rounded-[20px] bg-cream px-4 py-3.5 text-[15px] font-semibold shadow-[0_8px_28px_rgba(26,26,26,0.07)] outline-none"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
          <p className="text-[10px] text-muted">
            起始体重已记：{startWeightDisplay} {unit === "jin" ? "斤" : "kg"}
            {me?.goal_kg ? ` · 目标减重 ${me.goal_kg} kg` : ""}
          </p>
          <button type="submit" className="pixel-btn pixel-btn-primary py-3">
            下一步
          </button>
          <button
            type="button"
            className="pixel-btn py-2 text-xs"
            onClick={() => setStep(1)}
          >
            返回改体重
          </button>
        </form>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted">
            选填：现在的体重（填了主页立刻有进度）。也可以跳过，稍后再在「记录」页补。
          </p>
          <NumberPad
            unit={unit as Unit}
            onSubmit={(v) => void finish(v)}
            submitLabel={busy ? "保存中…" : "完成并进入对战"}
          />
          <button
            type="button"
            className="pixel-btn py-3 text-xs"
            disabled={busy}
            onClick={() => void finish(null, true)}
          >
            跳过，稍后再记
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 pixel-border bg-brick/10 px-3 py-2 text-xs text-brick">
          {error}
        </p>
      )}
    </main>
  );
}
