// Auth state lives in React Context, persisted to localStorage so a refresh
// keeps you logged in. Listens for the 'mer:unauthorized' event the API
// client emits on a 401 — when the server says the token is invalid, we
// clear local state immediately so the UI redirects to /login.

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { login as apiLogin, me as apiMe } from '../api/auth';

const TOKEN_KEY = 'mer.token';
const USER_KEY  = 'mer.user';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user,  setUser]  = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [bootstrapping, setBootstrapping] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  // Centralised logout — also called by the 401 interceptor.
  // Clears the React Query cache so no data leaks into the next session
  // (e.g. a super_admin's all-states facility list showing for a state admin).
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Login wrapper — persists and updates state. Cache is cleared FIRST so the
  // incoming user starts from a blank slate, never the previous user's data.
  const signIn = useCallback(async (credentials) => {
    const { token: nextToken, user: nextUser } = await apiLogin(credentials);
    queryClient.clear();
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    return nextUser;
  }, [queryClient]);

  // On first load, if we have a token, always re-fetch the user from the
  // server. This both validates the token and refreshes any user-object
  // fields (role change, facility reassignment, new fields like
  // facility_name) that may have changed since the last login.
  useEffect(() => {
    if (!token) {
      setBootstrapping(false);
      return;
    }
    let cancelled = false;
    apiMe()
      .then((freshUser) => {
        if (cancelled) return;
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
        setUser(freshUser);
      })
      .catch(() => {
        if (!cancelled) logout();
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });
    return () => { cancelled = true; };
  }, [token, logout]);

  // Subscribe to 401 events from the API client.
  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener('mer:unauthorized', onUnauthorized);
    return () => window.removeEventListener('mer:unauthorized', onUnauthorized);
  }, [logout]);

  const value = useMemo(
    () => ({ user, token, bootstrapping, signIn, logout, isAuthenticated: Boolean(token && user) }),
    [user, token, bootstrapping, signIn, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
