"use client";

import { useMemo, useState } from "react";
import { NumberPad } from "@/components/NumberPad";
import { useCouple } from "@/hooks/useCouple";
import { api } from "@/lib/api";
import { mealsOnDate, workoutOnDate, weightOnDate } from "@/lib/stats";
import {
  INTENSITY_LABELS,
  MEAL_LABELS,
  type Intensity,
  type MealType,
} from "@/lib/types";
import { displayToKg, formatWeight, kgToDisplay, todayISO } from "@/lib/units";

const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const INTENSITIES: Intensity[] = ["none", "light", "medium", "high"];

export default function RecordPage() {
  const { session, bundle, unit, refresh } = useCouple();
  const [date, setDate] = useState(todayISO());
  const [mealPick, setMealPick] = useState<MealType | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const snapshot = useMemo(() => {
    if (!session || !bundle) return null;
    const pid = session.profileId;
    return {
      weight: weightOnDate(bundle.weighIns, pid, date),
      meals: mealsOnDate(bundle.mealLogs, pid, date),
      intensity: workoutOnDate(bundle.workouts, pid, date),
    };
  }, [session, bundle, date]);

  async function saveWeight(display: number) {
    if (!session) return;
    setBusy(true);
    try {
      await api.upsertWeighIn(
        session.coupleId,
        session.profileId,
        date,
        displayToKg(display, unit),
      );
      await refresh();
      flash("体重已保存");
    } catch (e) {
      flash(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function saveMeal(meal: MealType, healthy: boolean) {
    if (!session) return;
    setBusy(true);
    try {
      await api.upsertMeal(
        session.coupleId,
        session.profileId,
        date,
        meal,
        healthy,
      );
      await refresh();
      setMealPick(null);
      flash(healthy ? "记下健康餐 ✓" : "记下放纵餐…诚实可嘉");
    } catch (e) {
      flash(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function saveWorkout(intensity: Intensity) {
    if (!session) return;
    setBusy(true);
    try {
      await api.upsertWorkout(
        session.coupleId,
        session.profileId,
        date,
        intensity,
      );
      await refresh();
      flash(`训练：${INTENSITY_LABELS[intensity]}`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 1600);
  }

  if (!session || !snapshot) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-muted">
        加载中…
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 py-2 pb-5">
      <header className="flex items-center justify-between gap-3 px-1">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">今日记录</h1>
          <p className="mt-1 text-[13px] text-muted">目标：3 秒记完</p>
        </div>
        <label className="text-[11px] font-medium text-muted">
          日期
          <input
            type="date"
            className="ml-2 rounded-full bg-cream px-3 py-2 text-[12px] font-semibold text-ink shadow-[0_8px_28px_rgba(26,26,26,0.07)] outline-none"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between px-1">
          <h2 className="text-[15px] font-bold">体重</h2>
          <span className="text-[12px] text-muted">
            {snapshot.weight != null
              ? `已记 ${formatWeight(snapshot.weight, unit)}`
              : "未记录"}
          </span>
        </div>
        <NumberPad
          key={`${date}-${snapshot.weight ?? "new"}-${unit}`}
          unit={unit}
          initial={
            snapshot.weight != null
              ? String(kgToDisplay(snapshot.weight, unit))
              : ""
          }
          onSubmit={(v) => void saveWeight(v)}
          submitLabel={busy ? "保存中…" : "保存体重"}
        />
      </section>

      <section className="card-soft p-4">
        <h2 className="mb-3 text-[15px] font-bold">饮食</h2>
        <div className="grid grid-cols-2 gap-2">
          {MEALS.map((meal) => {
            const log = snapshot.meals.find((m) => m.meal === meal);
            return (
              <button
                key={meal}
                type="button"
                className="flex flex-col items-start gap-1 rounded-[20px] bg-sand px-4 py-3.5 text-left"
                onClick={() => setMealPick(meal)}
              >
                <span className="text-[13px] font-semibold">
                  {MEAL_LABELS[meal]}
                </span>
                <span className="text-[11px] text-muted">
                  {log == null ? "未点" : log.healthy ? "健康 ✓" : "放纵了"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card-soft p-4">
        <h2 className="mb-3 text-[15px] font-bold">训练</h2>
        <div className="grid grid-cols-4 gap-2">
          {INTENSITIES.map((i) => (
            <button
              key={i}
              type="button"
              className={`rounded-full py-3 text-[11px] font-semibold ${
                snapshot.intensity === i
                  ? "bg-ink text-white"
                  : "bg-sand text-ink"
              }`}
              onClick={() => void saveWorkout(i)}
            >
              {INTENSITY_LABELS[i]}
            </button>
          ))}
        </div>
      </section>

      {mealPick && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-4 backdrop-blur-[2px]">
          <div className="card-soft w-full max-w-md p-5 pop-in">
            <p className="mb-4 text-[16px] font-bold">
              {MEAL_LABELS[mealPick]} 怎么样？
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="pixel-btn pixel-btn-primary py-4"
                onClick={() => void saveMeal(mealPick, true)}
              >
                健康
              </button>
              <button
                type="button"
                className="pixel-btn pixel-btn-accent py-4"
                onClick={() => void saveMeal(mealPick, false)}
              >
                放纵了
              </button>
            </div>
            <button
              type="button"
              className="mt-3 w-full py-2 text-[13px] text-muted"
              onClick={() => setMealPick(null)}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {msg && (
        <div className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[12px] font-medium text-white shadow-lg">
          {msg}
        </div>
      )}
    </main>
  );
}
