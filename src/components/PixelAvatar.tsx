"use client";

import Image from "next/image";
import { SLOT_META, type Slot } from "@/lib/types";

interface Props {
  slot: Slot;
  nickname?: string;
  buff?: boolean;
  debuff?: boolean;
  pokeEmoji?: string | null;
  size?: number;
  facing?: "left" | "right";
}

export function PixelAvatar({
  slot,
  nickname,
  buff,
  debuff,
  pokeEmoji,
  size = 96,
}: Props) {
  const meta = SLOT_META[slot] ?? SLOT_META.a;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        {(buff || debuff) && (
          <div className="absolute -top-2 left-1/2 z-10 flex -translate-x-1/2 gap-1 pop-in">
            {debuff && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] shadow-sm">
                🐔
              </span>
            )}
            {buff && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] shadow-sm">
                💪
              </span>
            )}
          </div>
        )}
        {pokeEmoji && (
          <div className="absolute -right-1 -top-1 z-20 pop-in">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[14px] shadow-[0_4px_12px_rgba(26,26,26,0.12)]">
              {pokeEmoji}
            </span>
          </div>
        )}
        <div
          className="breathe overflow-hidden rounded-[32%] shadow-[0_6px_18px_rgba(26,26,26,0.10)]"
          style={{
            width: size,
            height: size,
            background: meta.avatarBg,
          }}
        >
          <Image
            src={meta.avatarSrc}
            alt={nickname ?? meta.label}
            width={size}
            height={size}
            className="h-full w-full object-cover"
            style={{ imageRendering: "pixelated" }}
            priority
            unoptimized
          />
        </div>
      </div>
      {nickname && (
        <div className="max-w-[120px] truncate text-center text-[13px] font-semibold">
          {nickname}
        </div>
      )}
    </div>
  );
}
