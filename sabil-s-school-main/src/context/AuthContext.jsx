import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ role: null, parentId: null, studentId: null, token: localStorage.getItem("auth_token") });

  const login = (role, id = null, token = null) => {
    if (token) {
      localStorage.setItem("auth_token", token);
    }
    if (role === "parent") setAuth({ role, parentId: id, studentId: null, token });
    else if (role === "student") setAuth({ role, parentId: null, studentId: id, token });
    else setAuth({ role, parentId: null, studentId: null, token }); // admin
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setAuth({ role: null, parentId: null, studentId: null, token: null });
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

/**
 * RequireStudent — wraps children and redirects to login if not student.
 */
export function RequireStudent({ children, fallback }) {
  const { auth } = useAuth();
  if (auth.role !== "student") return fallback || null;
  return children;
}
