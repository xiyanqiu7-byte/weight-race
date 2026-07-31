import type {
  BowelLog,
  Couple,
  CoupleBundle,
  Intensity,
  MealLog,
  MealType,
  Poke,
  Profile,
  Slot,
  WeighIn,
  Workout,
} from "./types";
import { DEFAULT_GOAL_KG } from "./types";

const DB_KEY = "weight-race-local-db";

interface LocalDb {
  couples: Couple[];
  profiles: Profile[];
  weighIns: WeighIn[];
  mealLogs: MealLog[];
  workouts: Workout[];
  pokes: Poke[];
  bowelLogs: BowelLog[];
}

function emptyDb(): LocalDb {
  return {
    couples: [],
    profiles: [],
    weighIns: [],
    mealLogs: [],
    workouts: [],
    pokes: [],
    bowelLogs: [],
  };
}

function read(): LocalDb {
  if (typeof window === "undefined") return emptyDb();
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return emptyDb();
    return { ...emptyDb(), ...JSON.parse(raw) } as LocalDb;
  } catch {
    return emptyDb();
  }
}

function write(db: LocalDb): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  window.dispatchEvent(new Event("weight-race-local-change"));
}

function uid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export const localApi = {
  async findOrJoinCouple(
    passphraseHash: string,
    slot: Slot,
    nickname: string,
  ): Promise<{ couple: Couple; profile: Profile }> {
    const db = read();
    let couple = db.couples.find((c) => c.passphrase_hash === passphraseHash);
    if (!couple) {
      couple = {
        id: uid(),
        passphrase_hash: passphraseHash,
        created_at: now(),
      };
      db.couples.push(couple);
    }

    // 同房间 + 同昵称 → 复用原档案（多端登录）；否则新建
    const existing = db.profiles
      .filter((p) => p.couple_id === couple.id && p.nickname === nickname)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];

    if (existing) {
      existing.slot = slot;
      existing.updated_at = now();
      write(db);
      return { couple, profile: existing };
    }

    const profile: Profile = {
      id: uid(),
      couple_id: couple.id,
      slot,
      nickname,
      start_weight_kg: null,
      start_date: null,
      goal_kg: DEFAULT_GOAL_KG,
      created_at: now(),
      updated_at: now(),
    };
    db.profiles.push(profile);
    write(db);
    return { couple, profile };
  },

  async fetchBundle(coupleId: string): Promise<CoupleBundle> {
    const db = read();
    const couple = db.couples.find((c) => c.id === coupleId);
    if (!couple) throw new Error("房间不存在");
    return {
      couple,
      profiles: db.profiles.filter((p) => p.couple_id === coupleId),
      weighIns: db.weighIns.filter((w) => w.couple_id === coupleId),
      mealLogs: db.mealLogs.filter((m) => m.couple_id === coupleId),
      workouts: db.workouts.filter((w) => w.couple_id === coupleId),
      pokes: db.pokes
        .filter((p) => p.couple_id === coupleId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 20),
      bowelLogs: db.bowelLogs.filter((b) => b.couple_id === coupleId),
    };
  },

  async updateProfile(
    profileId: string,
    patch: Partial<
      Pick<Profile, "nickname" | "start_weight_kg" | "start_date" | "goal_kg">
    >,
  ): Promise<Profile> {
    const db = read();
    const profile = db.profiles.find((p) => p.id === profileId);
    if (!profile) throw new Error("选手不存在");
    Object.assign(profile, patch, { updated_at: now() });
    write(db);
    return profile;
  },

  /** 退出房间：删除自己的档案与相关记录；无人则删掉空房间 */
  async leaveRoom(coupleId: string, profileId: string): Promise<void> {
    const db = read();
    db.weighIns = db.weighIns.filter((w) => w.profile_id !== profileId);
    db.mealLogs = db.mealLogs.filter((m) => m.profile_id !== profileId);
    db.workouts = db.workouts.filter((w) => w.profile_id !== profileId);
    db.bowelLogs = (db.bowelLogs ?? []).filter((b) => b.profile_id !== profileId);
    db.pokes = db.pokes.filter(
      (p) => p.from_profile_id !== profileId && p.to_profile_id !== profileId,
    );
    db.profiles = db.profiles.filter((p) => p.id !== profileId);
    const remaining = db.profiles.some((p) => p.couple_id === coupleId);
    if (!remaining) {
      db.couples = db.couples.filter((c) => c.id !== coupleId);
      db.weighIns = db.weighIns.filter((w) => w.couple_id !== coupleId);
      db.mealLogs = db.mealLogs.filter((m) => m.couple_id !== coupleId);
      db.workouts = db.workouts.filter((w) => w.couple_id !== coupleId);
      db.bowelLogs = (db.bowelLogs ?? []).filter((b) => b.couple_id !== coupleId);
      db.pokes = db.pokes.filter((p) => p.couple_id !== coupleId);
    }
    write(db);
  },

  async upsertWeighIn(
    coupleId: string,
    profileId: string,
    loggedOn: string,
    weightKg: number,
  ): Promise<WeighIn> {
    const db = read();
    const existing = db.weighIns.find(
      (w) => w.profile_id === profileId && w.logged_on === loggedOn,
    );
    if (existing) {
      existing.weight_kg = weightKg;
      write(db);
      return existing;
    }
    const row: WeighIn = {
      id: uid(),
      couple_id: coupleId,
      profile_id: profileId,
      logged_on: loggedOn,
      weight_kg: weightKg,
      created_at: now(),
    };
    db.weighIns.push(row);
    write(db);
    return row;
  },

  async upsertMeal(
    coupleId: string,
    profileId: string,
    loggedOn: string,
    meal: MealType,
    healthy: boolean,
  ): Promise<MealLog> {
    const db = read();
    const existing = db.mealLogs.find(
      (m) =>
        m.profile_id === profileId &&
        m.logged_on === loggedOn &&
        m.meal === meal,
    );
    if (existing) {
      existing.healthy = healthy;
      write(db);
      return existing;
    }
    const row: MealLog = {
      id: uid(),
      couple_id: coupleId,
      profile_id: profileId,
      logged_on: loggedOn,
      meal,
      healthy,
      created_at: now(),
    };
    db.mealLogs.push(row);
    write(db);
    return row;
  },

  async upsertWorkout(
    coupleId: string,
    profileId: string,
    loggedOn: string,
    intensity: Intensity,
  ): Promise<Workout> {
    const db = read();
    const existing = db.workouts.find(
      (w) => w.profile_id === profileId && w.logged_on === loggedOn,
    );
    if (existing) {
      existing.intensity = intensity;
      write(db);
      return existing;
    }
    const row: Workout = {
      id: uid(),
      couple_id: coupleId,
      profile_id: profileId,
      logged_on: loggedOn,
      intensity,
      created_at: now(),
    };
    db.workouts.push(row);
    write(db);
    return row;
  },

  async sendPoke(
    coupleId: string,
    fromId: string,
    toId: string,
    emoji: string,
  ): Promise<Poke> {
    const db = read();
    const row: Poke = {
      id: uid(),
      couple_id: coupleId,
      from_profile_id: fromId,
      to_profile_id: toId,
      emoji,
      created_at: now(),
    };
    db.pokes.unshift(row);
    write(db);
    return row;
  },

  async upsertBowel(
    coupleId: string,
    profileId: string,
    loggedOn: string,
    happened: boolean,
  ): Promise<BowelLog> {
    const db = read();
    const existing = db.bowelLogs.find(
      (b) => b.profile_id === profileId && b.logged_on === loggedOn,
    );
    if (existing) {
      existing.happened = happened;
      write(db);
      return existing;
    }
    const row: BowelLog = {
      id: uid(),
      couple_id: coupleId,
      profile_id: profileId,
      logged_on: loggedOn,
      happened,
      created_at: now(),
    };
    db.bowelLogs.push(row);
    write(db);
    return row;
  },

  subscribe(coupleId: string, onChange: () => void): () => void {
    const handler = () => onChange();
    window.addEventListener("weight-race-local-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("weight-race-local-change", handler);
      window.removeEventListener("storage", handler);
    };
  },
};
