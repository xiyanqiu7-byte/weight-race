"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCouple } from "@/hooks/useCouple";
import { api } from "@/lib/api";
import { displayToKg, formatWeight, kgToDisplay } from "@/lib/units";

export default function SettingsPage() {
  const router = useRouter();
  const { session, bundle, unit, setUnit, leaveRoom, refresh, cloud } =
    useCouple();
  const me = bundle?.profiles.find((p) => p.id === session?.profileId);

  const [nickname, setNickname] = useState("");
  const [startWeight, setStartWeight] = useState("");
  const [startDate, setStartDate] = useState("");
  const [goalKg, setGoalKg] = useState("5");
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    setNickname(me.nickname);
    setStartWeight(
      me.start_weight_kg != null
        ? String(kgToDisplay(me.start_weight_kg, unit))
        : "",
    );
    setStartDate(me.start_date ?? "");
    setGoalKg(String(me.goal_kg));
  }, [me, unit]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.updateProfile(session.profileId, {
        nickname: nickname.trim() || me?.nickname || "选手",
        start_weight_kg: startWeight
          ? displayToKg(Number(startWeight), unit)
          : null,
        start_date: startDate || null,
        goal_kg: Number(goalKg) || 5,
      });
      await refresh();
      setMsg("已保存");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function onLeaveRoom() {
    if (leaving) return;
    const ok = window.confirm(
      "确定退出并删除你在本房间的全部记录？\n（体重 / 饮食 / 训练 / 挑衅都会删掉，且无法恢复。其他人的数据不受影响。）",
    );
    if (!ok) return;
    setLeaving(true);
    setMsg(null);
    try {
      await leaveRoom();
      router.replace("/enter");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "退出失败，请重试");
      setLeaving(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 py-2 pb-5">
      <header className="px-1">
        <h1 className="text-[26px] font-bold tracking-tight">设置</h1>
        <p className="mt-1 text-[13px] text-muted">
          {cloud ? "云端同步中" : "本地模式"} · 默认 kg，可切换斤
        </p>
      </header>

      <form onSubmit={onSave} className="card-soft flex flex-col gap-4 p-5">
        <label className="flex flex-col gap-2 text-[12px] font-medium text-muted">
          昵称
          <input
            className="rounded-[18px] bg-sand px-4 py-3 text-[15px] font-semibold text-ink outline-none"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={12}
          />
        </label>

        <label className="flex flex-col gap-2 text-[12px] font-medium text-muted">
          起始体重（{unit === "jin" ? "斤" : "kg"}）
          <input
            type="number"
            step="0.1"
            className="rounded-[18px] bg-sand px-4 py-3 text-[15px] font-semibold text-ink outline-none"
            value={startWeight}
            onChange={(e) => setStartWeight(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2 text-[12px] font-medium text-muted">
          比赛开始日期
          <input
            type="date"
            className="rounded-[18px] bg-sand px-4 py-3 text-[15px] font-semibold text-ink outline-none"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2 text-[12px] font-medium text-muted">
          目标减重（kg）
          <input
            type="number"
            step="0.1"
            className="rounded-[18px] bg-sand px-4 py-3 text-[15px] font-semibold text-ink outline-none"
            value={goalKg}
            onChange={(e) => setGoalKg(e.target.value)}
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-[12px] font-medium text-muted">显示单位</legend>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`rounded-full py-3 text-[13px] font-semibold ${
                unit === "kg" ? "bg-ink text-white" : "bg-sand text-ink"
              }`}
              onClick={() => setUnit("kg")}
            >
              kg
            </button>
            <button
              type="button"
              className={`rounded-full py-3 text-[13px] font-semibold ${
                unit === "jin" ? "bg-ink text-white" : "bg-sand text-ink"
              }`}
              onClick={() => setUnit("jin")}
            >
              斤
            </button>
          </div>
          {me?.start_weight_kg != null && (
            <p className="text-[11px] text-muted">
              当前起始体重折算：{formatWeight(me.start_weight_kg, unit)}
            </p>
          )}
        </fieldset>

        <button
          type="submit"
          className="pixel-btn pixel-btn-primary py-3.5"
          disabled={busy}
        >
          {busy ? "保存中…" : "保存设置"}
        </button>
      </form>

      {msg && <p className="px-1 text-[13px] font-medium text-ink">{msg}</p>}

      <button
        type="button"
        className="pixel-btn bg-brick py-3.5 text-ink"
        onClick={() => void onLeaveRoom()}
        disabled={leaving}
      >
        {leaving ? "正在退出…" : "退出房间并删除我的记录"}
      </button>

      <p className="px-1 text-[11px] leading-relaxed text-muted">
        退出会同步删除你在本房间的选手档案和打卡数据；房间里其他人不受影响。若你是最后一人，空房间也会被清掉。之后用同一暗号再进，会当作新选手重新开始。
      </p>
    </main>
  );
}
