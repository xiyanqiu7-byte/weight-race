import type {
  CoupleBundle,
  Intensity,
  MealType,
  Profile,
  Slot,
} from "./types";

export const BACKUP_FORMAT = "weight-race-backup" as const;
export const BACKUP_VERSION = 1 as const;

export interface PersonalBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  profile: {
    nickname: string;
    slot: Slot;
    start_weight_kg: number | null;
    start_date: string | null;
    goal_kg: number;
  };
  weighIns: Array<{ logged_on: string; weight_kg: number }>;
  mealLogs: Array<{
    logged_on: string;
    meal: MealType;
    healthy: boolean;
  }>;
  workouts: Array<{ logged_on: string; intensity: Intensity }>;
  bowelLogs: Array<{ logged_on: string; happened: boolean }>;
}

const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const INTENSITIES: Intensity[] = ["none", "light", "medium", "high"];
const SLOTS: Slot[] = ["a", "b", "c", "d"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v != null && !Array.isArray(v);
}

function isDateKey(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/** 导出「当前用户」在本房间的档案 + 打卡（不含挑衅、不含其他人） */
export function buildPersonalBackup(
  bundle: CoupleBundle,
  profileId: string,
): PersonalBackup {
  const profile = bundle.profiles.find((p) => p.id === profileId);
  if (!profile) throw new Error("找不到当前选手档案");

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    profile: {
      nickname: profile.nickname,
      slot: profile.slot,
      start_weight_kg: profile.start_weight_kg,
      start_date: profile.start_date,
      goal_kg: profile.goal_kg,
    },
    weighIns: bundle.weighIns
      .filter((w) => w.profile_id === profileId)
      .map((w) => ({ logged_on: w.logged_on, weight_kg: w.weight_kg }))
      .sort((a, b) => a.logged_on.localeCompare(b.logged_on)),
    mealLogs: bundle.mealLogs
      .filter((m) => m.profile_id === profileId)
      .map((m) => ({
        logged_on: m.logged_on,
        meal: m.meal,
        healthy: m.healthy,
      }))
      .sort((a, b) =>
        `${a.logged_on}-${a.meal}`.localeCompare(`${b.logged_on}-${b.meal}`),
      ),
    workouts: bundle.workouts
      .filter((w) => w.profile_id === profileId)
      .map((w) => ({ logged_on: w.logged_on, intensity: w.intensity }))
      .sort((a, b) => a.logged_on.localeCompare(b.logged_on)),
    bowelLogs: (bundle.bowelLogs ?? [])
      .filter((b) => b.profile_id === profileId)
      .map((b) => ({ logged_on: b.logged_on, happened: b.happened }))
      .sort((a, b) => a.logged_on.localeCompare(b.logged_on)),
  };
}

export function parsePersonalBackup(raw: unknown): PersonalBackup {
  if (!isRecord(raw)) throw new Error("不是有效的 JSON 对象");
  if (raw.format !== BACKUP_FORMAT) {
    throw new Error("不是减脂对战备份文件（format 不对）");
  }
  if (raw.version !== BACKUP_VERSION) {
    throw new Error(`暂不支持此备份版本：${String(raw.version)}`);
  }
  if (!isRecord(raw.profile)) throw new Error("备份缺少 profile");

  const p = raw.profile;
  const nickname = typeof p.nickname === "string" ? p.nickname.trim() : "";
  if (!nickname) throw new Error("备份里的昵称为空");
  if (typeof p.slot !== "string" || !SLOTS.includes(p.slot as Slot)) {
    throw new Error("备份里的头像 slot 无效");
  }
  const start_weight_kg =
    p.start_weight_kg == null
      ? null
      : typeof p.start_weight_kg === "number"
        ? p.start_weight_kg
        : Number(p.start_weight_kg);
  if (start_weight_kg != null && !Number.isFinite(start_weight_kg)) {
    throw new Error("起始体重无效");
  }
  const start_date =
    p.start_date == null || p.start_date === ""
      ? null
      : isDateKey(p.start_date)
        ? p.start_date
        : null;
  const goal_kg =
    typeof p.goal_kg === "number" ? p.goal_kg : Number(p.goal_kg ?? 5);
  if (!Number.isFinite(goal_kg)) throw new Error("目标减重无效");

  if (!Array.isArray(raw.weighIns)) throw new Error("备份缺少 weighIns");
  if (!Array.isArray(raw.mealLogs)) throw new Error("备份缺少 mealLogs");
  if (!Array.isArray(raw.workouts)) throw new Error("备份缺少 workouts");
  const bowelRaw = Array.isArray(raw.bowelLogs) ? raw.bowelLogs : [];

  const weighIns: PersonalBackup["weighIns"] = [];
  for (const row of raw.weighIns) {
    if (!isRecord(row) || !isDateKey(row.logged_on)) {
      throw new Error("体重记录格式有误");
    }
    const weight_kg =
      typeof row.weight_kg === "number" ? row.weight_kg : Number(row.weight_kg);
    if (!Number.isFinite(weight_kg)) throw new Error("体重数值无效");
    weighIns.push({ logged_on: row.logged_on, weight_kg });
  }

  const mealLogs: PersonalBackup["mealLogs"] = [];
  for (const row of raw.mealLogs) {
    if (!isRecord(row) || !isDateKey(row.logged_on)) {
      throw new Error("饮食记录格式有误");
    }
    if (typeof row.meal !== "string" || !MEALS.includes(row.meal as MealType)) {
      throw new Error("饮食类型无效");
    }
    if (typeof row.healthy !== "boolean") throw new Error("饮食 healthy 无效");
    mealLogs.push({
      logged_on: row.logged_on,
      meal: row.meal as MealType,
      healthy: row.healthy,
    });
  }

  const workouts: PersonalBackup["workouts"] = [];
  for (const row of raw.workouts) {
    if (!isRecord(row) || !isDateKey(row.logged_on)) {
      throw new Error("训练记录格式有误");
    }
    if (
      typeof row.intensity !== "string" ||
      !INTENSITIES.includes(row.intensity as Intensity)
    ) {
      throw new Error("训练强度无效");
    }
    workouts.push({
      logged_on: row.logged_on,
      intensity: row.intensity as Intensity,
    });
  }

  const bowelLogs: PersonalBackup["bowelLogs"] = [];
  for (const row of bowelRaw) {
    if (!isRecord(row) || !isDateKey(row.logged_on)) {
      throw new Error("排便记录格式有误");
    }
    if (typeof row.happened !== "boolean") throw new Error("排便 happened 无效");
    bowelLogs.push({ logged_on: row.logged_on, happened: row.happened });
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt:
      typeof raw.exportedAt === "string"
        ? raw.exportedAt
        : new Date().toISOString(),
    profile: {
      nickname,
      slot: p.slot as Slot,
      start_weight_kg,
      start_date,
      goal_kg,
    },
    weighIns,
    mealLogs,
    workouts,
    bowelLogs,
  };
}

export function backupFileName(profile: Pick<Profile, "nickname">): string {
  const safe = profile.nickname.replace(/[^\w\u4e00-\u9fff-]+/g, "_") || "player";
  const day = new Date().toISOString().slice(0, 10);
  return `weight-race-${safe}-${day}.json`;
}

export function summarizeBackup(b: PersonalBackup): string {
  return [
    `昵称 ${b.profile.nickname}`,
    `体重 ${b.weighIns.length} 条`,
    `饮食 ${b.mealLogs.length} 条`,
    `训练 ${b.workouts.length} 条`,
    `顺畅 ${b.bowelLogs.length} 条`,
  ].join(" · ");
}
