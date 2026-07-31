"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import {
  clearSession,
  loadSession,
  loadUnit,
  saveSession,
  saveUnit,
} from "@/lib/session";
import type { CoupleBundle, Session } from "@/lib/types";
import type { Unit } from "@/lib/units";

interface CoupleContextValue {
  session: Session | null;
  bundle: CoupleBundle | null;
  loading: boolean;
  error: string | null;
  unit: Unit;
  setUnit: (u: Unit) => void;
  refresh: () => Promise<void>;
  login: (session: Session) => void;
  /** 仅清除本机登录（进房失败等恢复用，不删云端数据） */
  logout: () => void;
  /** 退出并删除自己在本房间的档案与打卡记录 */
  leaveRoom: () => Promise<void>;
  cloud: boolean;
}

const CoupleContext = createContext<CoupleContextValue | null>(null);

export function CoupleProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [bundle, setBundle] = useState<CoupleBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnitState] = useState<Unit>("kg");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSession(loadSession());
    setUnitState(loadUnit());
    setHydrated(true);
  }, []);

  const refresh = useCallback(async () => {
    const s = loadSession();
    if (!s) {
      setBundle(null);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await api.fetchBundle(s.coupleId);
      setBundle(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "加载失败";
      setError(msg);
      setBundle(null);
      // 本地旧会话对不上云端时，清掉，避免一直转圈
      const lower = msg.toLowerCase();
      if (
        lower.includes("not found") ||
        lower.includes("0 rows") ||
        lower.includes("multiple (or no) rows") ||
        lower.includes("房间不存在") ||
        lower.includes("pgrst116")
      ) {
        clearSession();
        setSession(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!session) {
      setLoading(false);
      setBundle(null);
      return;
    }
    setLoading(true);
    void refresh();
    const unsub = api.subscribe(session.coupleId, () => {
      void refresh();
    });
    return unsub;
  }, [hydrated, session, refresh]);

  const login = useCallback((s: Session) => {
    saveSession(s);
    setSession(s);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    setBundle(null);
  }, []);

  const leaveRoom = useCallback(async () => {
    const s = loadSession();
    if (s) {
      await api.leaveRoom(s.coupleId, s.profileId);
    }
    clearSession();
    setSession(null);
    setBundle(null);
  }, []);

  const setUnit = useCallback((u: Unit) => {
    saveUnit(u);
    setUnitState(u);
  }, []);

  const value = useMemo(
    () => ({
      session,
      bundle,
      loading,
      error,
      unit,
      setUnit,
      refresh,
      login,
      logout,
      leaveRoom,
      cloud: api.isCloud(),
    }),
    [
      session,
      bundle,
      loading,
      error,
      unit,
      setUnit,
      refresh,
      login,
      logout,
      leaveRoom,
    ],
  );

  return (
    <CoupleContext.Provider value={value}>{children}</CoupleContext.Provider>
  );
}

export function useCouple() {
  const ctx = useContext(CoupleContext);
  if (!ctx) throw new Error("useCouple must be used within CoupleProvider");
  return ctx;
}
