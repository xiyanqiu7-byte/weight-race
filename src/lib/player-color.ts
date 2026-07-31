import type { Profile } from "./types";

/**
 * 折线 / 进度条用色：按房间内选手稳定排序后分配，互不重复。
 * 配色贴合现有品牌（黄 / 珊瑚 / 墨绿 / 墨色系），避开紫系。
 */
export const PLAYER_PALETTE = [
  "#ffd541", // moss 黄
  "#ff8b7b", // brick 珊瑚
  "#2f9d6a", // good 绿
  "#1a1a1a", // ink
  "#e8a23a", // 暖橙
  "#5b8c7a", // 灰绿
  "#d9654a", // 深珊瑚
  "#6b635a", // 暖灰褐
] as const;

/** 同一房间内按 id 排序，保证颜色稳定且互异 */
export function playerColorIndex(
  profiles: Pick<Profile, "id">[],
  profileId: string,
): number {
  const ordered = [...profiles].sort((a, b) => a.id.localeCompare(b.id));
  const idx = ordered.findIndex((p) => p.id === profileId);
  return idx < 0 ? 0 : idx;
}

export function playerColor(
  profiles: Pick<Profile, "id">[],
  profileId: string,
): string {
  const i = playerColorIndex(profiles, profileId);
  return PLAYER_PALETTE[i % PLAYER_PALETTE.length];
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
