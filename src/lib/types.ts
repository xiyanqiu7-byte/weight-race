export type Slot = "a" | "b" | "c" | "d";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type Intensity = "none" | "light" | "medium" | "high";


export interface Couple {
  id: string;
  passphrase_hash: string;
  created_at: string;
}

export interface Profile {
  id: string;
  couple_id: string;
  slot: Slot;
  nickname: string;
  start_weight_kg: number | null;
  start_date: string | null;
  goal_kg: number;
  created_at: string;
  updated_at: string;
}

export interface WeighIn {
  id: string;
  couple_id: string;
  profile_id: string;
  logged_on: string;
  weight_kg: number;
  created_at: string;
}

export interface MealLog {
  id: string;
  couple_id: string;
  profile_id: string;
  logged_on: string;
  meal: MealType;
  healthy: boolean;
  created_at: string;
}

export interface Workout {
  id: string;
  couple_id: string;
  profile_id: string;
  logged_on: string;
  intensity: Intensity;
  created_at: string;
}

export interface Poke {
  id: string;
  couple_id: string;
  from_profile_id: string;
  to_profile_id: string;
  emoji: string;
  created_at: string;
}

/** 排便打卡：happened=true 有出货，false 今天没啦 */
export interface BowelLog {
  id: string;
  couple_id: string;
  profile_id: string;
  logged_on: string;
  happened: boolean;
  created_at: string;
}

export interface Session {
  coupleId: string;
  profileId: string;
  slot: Slot;
  nickname: string;
}

export interface CoupleBundle {
  couple: Couple;
  profiles: Profile[];
  weighIns: WeighIn[];
  mealLogs: MealLog[];
  workouts: Workout[];
  pokes: Poke[];
  bowelLogs: BowelLog[];
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
};

export const INTENSITY_LABELS: Record<Intensity, string> = {
  none: "躺平",
  light: "轻度",
  medium: "中度",
  high: "高强度",
};

export const SLOT_OPTIONS: Slot[] = ["a", "b", "c", "d"];

export const SLOT_META: Record<
  Slot,
  {
    label: string;
    color: string;
    colorVar: string;
    avatarSrc: string;
    avatarBg: string;
  }
> = {
  a: {
    label: "头像1",
    color: "#ffd541",
    colorVar: "var(--color-moss)",
    avatarSrc: "/avatars/avatar-a.png?v=4",
    avatarBg: "#8280fc",
  },
  b: {
    label: "头像2",
    color: "#ff8b7b",
    colorVar: "var(--color-brick)",
    avatarSrc: "/avatars/avatar-b.png?v=4",
    avatarBg: "#5ce2ff",
  },
  c: {
    label: "头像3",
    color: "#7c9cff",
    colorVar: "var(--color-moss)",
    avatarSrc: "/avatars/avatar-c.png?v=4",
    avatarBg: "#fed73e",
  },
  d: {
    label: "头像4",
    color: "#e879f9",
    colorVar: "var(--color-brick)",
    avatarSrc: "/avatars/avatar-d.png?v=4",
    avatarBg: "#fb5bb5",
  },
};

export const DEFAULT_GOAL_KG = 5;
export const POKE_EMOJIS = ["👀", "🔥", "😤", "💪", "🐔", "🧋"] as const;
