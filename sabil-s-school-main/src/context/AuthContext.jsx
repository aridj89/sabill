import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ role: null, parentId: null });

  const login = (role, parentId = null) => {
    setAuth({ role, parentId });
  };

  const logout = () => {
    setAuth({ role: null, parentId: null });
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/**
 * RequireAdmin — wraps children and redirects to login if not admin.
 * Used to protect admin-only pages.
 */
export function RequireAdmin({ children, fallback }) {
  const { auth } = useAuth();
  if (auth.role !== "admin") return fallback || null;
  return children;
}

/**
 * RequireParent — wraps children and redirects to login if not parent.
 */
export function RequireParent({ children, fallback }) {
  const { auth } = useAuth();
  if (auth.role !== "parent") return fallback || null;
  return children;
}
