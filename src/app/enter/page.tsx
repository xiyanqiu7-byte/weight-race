"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PixelAvatar } from "@/components/PixelAvatar";
import { ModeBanner } from "@/components/ModeBanner";
import { useCouple } from "@/hooks/useCouple";
import { api } from "@/lib/api";
import { hashPassphrase } from "@/lib/hash";
import { SLOT_OPTIONS, type Slot } from "@/lib/types";

export default function EnterPage() {
  const router = useRouter();
  const { login, cloud } = useCouple();
  const [slot, setSlot] = useState<Slot>("a");
  const [nickname, setNickname] = useState("");
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const name = nickname.trim();
    if (!name) {
      setError("请填写昵称");
      return;
    }
    if (!phrase.trim()) {
      setError("请输入共享暗号");
      return;
    }
    setBusy(true);
    try {
      const hash = await hashPassphrase(phrase);
      const { couple, profile } = await api.findOrJoinCouple(hash, slot, name);
      login({
        coupleId: couple.id,
        profileId: profile.id,
        slot: profile.slot,
        nickname: profile.nickname,
      });
      if (profile.start_weight_kg == null) {
        router.replace("/onboard");
      } else {
        router.replace("/battle");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "进入失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col">
      <ModeBanner />
      <div className="flex flex-1 flex-col gap-6 px-5 py-8">
        <header>
          <p className="text-[12px] font-semibold text-muted">WEIGHT RACE</p>
          <h1 className="mt-2 text-[30px] font-bold tracking-tight">
            Hi, 准备好了吗？
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            选头像、起昵称，输入同一句暗号，就能进入同一房间。
            双人好友、三五成群都行。目标：先减 5 kg 者胜。
            换手机再用同一昵称+暗号，会回到原来的账号。
          </p>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <section className="card-soft p-4">
            <p className="mb-3 text-[13px] font-semibold">选择头像</p>
            <div className="grid grid-cols-4 gap-2">
              {SLOT_OPTIONS.map((s) => {
                const active = slot === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlot(s)}
                    className={`flex items-center justify-center rounded-[20px] bg-cream py-2 transition ${
                      active
                        ? "ring-2 ring-ink ring-offset-2 ring-offset-[var(--bg)]"
                        : "opacity-85"
                    }`}
                  >
                    <PixelAvatar slot={s} size={64} />
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted">
              随便选一个；暗号相同就会进同一房间。
            </p>
          </section>

          <label className="flex flex-col gap-2 text-[12px] font-medium text-muted">
            你的昵称
            <input
              className="rounded-[20px] bg-cream px-4 py-3.5 text-[15px] font-medium text-ink outline-none shadow-[0_8px_28px_rgba(26,26,26,0.07)]"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="例如：豆豆"
              maxLength={12}
              autoComplete="nickname"
            />
          </label>

          <label className="flex flex-col gap-2 text-[12px] font-medium text-muted">
            共享暗号
            <input
              className="rounded-[20px] bg-cream px-4 py-3.5 text-[15px] font-medium text-ink outline-none shadow-[0_8px_28px_rgba(26,26,26,0.07)]"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="和朋友约定同一句话"
              maxLength={40}
              autoComplete="off"
            />
          </label>

          {error && (
            <p className="rounded-[20px] bg-brick/15 px-4 py-3 text-[13px] font-medium text-[#c45a4e]">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="pixel-btn pixel-btn-primary py-3.5 text-[15px]"
            disabled={busy}
          >
            {busy ? "匹配中…" : "进入房间"}
          </button>

          <p className="text-center text-[11px] text-muted">
            {cloud ? "云端同步已开启" : "本地模式 · 仅本机"}
          </p>
        </form>
      </div>
    </main>
  );
}
