"use client";

import { useMemo } from "react";
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

  const report = useMemo(() => {
    if (!bundle || !session) return null;
    const { start, end } = weekRange();

    const rows = [...bundle.profiles]
      .map((p) => {
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
      })
      .sort((a, b) => {
        if (b.weekLost !== a.weekLost) return b.weekLost - a.weekLost;
        return b.totalLost - a.totalLost;
      });

    const winner = (() => {
      const best = Math.max(0, ...rows.map((r) => r.weekLost));
      if (best <= 0) return null;
      const tops = rows.filter((r) => r.weekLost === best);
      return tops.length === 1 ? tops[0] : null;
    })();

    return { start, end, rows, winner };
  }, [bundle, session]);

  if (!report) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-muted">
        加载中…
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-2 pb-5">
      <header className="px-1">
        <h1 className="text-[26px] font-bold tracking-tight">本周战报</h1>
        <p className="mt-1 text-[13px] text-muted">
          {report.start} ~ {report.end} · 按本周减重排序 · 可截图保存
        </p>
      </header>

      <div className="card-soft p-5" style={{ background: "#ffffff" }}>
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
          {report.rows.map((row, i) => (
            <div key={row.profile.id} className="rounded-[22px] bg-sand/80 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[12px] font-semibold text-muted">
                  #{i + 1}
                </span>
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
                  {row.profile.id === session?.profileId ? "（我）" : ""}
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
    </main>
  );
}
