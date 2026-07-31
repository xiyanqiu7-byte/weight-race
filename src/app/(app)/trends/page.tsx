"use client";

import { useMemo } from "react";
import { useCouple } from "@/hooks/useCouple";
import { playerColor } from "@/lib/player-color";
import { formatWeight, kgToDisplay } from "@/lib/units";

export default function TrendsPage() {
  const { session, bundle, unit } = useCouple();

  const chart = useMemo(() => {
    if (!bundle) return null;
    const profiles = [...bundle.profiles].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    const dates = Array.from(
      new Set(bundle.weighIns.map((w) => w.logged_on)),
    ).sort();

    // 纵轴改为「已减重量」：大家从 0 起算，越高减得越多
    const series = profiles.map((p) => {
      const mine = bundle.weighIns
        .filter((w) => w.profile_id === p.id)
        .sort((a, b) => a.logged_on.localeCompare(b.logged_on));
      const baseline =
        p.start_weight_kg != null ? p.start_weight_kg : (mine[0]?.weight_kg ?? null);

      const points = dates.map((d) => {
        const w = mine.find((x) => x.logged_on === d);
        if (!w || baseline == null) return null;
        const lostKg = baseline - w.weight_kg;
        return kgToDisplay(lostKg, unit);
      });
      return { profile: p, points };
    });

    const allVals = series.flatMap((s) =>
      s.points.filter((v): v is number => v != null),
    );
    const rawMin = allVals.length ? Math.min(...allVals, 0) : 0;
    const rawMax = allVals.length ? Math.max(...allVals, 0) : 1;
    const padY = Math.max(0.2, (rawMax - rawMin) * 0.08);
    const min = rawMin - padY;
    const max = rawMax + padY;

    return { profiles, dates, series, min, max };
  }, [bundle, unit]);

  const calendar = useMemo(() => {
    if (!session || !bundle) return { cells: [], title: "" };
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const weighed = bundle.weighIns.some(
        (w) => w.profile_id === session.profileId && w.logged_on === key,
      );
      const indulged = bundle.mealLogs.some(
        (m) =>
          m.profile_id === session.profileId &&
          m.logged_on === key &&
          !m.healthy,
      );
      const trained = bundle.workouts.some(
        (w) =>
          w.profile_id === session.profileId &&
          w.logged_on === key &&
          w.intensity !== "none",
      );
      const pooped = (bundle.bowelLogs ?? []).some(
        (b) =>
          b.profile_id === session.profileId &&
          b.logged_on === key &&
          b.happened,
      );
      cells.push({ d, key, weighed, indulged, trained, pooped });
    }
    return {
      cells,
      title: `${year}年${month + 1}月`,
    };
  }, [session, bundle]);

  const stats = useMemo(() => {
    if (!session || !bundle) return null;
    const myMeals = bundle.mealLogs.filter(
      (m) => m.profile_id === session.profileId,
    );
    const myWorkouts = bundle.workouts.filter(
      (w) => w.profile_id === session.profileId,
    );
    return {
      indulge: myMeals.filter((m) => !m.healthy).length,
      healthy: myMeals.filter((m) => m.healthy).length,
      trainDays: myWorkouts.filter((w) => w.intensity !== "none").length,
      weighDays: new Set(
        bundle.weighIns
          .filter((w) => w.profile_id === session.profileId)
          .map((w) => w.logged_on),
      ).size,
    };
  }, [session, bundle]);

  if (!chart || !stats) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-muted">
        加载中…
      </main>
    );
  }

  const W = 320;
  const H = 160;
  const pad = 16;
  const unitLabel = unit === "jin" ? "斤" : "kg";

  function xAt(i: number, n: number) {
    if (n <= 1) return W / 2;
    return pad + (i * (W - pad * 2)) / (n - 1);
  }
  function yAt(v: number) {
    const t = (v - chart!.min) / (chart!.max - chart!.min || 1);
    return H - pad - t * (H - pad * 2);
  }

  const zeroY =
    chart.min <= 0 && chart.max >= 0 ? yAt(0) : null;

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-2 pb-5">
      <header className="px-1">
        <h1 className="text-[26px] font-bold tracking-tight">趋势</h1>
        <p className="mt-1 text-[13px] text-muted">
          减重对比 · 从 0 起算 · 越高减得越多 · {unitLabel}
        </p>
      </header>

      <section className="card-soft p-4">
        {chart.dates.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-muted">
            还没有体重数据，去「记录」页称一称吧
          </p>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
            {[0, 0.5, 1].map((t) => {
              const y = pad + t * (H - pad * 2);
              return (
                <line
                  key={t}
                  x1={pad}
                  x2={W - pad}
                  y1={y}
                  y2={y}
                  stroke="#ebe6df"
                  strokeWidth={2}
                />
              );
            })}
            {zeroY != null && (
              <line
                x1={pad}
                x2={W - pad}
                y1={zeroY}
                y2={zeroY}
                stroke="#cfc8be"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
            )}
            {chart.series.map(({ profile, points }) => {
              const color = playerColor(chart.profiles, profile.id);
              const segs: string[] = [];
              let prev: { x: number; y: number } | null = null;
              points.forEach((v, i) => {
                if (v == null) {
                  prev = null;
                  return;
                }
                const x = xAt(i, points.length);
                const y = yAt(v);
                if (prev) segs.push(`M${prev.x} ${prev.y} L${x} ${y}`);
                prev = { x, y };
              });
              return (
                <g key={profile.id}>
                  {segs.map((d, i) => (
                    <path
                      key={i}
                      d={d}
                      stroke={color}
                      strokeWidth={4}
                      strokeLinecap="round"
                      fill="none"
                    />
                  ))}
                  {points.map((v, i) =>
                    v == null ? null : (
                      <circle
                        key={i}
                        cx={xAt(i, points.length)}
                        cy={yAt(v)}
                        r={5}
                        fill={color}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ),
                  )}
                </g>
              );
            })}
          </svg>
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-[12px]">
          {chart.profiles.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5 font-medium">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: playerColor(chart.profiles, p.id) }}
              />
              {p.nickname}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted">
          虚线 = 起点 0（未减重）。例如减了 2{unitLabel} 会比减了 1{unitLabel}{" "}
          更高。
        </p>
      </section>

      <section className="card-dark p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold">训练日历</h2>
          <span className="text-[12px] text-white/55">{calendar.title}</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {calendar.cells.map((c) => (
            <div
              key={c.key}
              className={`relative flex aspect-square items-center justify-center rounded-full text-[11px] font-semibold ${
                c.weighed ? "bg-moss text-ink" : "text-white/45"
              }`}
              title={c.key}
            >
              {c.d}
              {c.trained && (
                <span
                  className="absolute -right-1 -top-1 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-white text-[8px] leading-none shadow-sm"
                  aria-label="有训练"
                >
                  💪
                </span>
              )}
              {c.pooped && (
                <span
                  className="absolute -bottom-1 -left-1 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-white text-[8px] leading-none shadow-sm"
                  aria-label="有排便"
                >
                  💩
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-white/45">
          黄底 = 已称重 · 右上 💪 = 有训练 · 左下 💩 = 顺畅出货
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {[
          ["称重天数", stats.weighDays],
          ["训练天数", stats.trainDays],
          ["健康餐", stats.healthy],
          ["放纵餐", stats.indulge],
        ].map(([label, value]) => (
          <div key={label as string} className="card-soft px-4 py-4">
            <div className="text-[12px] text-muted">{label}</div>
            <div className="mt-1 text-[26px] font-bold tracking-tight">
              {value}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
