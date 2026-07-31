import { localApi } from "./local-db";
import { getSupabase, isCloudEnabled } from "./supabase";
import type {
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

type SbErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

/** 把 PostgREST / Postgres 错误转成可读中文（尤其是旧库未跑 migrate 时） */
function toJoinError(err: unknown): Error {
  const e = (err ?? {}) as SbErrorLike;
  const blob = [e.message, e.details, e.hint, e.code]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // 旧库 check (slot in ('a','b')) → 选头像 3/4 会踩这个
  if (
    blob.includes("profiles_slot_check") ||
    (blob.includes("slot") &&
      (blob.includes("check constraint") || blob.includes("violates check")))
  ) {
    return new Error(
      "云端数据库还不支持头像 3/4。请到 Supabase → SQL Editor 执行项目里的 supabase/migrate-multi.sql，然后再试。",
    );
  }

  // 旧库 unique(couple_id, slot)
  if (
    blob.includes("profiles_couple_id_slot") ||
    (blob.includes("couple_id") &&
      blob.includes("slot") &&
      (blob.includes("unique") || blob.includes("duplicate") || e.code === "23505"))
  ) {
    return new Error(
      "这个头像在房间里已被占用（旧版限制）。请换一个头像，或执行 supabase/migrate-multi.sql 升级数据库。",
    );
  }

  if (err instanceof Error && err.message) return err;
  if (typeof e.message === "string" && e.message.trim()) {
    return new Error(e.message);
  }
  return new Error("进入失败，请重试");
}

async function cloudFindOrJoin(
  passphraseHash: string,
  slot: Slot,
  nickname: string,
): Promise<{ couple: Couple; profile: Profile }> {
  const sb = getSupabase();

  try {
    let { data: couple, error } = await sb
      .from("couples")
      .select("*")
      .eq("passphrase_hash", passphraseHash)
      .maybeSingle();

    if (error) throw error;

    if (!couple) {
      const created = await sb
        .from("couples")
        .insert({ passphrase_hash: passphraseHash })
        .select("*")
        .single();
      if (created.error) {
        // 并发：另一人刚建好
        const again = await sb
          .from("couples")
          .select("*")
          .eq("passphrase_hash", passphraseHash)
          .single();
        if (again.error) throw again.error;
        couple = again.data;
      } else {
        couple = created.data;
      }
    }

    // 同房间 + 同昵称 → 视为同一人（多端登录复用），可更新头像
    const existing = await sb
      .from("profiles")
      .select("*")
      .eq("couple_id", couple.id)
      .eq("nickname", nickname)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existing.error) throw existing.error;

    if (existing.data) {
      if (existing.data.slot !== slot) {
        const updated = await sb
          .from("profiles")
          .update({ slot, updated_at: new Date().toISOString() })
          .eq("id", existing.data.id)
          .select("*")
          .single();
        if (updated.error) throw updated.error;
        return { couple: couple as Couple, profile: updated.data as Profile };
      }
      return { couple: couple as Couple, profile: existing.data as Profile };
    }

    const inserted = await sb
      .from("profiles")
      .insert({
        couple_id: couple.id,
        slot,
        nickname,
        goal_kg: DEFAULT_GOAL_KG,
      })
      .select("*")
      .single();
    if (inserted.error) throw inserted.error;

    return { couple: couple as Couple, profile: inserted.data as Profile };
  } catch (err) {
    throw toJoinError(err);
  }
}

async function cloudFetchBundle(coupleId: string): Promise<CoupleBundle> {
  const sb = getSupabase();
  const [coupleRes, profilesRes, weighRes, mealRes, workoutRes, pokeRes] =
    await Promise.all([
      sb.from("couples").select("*").eq("id", coupleId).single(),
      sb.from("profiles").select("*").eq("couple_id", coupleId),
      sb
        .from("weigh_ins")
        .select("*")
        .eq("couple_id", coupleId)
        .order("logged_on", { ascending: true }),
      sb.from("meal_logs").select("*").eq("couple_id", coupleId),
      sb.from("workouts").select("*").eq("couple_id", coupleId),
      sb
        .from("pokes")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  if (coupleRes.error) {
    const err = coupleRes.error as { code?: string; message?: string };
    if (err.code === "PGRST116") {
      throw new Error("房间不存在");
    }
    throw coupleRes.error;
  }
  if (profilesRes.error) throw profilesRes.error;
  if (weighRes.error) throw weighRes.error;
  if (mealRes.error) throw mealRes.error;
  if (workoutRes.error) throw workoutRes.error;
  if (pokeRes.error) throw pokeRes.error;

  return {
    couple: coupleRes.data as Couple,
    profiles: (profilesRes.data ?? []) as Profile[],
    weighIns: (weighRes.data ?? []) as WeighIn[],
    mealLogs: (mealRes.data ?? []) as MealLog[],
    workouts: (workoutRes.data ?? []) as Workout[],
    pokes: (pokeRes.data ?? []) as Poke[],
  };
}

export const api = {
  isCloud: isCloudEnabled,

  findOrJoinCouple(passphraseHash: string, slot: Slot, nickname: string) {
    return isCloudEnabled()
      ? cloudFindOrJoin(passphraseHash, slot, nickname)
      : localApi.findOrJoinCouple(passphraseHash, slot, nickname);
  },

  fetchBundle(coupleId: string) {
    return isCloudEnabled()
      ? cloudFetchBundle(coupleId)
      : localApi.fetchBundle(coupleId);
  },

  async updateProfile(
    profileId: string,
    patch: Partial<
      Pick<Profile, "nickname" | "start_weight_kg" | "start_date" | "goal_kg">
    >,
  ) {
    if (!isCloudEnabled()) return localApi.updateProfile(profileId, patch);
    const { data, error } = await getSupabase()
      .from("profiles")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", profileId)
      .select("*")
      .single();
    if (error) throw error;
    return data as Profile;
  },

  /** 退出房间：删掉自己的选手档案（体重/饮食/训练/挑衅随外键级联删除）；房间空了则删房间 */
  async leaveRoom(coupleId: string, profileId: string) {
    if (!isCloudEnabled()) return localApi.leaveRoom(coupleId, profileId);

    const sb = getSupabase();
    const { error: delErr } = await sb
      .from("profiles")
      .delete()
      .eq("id", profileId)
      .eq("couple_id", coupleId);
    if (delErr) throw delErr;

    const { data: left, error: leftErr } = await sb
      .from("profiles")
      .select("id")
      .eq("couple_id", coupleId)
      .limit(1);
    if (leftErr) throw leftErr;

    if (!left?.length) {
      const { error: coupleErr } = await sb
        .from("couples")
        .delete()
        .eq("id", coupleId);
      if (coupleErr) throw coupleErr;
    }
  },

  async upsertWeighIn(
    coupleId: string,
    profileId: string,
    loggedOn: string,
    weightKg: number,
  ) {
    if (!isCloudEnabled()) {
      return localApi.upsertWeighIn(coupleId, profileId, loggedOn, weightKg);
    }
    const { data, error } = await getSupabase()
      .from("weigh_ins")
      .upsert(
        {
          couple_id: coupleId,
          profile_id: profileId,
          logged_on: loggedOn,
          weight_kg: weightKg,
        },
        { onConflict: "profile_id,logged_on" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return data as WeighIn;
  },

  async upsertMeal(
    coupleId: string,
    profileId: string,
    loggedOn: string,
    meal: MealType,
    healthy: boolean,
  ) {
    if (!isCloudEnabled()) {
      return localApi.upsertMeal(coupleId, profileId, loggedOn, meal, healthy);
    }
    const { data, error } = await getSupabase()
      .from("meal_logs")
      .upsert(
        {
          couple_id: coupleId,
          profile_id: profileId,
          logged_on: loggedOn,
          meal,
          healthy,
        },
        { onConflict: "profile_id,logged_on,meal" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return data as MealLog;
  },

  async upsertWorkout(
    coupleId: string,
    profileId: string,
    loggedOn: string,
    intensity: Intensity,
  ) {
    if (!isCloudEnabled()) {
      return localApi.upsertWorkout(coupleId, profileId, loggedOn, intensity);
    }
    const { data, error } = await getSupabase()
      .from("workouts")
      .upsert(
        {
          couple_id: coupleId,
          profile_id: profileId,
          logged_on: loggedOn,
          intensity,
        },
        { onConflict: "profile_id,logged_on" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return data as Workout;
  },

  async sendPoke(
    coupleId: string,
    fromId: string,
    toId: string,
    emoji: string,
  ) {
    if (!isCloudEnabled()) {
      return localApi.sendPoke(coupleId, fromId, toId, emoji);
    }
    const { data, error } = await getSupabase()
      .from("pokes")
      .insert({
        couple_id: coupleId,
        from_profile_id: fromId,
        to_profile_id: toId,
        emoji,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as Poke;
  },

  subscribe(coupleId: string, onChange: () => void): () => void {
    if (!isCloudEnabled()) return localApi.subscribe(coupleId, onChange);
    const sb = getSupabase();
    const channel = sb
      .channel(`couple-${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `couple_id=eq.${coupleId}`,
        },
        onChange,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "weigh_ins",
          filter: `couple_id=eq.${coupleId}`,
        },
        onChange,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meal_logs",
          filter: `couple_id=eq.${coupleId}`,
        },
        onChange,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workouts",
          filter: `couple_id=eq.${coupleId}`,
        },
        onChange,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pokes",
          filter: `couple_id=eq.${coupleId}`,
        },
        onChange,
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  },
};
