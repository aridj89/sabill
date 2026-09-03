import React, { useState, useEffect, useCallback, useRef } from "react";
import { loadDataFromStorage, persistData, fetchCleanData } from "./data/defaultData";
import { useAuth } from "./context/AuthContext";
import { useLanguage } from "./context/LanguageContext";
import { C } from "./theme/tokens";
import Toast from "./components/ui/Toast";
import LoginPage from "./pages/LoginPage";
import AdminApp from "./pages/admin/AdminApp";
import ParentApp from "./pages/parent/ParentApp";
import StudentApp from "./pages/student/StudentApp";

export default function App() {
  const { auth, logout } = useAuth();
  const { t } = useLanguage();
  const [data, setDataRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    async function initData() {
      try {
        const local = loadDataFromStorage();
        if (local) {
          setDataRaw(local);
          setLoading(false);
        }
        
        const fetched = await fetchCleanData();
        if (fetched) {
          setDataRaw(fetched);
        }
      } catch (err) {
        console.warn("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  const setData = useCallback((updater) => {
    setDataRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persistData(next);
      return next;
    });
  }, []);

  const toastFn = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  if (loading || !data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
        <div className="f-body" style={{ color: C.inkSoft }}>{t("loading")}</div>
      </div>
    );
  }

  return (
    <div>
      {!auth.role && <LoginPage data={data} setData={setData} toastFn={toastFn} />}
      {auth.role === "admin" && <AdminApp data={data} setData={setData} onLogout={logout} toastFn={toastFn} />}
      {auth.role === "parent" && <ParentApp data={data} setData={setData} parentId={auth.parentId} onLogout={logout} toastFn={toastFn} />}
      {auth.role === "student" && <StudentApp data={data} setData={setData} studentId={auth.studentId} onLogout={logout} toastFn={toastFn} />}
      <Toast toast={toast} />
    </div>
  );
}
