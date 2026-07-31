"use client";

import { PixelAvatar } from "@/components/PixelAvatar";
import {
  avatarGapForCount,
  avatarSizeForCount,
  playerColor,
  PLAYER_PALETTE,
} from "@/lib/player-color";
import type { Profile, Slot } from "@/lib/types";

function mockProfile(id: string, nickname: string, slot: Slot): Profile {
  return {
    id,
    couple_id: "preview",
    slot,
    nickname,
    start_weight_kg: 60,
    start_date: "2026-07-01",
    goal_kg: 5,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
  };
}

const GROUPS: { title: string; profiles: Profile[] }[] = [
  {
    title: "两人都选头像1：第一个用紫底，第二个自动换青色（不撞色）",
    profiles: [
      mockProfile("p1", "我", "a"),
      mockProfile("p2", "小笼包", "a"),
    ],
  },
  {
    title: "四人各选不同头像：折线色 = 各自头像底色",
    profiles: [
      mockProfile("p1", "我", "a"),
      mockProfile("p2", "茶壶", "b"),
      mockProfile("p3", "火火", "c"),
      mockProfile("p4", "豆豆", "d"),
    ],
  },
  {
    title: "六人挤一行：头像等比缩小；同头像的会换色",
    profiles: [
      mockProfile("p1", "我", "a"),
      mockProfile("p2", "小笼包", "a"),
      mockProfile("p3", "茶壶", "b"),
      mockProfile("p4", "火火", "c"),
      mockProfile("p5", "豆豆", "d"),
      mockProfile("p6", "阿可", "b"),
    ],
  },
];

export default function PreviewUiPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-6">
      <header>
        <p className="text-[12px] font-semibold text-muted">PREVIEW · 未上线</p>
        <h1 className="mt-1 text-[26px] font-bold tracking-tight">
          布局 / 配色预览
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          头像尽量排成一行并按人数缩小。折线优先用你头像的底色；只有撞色时才换成别的头像色。
        </p>
      </header>

      {GROUPS.map(({ title, profiles }) => {
        const size = avatarSizeForCount(profiles.length);
        const gap = avatarGapForCount(profiles.length);
        return (
          <section key={title} className="card-taupe px-3 py-5">
            <p className="mb-3 px-1 text-[12px] font-semibold leading-snug text-muted">
              {title}
            </p>
            <div
              className="flex flex-nowrap items-end justify-center overflow-x-auto"
              style={{ gap }}
            >
              {profiles.map((p) => (
                <PixelAvatar
                  key={p.id}
                  slot={p.slot}
                  nickname={p.nickname}
                  size={size}
                />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 px-1 text-[12px]">
              {profiles.map((p) => (
                <span
                  key={p.id}
                  className="flex items-center gap-1.5 font-medium"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: playerColor(profiles, p.id) }}
                  />
                  {p.nickname}
                </span>
              ))}
            </div>
            <svg viewBox="0 0 320 80" className="mt-3 h-auto w-full">
              {profiles.map((p, i) => {
                const color = playerColor(profiles, p.id);
                const y = 20 + i * 8;
                return (
                  <path
                    key={p.id}
                    d={`M16 ${y + 18} L80 ${y} L160 ${y + 10} L240 ${y - 2} L304 ${y + 6}`}
                    stroke={color}
                    strokeWidth={3}
                    fill="none"
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>
          </section>
        );
      })}

      <section className="card-soft p-4">
        <p className="mb-2 text-[13px] font-bold">可用色（头像底色 + 强调色）</p>
        <div className="flex flex-wrap gap-2">
          {PLAYER_PALETTE.map((c) => (
            <span
              key={c}
              className="inline-flex h-8 w-8 rounded-full shadow-sm"
              style={{ background: c }}
              title={c}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
