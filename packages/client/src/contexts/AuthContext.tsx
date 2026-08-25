import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  /** true mientras se intenta restaurar la sesión al cargar la app */
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    apiFetch<AuthResponse>("/auth/refresh", { method: "POST" })
      .then((data) => {
        setUser(data.user);
        setAccessToken(data.accessToken);
      })
      .catch(() => {
        // no había una sesión previa (o el refresh token expiró): sigue como anónimo
      })
      .finally(() => setInitializing(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    setAccessToken(data.accessToken);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const data = await apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setUser(data.user);
    setAccessToken(data.accessToken);
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => {
      // si el logout en el server falla igual limpiamos la sesión local
    });
    setUser(null);
    setAccessToken(null);
  }, []);

  const value = useMemo(
    () => ({ user, accessToken, initializing, login, register, logout }),
    [user, accessToken, initializing, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
