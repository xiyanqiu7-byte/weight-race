import type {
  BowelLog,
  CoupleBundle,
  Intensity,
  MealLog,
  Profile,
  WeighIn,
  Workout,
} from "./types";
import { lostKg } from "./units";

export function getProfile(bundle: CoupleBundle, profileId: string) {
  return bundle.profiles.find((p) => p.id === profileId);
}

export function getOthers(bundle: CoupleBundle, myProfileId: string) {
  return bundle.profiles.filter((p) => p.id !== myProfileId);
}

/** @deprecated 用 getOthers；保留兼容 */
export function getPartner(bundle: CoupleBundle, myProfileId: string) {
  return getOthers(bundle, myProfileId)[0];
}

export function latestWeight(
  weighIns: WeighIn[],
  profileId: string,
): number | null {
  const list = weighIns
    .filter((w) => w.profile_id === profileId)
    .sort((a, b) => b.logged_on.localeCompare(a.logged_on));
  return list[0]?.weight_kg ?? null;
}

export function weightOnDate(
  weighIns: WeighIn[],
  profileId: string,
  date: string,
): number | null {
  return (
    weighIns.find((w) => w.profile_id === profileId && w.logged_on === date)
      ?.weight_kg ?? null
  );
}

export function mealsOnDate(
  meals: MealLog[],
  profileId: string,
  date: string,
): MealLog[] {
  return meals.filter((m) => m.profile_id === profileId && m.logged_on === date);
}

export function workoutOnDate(
  workouts: Workout[],
  profileId: string,
  date: string,
): Intensity | null {
  return (
    workouts.find((w) => w.profile_id === profileId && w.logged_on === date)
      ?.intensity ?? null
  );
}

/** null = 未打卡；true/false = 当天是否有排便 */
export function bowelOnDate(
  bowelLogs: BowelLog[],
  profileId: string,
  date: string,
): boolean | null {
  const row = bowelLogs.find(
    (b) => b.profile_id === profileId && b.logged_on === date,
  );
  return row ? row.happened : null;
}

export function hasDebuff(
  meals: MealLog[],
  profileId: string,
  date: string,
): boolean {
  return mealsOnDate(meals, profileId, date).some((m) => !m.healthy);
}

export function hasBuff(
  workouts: Workout[],
  profileId: string,
  date: string,
): boolean {
  const i = workoutOnDate(workouts, profileId, date);
  return i === "light" || i === "medium" || i === "high";
}

export function milestonesReached(lost: number): number[] {
  const marks = [1, 2.5, 4]; // kg ≈ 2/5/8 斤
  return marks.filter((m) => lost >= m);
}

export function streakDays(weighIns: WeighIn[], profileId: string): number {
  const days = new Set(
    weighIns.filter((w) => w.profile_id === profileId).map((w) => w.logged_on),
  );
  if (days.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${d}`;
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function weekRange(anchor = new Date()): { start: string; end: string } {
  const day = anchor.getDay(); // 0 Sun
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - ((day + 6) % 7)); // Monday
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };
  return { start: fmt(start), end: fmt(end) };
}

export function inRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

/** 本周减重：周内最新体重 vs 周初基线（上周最后一次 / 起始体重 / 本周最早一次） */
export function weekLostKg(
  profile: Profile,
  weighIns: WeighIn[],
  start: string,
  end: string,
): number {
  const mine = weighIns
    .filter((w) => w.profile_id === profile.id)
    .sort((a, b) => a.logged_on.localeCompare(b.logged_on));
  const inWeek = mine.filter((w) => inRange(w.logged_on, start, end));
  if (inWeek.length === 0) return 0;

  const latest = inWeek[inWeek.length - 1].weight_kg;
  const before = mine.filter((w) => w.logged_on < start);
  let baseline: number | null = null;
  if (before.length > 0) {
    baseline = before[before.length - 1].weight_kg;
  } else if (
    profile.start_weight_kg != null &&
    (!profile.start_date || profile.start_date <= end)
  ) {
    baseline = profile.start_weight_kg;
  } else if (inWeek.length >= 2) {
    baseline = inWeek[0].weight_kg;
  }

  if (baseline == null) return 0;
  return Math.max(0, baseline - latest);
}

export function profileLost(profile: Profile, weighIns: WeighIn[]): number {
  return lostKg(profile.start_weight_kg, latestWeight(weighIns, profile.id));
}

export function daysSince(startDate: string | null): number {
  if (!startDate) return 0;
  const start = new Date(startDate + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000) + 1);
}
