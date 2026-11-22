import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import ApiService from '../services/ApiService';
import { getItem, removeItem, setItem } from '../services/storage';

const TOKEN_KEY = 'parkirin_token';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    ApiService.setToken(null);
    setToken(null);
    setUser(null);
    await removeItem(TOKEN_KEY);
  }, []);

  // Pulihkan sesi login saat app dibuka
  useEffect(() => {
    ApiService.setUnauthorizedHandler(() => signOut());
    (async () => {
      try {
        const saved = await getItem(TOKEN_KEY);
        if (saved) {
          ApiService.setToken(saved);
          const me = await ApiService.me();
          setToken(saved);
          setUser(me);
        }
      } catch {
        await removeItem(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, [signOut]);

  const applySession = useCallback(async ({ token: t, user: u }) => {
    ApiService.setToken(t);
    await setItem(TOKEN_KEY, t);
    setToken(t);
    setUser(u);
  }, []);

  const signIn = useCallback(async (email, password) => applySession(await ApiService.login(email.trim(), password)), [applySession]);
  const signUp = useCallback(async (payload) => applySession(await ApiService.register(payload)), [applySession]);
  const refreshUser = useCallback(async () => setUser(await ApiService.me()), []);

  const value = useMemo(
    () => ({ token, user, loading, isSignedIn: !!token, signIn, signUp, signOut, refreshUser }),
    [token, user, loading, signIn, signUp, signOut, refreshUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
