import { SLOT_META, SLOT_OPTIONS, type Profile, type Slot } from "./types";

/** 头像圆形底色（首选）+ 头像强调色（撞色时兜底） */
export const PLAYER_PALETTE: readonly string[] = [
  ...SLOT_OPTIONS.map((s) => SLOT_META[s].avatarBg),
  ...SLOT_OPTIONS.map((s) => SLOT_META[s].color),
];

type ColorProfile = Pick<Profile, "id" | "slot">;

function normalize(hex: string): string {
  return hex.trim().toLowerCase();
}

/**
 * 折线 / 进度条颜色：
 * 1) 优先用该选手自己头像的底色（avatarBg）
 * 2) 若与他人撞色，再从其他头像色里顺延挑一个空闲色
 */
export function assignPlayerColors(
  profiles: ColorProfile[],
): Map<string, string> {
  const ordered = [...profiles].sort((a, b) => a.id.localeCompare(b.id));
  const used = new Set<string>();
  const assigned = new Map<string, string>();

  for (const p of ordered) {
    const preferred = SLOT_META[p.slot]?.avatarBg ?? SLOT_META.a.avatarBg;
    let color = preferred;
    if (used.has(normalize(color))) {
      const free = PLAYER_PALETTE.find((c) => !used.has(normalize(c)));
      color = free ?? preferred;
    }
    used.add(normalize(color));
    assigned.set(p.id, color);
  }
  return assigned;
}

export function playerColor(
  profiles: ColorProfile[],
  profileId: string,
): string {
  const map = assignPlayerColors(profiles);
  if (map.has(profileId)) return map.get(profileId)!;
  const slot = profiles.find((p) => p.id === profileId)?.slot as Slot | undefined;
  return slot ? SLOT_META[slot].avatarBg : SLOT_META.a.avatarBg;
}

/** 对战页头像：人数越多等比缩小，尽量一行排开 */
export function avatarSizeForCount(count: number): number {
  if (count <= 2) return 96;
  if (count <= 3) return 78;
  if (count <= 4) return 66;
  if (count <= 5) return 56;
  if (count <= 6) return 48;
  return 42;
}

export function avatarGapForCount(count: number): number {
  if (count <= 2) return 20;
  if (count <= 3) return 14;
  if (count <= 4) return 10;
  if (count <= 6) return 8;
  return 6;
}
