"use client";

import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { useCouple } from "@/hooks/useCouple";
import {
  inRange,
  profileLost,
  streakDays,
  weekLostKg,
  weekRange,
} from "@/lib/stats";
import { formatWeight } from "@/lib/units";
import { playerColor } from "@/lib/player-color";

export default function ReportPage() {
  const { session, bundle, unit } = useCouple();
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const report = useMemo(() => {
    if (!bundle || !session) return null;
    const { start, end } = weekRange();
    const profiles = [...bundle.profiles].sort((a, b) =>
      a.slot.localeCompare(b.slot),
    );

    const rows = profiles.map((p) => {
      const weekMeals = bundle.mealLogs.filter(
        (m) => m.profile_id === p.id && inRange(m.logged_on, start, end),
      );
      const weekWork = bundle.workouts.filter(
        (w) =>
          w.profile_id === p.id &&
          inRange(w.logged_on, start, end) &&
          w.intensity !== "none",
      );

      return {
        profile: p,
        totalLost: profileLost(p, bundle.weighIns),
        weekLost: weekLostKg(p, bundle.weighIns, start, end),
        indulge: weekMeals.filter((m) => !m.healthy).length,
        train: weekWork.length,
        streak: streakDays(bundle.weighIns, p.id),
      };
    });

    const winner = (() => {
      const best = Math.max(0, ...rows.map((r) => r.weekLost));
      if (best <= 0) return null;
      const tops = rows.filter((r) => r.weekLost === best);
      return tops.length === 1 ? tops[0] : null;
    })();

    return { start, end, rows, winner };
  }, [bundle, session]);

  async function saveImage() {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `减脂周报-${report?.start ?? "week"}.png`;
      a.click();
      setMsg("已保存图片");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 1800);
    }
  }

  if (!report) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-muted">
        加载中…
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-2 pb-5">
      <header className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">本周战报</h1>
          <p className="mt-1 text-[13px] text-muted">
            {report.start} ~ {report.end}
          </p>
        </div>
        <button
          type="button"
          className="pixel-btn pixel-btn-accent px-4 py-2.5 text-[12px]"
          onClick={() => void saveImage()}
          disabled={saving}
        >
          {saving ? "生成中…" : "保存图片"}
        </button>
      </header>

      <div ref={cardRef} className="card-soft p-5" style={{ background: "#ffffff" }}>
        <div className="border-b border-line pb-4 text-center">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-muted">
            WEEKLY REPORT
          </p>
          <h2 className="mt-2 text-[22px] font-bold">减脂周报</h2>
          <p className="mt-1 text-[12px] text-muted">
            {report.start} — {report.end}
          </p>
        </div>

        <div className="mt-4 rounded-[20px] bg-sand px-4 py-3 text-center text-[14px] font-semibold">
          {report.winner
            ? `本周减重王：${report.winner.profile.nickname}（${formatWeight(report.winner.weekLost, unit)}）`
            : report.rows.some((r) => r.weekLost > 0)
              ? "本周打平，下周继续"
              : report.rows.length < 2
                ? "记好体重后，这里会出现本周成绩"
                : "本周还没有减重成绩，继续加油"}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {report.rows.map((row) => (
            <div key={row.profile.id} className="rounded-[22px] bg-sand/80 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{
                    background: playerColor(
                      report.rows.map((r) => r.profile),
                      row.profile.id,
                    ),
                  }}
                />
                <span className="text-[15px] font-bold">
                  {row.profile.nickname}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px] text-muted">
                <div>本周减重 {formatWeight(row.weekLost, unit)}</div>
                <div>累计减重 {formatWeight(row.totalLost, unit)}</div>
                <div>放纵 {row.indulge} 次</div>
                <div>训练 {row.train} 天</div>
                <div className="col-span-2">连续打卡 {row.streak} 天</div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-[11px] text-muted">
          诚实记录 · 一起变轻
        </p>
      </div>

      {msg && (
        <div className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[12px] font-medium text-white shadow-lg">
          {msg}
        </div>
      )}
    </main>
  );
}
