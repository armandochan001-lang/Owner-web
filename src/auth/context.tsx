// Auth + session context.
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Session, Users, ensureSeed } from "@/src/data/store";
import type { User } from "@/src/data/types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await ensureSeed();
      const u = await Session.get();
      setUser(u);
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const list = await Users.list();
    const found = list.find(
      (u) => u.username.trim().toLowerCase() === username.trim().toLowerCase() && u.active,
    );
    if (!found) return { ok: false, error: "Usuario no encontrado" };
    if (found.password !== password) return { ok: false, error: "Contrasena incorrecta" };
    await Session.set(found);
    setUser(found);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await Session.set(null);
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
};

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
