"use client";

import { useMemo, useState } from "react";
import { PixelAvatar } from "@/components/PixelAvatar";
import { ProgressBar } from "@/components/ProgressBar";
import { useCouple } from "@/hooks/useCouple";
import { api } from "@/lib/api";
import {
  daysSince,
  getOthers,
  hasBuff,
  hasDebuff,
  latestWeight,
  milestonesReached,
  profileLost,
} from "@/lib/stats";
import {
  avatarGapForCount,
  avatarSizeForCount,
  playerColor,
} from "@/lib/player-color";
import { formatWeight, progressRatio, todayISO } from "@/lib/units";
import { POKE_EMOJIS, SLOT_META, type Profile } from "@/lib/types";

export default function BattlePage() {
  const { session, bundle, unit, refresh, loading, error, logout } = useCouple();
  const [pokeOpen, setPokeOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const today = todayISO();

  const view = useMemo(() => {
    if (!session || !bundle) return null;
    const me = bundle.profiles.find((p) => p.id === session.profileId);
    if (!me) return null;

    const others = getOthers(bundle, session.profileId);
    const ranked = [...bundle.profiles]
      .map((p) => ({
        profile: p,
        lost: profileLost(p, bundle.weighIns),
        current: latestWeight(bundle.weighIns, p.id),
      }))
      .sort((a, b) => b.lost - a.lost);

    const leader = ranked[0];
    const myRank = ranked.findIndex((r) => r.profile.id === me.id) + 1;

    // 每人保留自己发出的最新挑衅表情（互不顶掉）
    const pokeEmojiBySender = new Map<string, string>();
    for (const poke of bundle.pokes) {
      if (!pokeEmojiBySender.has(poke.from_profile_id)) {
        pokeEmojiBySender.set(poke.from_profile_id, poke.emoji);
      }
    }

    return {
      me,
      others,
      ranked,
      meBuff: hasBuff(bundle.workouts, me.id, today),
      meDebuff: hasDebuff(bundle.mealLogs, me.id, today),
      days: daysSince(me.start_date),
      pokeEmojiBySender,
      myRank,
      leaderName: leader?.profile.nickname ?? me.nickname,
      total: bundle.profiles.length,
    };
  }, [session, bundle, today]);

  async function sendPoke(emoji: string) {
    if (!session || !view) return;
    if (view.others.length === 0) {
      setToast("等好友加入同一暗号房间后，才能挑衅");
      return;
    }
    setSending(true);
    try {
      // 表情挂在自己头上；to 仅作记录，默认发给房间里第一位好友
      await api.sendPoke(
        session.coupleId,
        session.profileId,
        view.others[0].id,
        emoji,
      );
      await refresh();
      setPokeOpen(false);
      setToast(`已挂上 ${emoji}`);
      setTimeout(() => setToast(null), 1800);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "发送失败");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-muted">
        加载对战画面…
      </main>
    );
  }

  if (!session || !view) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[15px] font-semibold text-ink">进不去这个房间</p>
        <p className="text-[13px] text-muted">
          {error ||
            "多半是以前本地试用的登录还在。请重新选头像、输入暗号进入。"}
        </p>
        <button
          type="button"
          className="pixel-btn pixel-btn-primary px-6 py-3"
          onClick={() => {
            logout();
            window.location.href = "/enter";
          }}
        >
          重新进入
        </button>
      </main>
    );
  }

  const lead =
    view.total <= 1
      ? "把暗号发给好友，一起开打"
      : view.myRank === 1
        ? "你目前领先，稳住节奏"
        : `当前第 ${view.myRank} 名 · 领先的是 ${view.leaderName}`;

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <header className="px-1">
        <h1 className="text-[28px] font-bold tracking-tight">
          Hi, {view.me.nickname}!
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          第 {view.days || 1} 天 · 房间 {view.total} 人 · {lead}
        </p>
      </header>

      <section className="card-taupe relative px-3 pb-5 pt-2">
        {/* 背景层单独裁圆角，避免裁掉头像弹动 / 挑衅 emoji */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        >
          <div
            className="absolute -left-6 top-2 h-36 w-36 rounded-full opacity-80 blur-2xl"
            style={{ background: SLOT_META.a.color }}
          />
          <div
            className="absolute -right-4 bottom-0 h-40 w-40 rounded-full opacity-70 blur-2xl"
            style={{ background: SLOT_META.b.color }}
          />
        </div>
        {(() => {
          const rowCount =
            view.others.length === 0 ? 2 : view.total;
          const avatarSize = avatarSizeForCount(rowCount);
          const avatarGap = avatarGapForCount(rowCount);
          return (
            <div
              className="relative flex flex-nowrap items-end justify-center px-1 touch-pan-y"
              style={{
                gap: avatarGap,
                // buff / 挑衅角标 + breathe 上移，需要顶部留白
                paddingTop: Math.max(16, Math.round(avatarSize * 0.12)),
              }}
            >
              <PlayerChip
                profile={view.me}
                size={avatarSize}
                buff={view.meBuff}
                debuff={view.meDebuff}
                pokeEmoji={view.pokeEmojiBySender.get(view.me.id) ?? null}
              />
              {view.others.length === 0 ? (
                <div
                  className="flex shrink-0 flex-col items-center justify-center text-muted"
                  style={{
                    width: avatarSize,
                    minHeight: avatarSize + 28,
                    fontSize: avatarSize >= 70 ? 11 : 10,
                  }}
                >
                  <div
                    className="mb-2 flex items-center justify-center rounded-full bg-white/70 font-bold text-ink"
                    style={{
                      width: avatarSize * 0.72,
                      height: avatarSize * 0.72,
                      fontSize: avatarSize >= 70 ? 18 : 14,
                    }}
                  >
                    ?
                  </div>
                  等待加入
                </div>
              ) : (
                view.others.map((p) => (
                  <PlayerChip
                    key={p.id}
                    profile={p}
                    size={avatarSize}
                    buff={hasBuff(bundle!.workouts, p.id, today)}
                    debuff={hasDebuff(bundle!.mealLogs, p.id, today)}
                    pokeEmoji={view.pokeEmojiBySender.get(p.id) ?? null}
                  />
                ))
              )}
            </div>
          );
        })()}
      </section>

      <div
        className="poke-flip"
        data-open={pokeOpen ? "true" : "false"}
        style={{ minHeight: pokeOpen ? 104 : undefined }}
      >
        <div
          className="poke-flip-inner"
          style={{ minHeight: pokeOpen ? 104 : 52 }}
        >
          <div className="poke-flip-face poke-flip-front">
            <button
              type="button"
              className="pixel-btn pixel-btn-primary w-full py-3.5 text-[14px]"
              onClick={() => setPokeOpen(true)}
            >
              挑衅一下
            </button>
          </div>

          <div className="poke-flip-face poke-flip-back">
            <div className="flex h-full flex-col justify-center gap-2 rounded-[28px] bg-sand px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-muted">
                  选个表情挂在自己头上
                </p>
                <button
                  type="button"
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-muted"
                  onClick={() => setPokeOpen(false)}
                >
                  收回
                </button>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {POKE_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="pixel-btn aspect-square bg-white text-lg"
                    disabled={sending}
                    onClick={() => void sendPoke(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {view.ranked.map(({ profile, lost, current }) => {
        const goalWeight =
          profile.start_weight_kg != null
            ? profile.start_weight_kg - profile.goal_kg
            : null;
        const badges = milestonesReached(lost);
        return (
          <div key={profile.id} className="flex flex-col gap-2">
            <ProgressBar
              value={progressRatio(
                profile.start_weight_kg,
                current,
                profile.goal_kg,
              )}
              color={playerColor(bundle!.profiles, profile.id)}
              label={`${profile.nickname}${profile.id === view.me.id ? "（我）" : ""} 的减重计划`}
              sublabel={`已减 ${formatWeight(lost, unit)} / 目标 ${profile.goal_kg} kg`}
              currentLabel={
                current != null ? formatWeight(current, unit) : undefined
              }
              startLabel={
                profile.start_weight_kg != null
                  ? formatWeight(profile.start_weight_kg, unit)
                  : "起点"
              }
              goalLabel={
                goalWeight != null ? formatWeight(goalWeight, unit) : "目标"
              }
            />
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1">
                {badges.map((b) => (
                  <span
                    key={b}
                    className="rounded-full bg-moss px-3 py-1.5 text-[11px] font-semibold text-ink"
                  >
                    达成 {b} kg
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {toast && (
        <div className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}

function PlayerChip({
  profile,
  buff,
  debuff,
  pokeEmoji,
  size = 96,
}: {
  profile: Profile;
  buff: boolean;
  debuff: boolean;
  pokeEmoji?: string | null;
  size?: number;
}) {
  return (
    <PixelAvatar
      slot={profile.slot}
      nickname={profile.nickname}
      buff={buff}
      debuff={debuff}
      pokeEmoji={pokeEmoji}
      size={size}
    />
  );
}
