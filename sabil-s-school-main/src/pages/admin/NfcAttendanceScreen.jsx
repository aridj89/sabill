import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Radio, CheckCircle2, XCircle, AlertTriangle, Users,
  Calendar, Clock, Search, ArrowLeft, RefreshCw, Smartphone,
  CreditCard, ShieldCheck, Volume2, VolumeX, Sparkles, UserCheck,
  Send, Plus, Trash2, Check, AlertCircle, Eye, ChevronRight, Usb
} from "lucide-react";
import { C, CAT_BY_ID, uid, getStudentFinancialSummary } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import PrimaryBtn from "../../components/ui/PrimaryBtn";
import IconBtn from "../../components/ui/IconBtn";
import Modal from "../../components/ui/Modal";
import Field from "../../components/ui/Field";

const API_BASE_URL = "http://localhost:5000/api/nfc";

/* ── Web Audio Beep generator ── */
function playTone(type = "success") {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } else if (type === "warning") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
      osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.1); // E3
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {
    // Ignore audio context errors on browsers blocking autoplay
  }
}

export default function NfcAttendanceScreen({ data, setData, toastFn, onBack, onNav, embeddedSubgroupId }) {
  const { lang, isRTL } = useLanguage();
  const todayStr = new Date().toISOString().slice(0, 10);

  // States
  const [selectedSubgroupId, setSelectedSubgroupId] = useState(embeddedSubgroupId || "auto");
  const [selectedSessionId, setSelectedSessionId] = useState("auto");
  const [manualCode, setManualCode] = useState("");
  const [lastScanned, setLastScanned] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcActive, setNfcActive] = useState(false);
  const [nfcError, setNfcError] = useState("");
  const [recentScans, setRecentScans] = useState([]);
  const [assignModalStudent, setAssignModalStudent] = useState(null);
  const [assignCardInput, setAssignCardInput] = useState("");
  const [quickSearch, setQuickSearch] = useState("");

  // 5YOA Hardware Reader State
  const [hardwareConnected, setHardwareConnected] = useState(false);
  const [hardwareDevice, setHardwareDevice] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const inputRef = useRef(null);
  const assignModalStudentRef = useRef(assignModalStudent);
  const dataRef = useRef(data);

  useEffect(() => {
    assignModalStudentRef.current = assignModalStudent;
  }, [assignModalStudent]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Subgroups list
  const subgroups = data.subgroups || [];
  const todaySessions = (data.sessions || []).filter(s => s.date === todayStr);

  const activeSubgroup = selectedSubgroupId !== "auto"
    ? subgroups.find(s => s.id === selectedSubgroupId)
    : null;

  // ── 1. Connect to Hardware Reader via SSE ──
  useEffect(() => {
    let eventSource = null;

    // Check initial status
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/status`);
        const json = await res.json();
        if (json.success && json.reader) {
          setHardwareConnected(!!json.reader.connected);
          setHardwareDevice(json.reader.device);
        }
      } catch (err) {
        setHardwareConnected(false);
      } finally {
        setIsCheckingStatus(false);
      }
    };
    checkStatus();

    // Connect to real-time events stream
    try {
      eventSource = new EventSource(`${API_BASE_URL}/stream`);

      eventSource.addEventListener("connected", (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.readerStatus) {
            setHardwareConnected(!!payload.readerStatus.connected);
            setHardwareDevice(payload.readerStatus.device);
          }
        } catch (_) {}
      });

      eventSource.addEventListener("status_change", (e) => {
        try {
          const payload = JSON.parse(e.data);
          setHardwareConnected(!!payload.connected);
          if (payload.device) setHardwareDevice(payload.device);
        } catch (_) {}
      });

      eventSource.addEventListener("card_scanned", (e) => {
        try {
          const result = JSON.parse(e.data);
          handleBackendScanEvent(result);
        } catch (err) {
          console.error("Error processing SSE card event:", err);
        }
      });

      eventSource.onerror = () => {
        setHardwareConnected(false);
      };
    } catch (err) {
      console.warn("SSE connection error:", err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // ── Handle Backend Scan Events (SSE or manual scan) ──
  const handleBackendScanEvent = (result) => {
    // If Assign Modal is open, auto-fill the card UID in the modal input
    if (assignModalStudentRef.current) {
      setAssignCardInput(result.cardUid);
      if (soundEnabled) playTone("success");
      toastFn(lang === "ar" ? `تم التقاط رمز البطاقة: ${result.cardUid}` : `Badge détecté : ${result.cardUid}`);
      return;
    }

    const currentData = dataRef.current;

    // Case 1: Valid attendance recorded
    if (result.success && result.student) {
      if (soundEnabled) playTone("success");

      const targetSg = (currentData.subgroups || []).find(sg => sg.id === result.student.subgroupId);
      const fin = getStudentFinancialSummary(currentData, result.student.id);

      const scanResult = {
        success: true,
        isDuplicate: false,
        student: result.student,
        subgroup: targetSg,
        timestamp: result.timestamp || new Date().toLocaleTimeString("fr-FR"),
        financial: fin,
      };

      setLastScanned(scanResult);
      setRecentScans(prev => [scanResult, ...prev.filter(r => r.student?.id !== result.student.id)].slice(0, 15));

      // Sync React state attendances
      if (result.attendance) {
        setData(d => {
          const other = (d.attendances || []).filter(
            a => a.id !== result.attendance.id && !(a.studentId === result.student.id && a.date === result.attendance.date)
          );
          return {
            ...d,
            attendances: [...other, result.attendance],
            userNotifications: result.notification
              ? [...(d.userNotifications || []), result.notification]
              : d.userNotifications,
          };
        });
      }

      toastFn(
        lang === "ar"
          ? `تم تسجيل حضور: ${result.student.prenom} ${result.student.nom} ✓`
          : `Présence validée : ${result.student.prenom} ${result.student.nom} ✓`
      );
      return;
    }

    // Case 2: Duplicate scan within cooldown
    if (result.isDuplicate && result.student) {
      if (soundEnabled) playTone("warning");

      const targetSg = (currentData.subgroups || []).find(sg => sg.id === result.student.subgroupId);
      const fin = getStudentFinancialSummary(currentData, result.student.id);

      const scanResult = {
        success: true,
        isDuplicate: true,
        student: result.student,
        subgroup: targetSg,
        timestamp: result.timestamp || new Date().toLocaleTimeString("fr-FR"),
        financial: fin,
        remainingSeconds: result.remainingSeconds,
        message: result.message,
      };

      setLastScanned(scanResult);
      toastFn(
        lang === "ar"
          ? `تنبيه: تم تسجيل حضور ${result.student.prenom} مسبقاً (انتظر ${result.remainingSeconds}ث)`
          : `Pointage déjà validé pour ${result.student.prenom} (patientez ${result.remainingSeconds}s)`
      );
      return;
    }

    // Case 3: Unknown / Unregistered card
    if (result.reason === "unregistered_card" || !result.success) {
      if (soundEnabled) playTone("error");
      setLastScanned({
        success: false,
        isDuplicate: false,
        isUnknown: true,
        code: result.cardUid,
        message: lang === "ar" ? "بطاقة NFC غير مسجلة لأي تلميذ!" : "Carte NFC non reconnue !",
        timestamp: result.timestamp || new Date().toLocaleTimeString("fr-FR"),
      });
      toastFn(lang === "ar" ? "بطاقة غير مسجلة! اضغط لربطها بتلميذ" : "Carte non attribuée ! Cliquez pour l'assigner");
    }
  };

  // Check Web NFC API availability (for mobile Chrome)
  useEffect(() => {
    if ("NDEFReader" in window) {
      setNfcSupported(true);
    }
  }, []);

  // Keep input focused for manual keyboard wedge scanners if needed
  useEffect(() => {
    const focusTimer = setInterval(() => {
      if (inputRef.current && document.activeElement !== inputRef.current && !assignModalStudent) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea" && tag !== "select") {
          inputRef.current.focus();
        }
      }
    }, 2000);
    return () => clearInterval(focusTimer);
  }, [assignModalStudent]);

  // ── Manual Input or Barcode Submit ──
  const handleManualSubmit = async (e) => {
    if (e) e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;

    try {
      const res = await fetch(`${API_BASE_URL}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardUid: code }),
      });
      const resJson = await res.json();
      handleBackendScanEvent(resJson);
    } catch (err) {
      console.warn("Manual scan fallback:", err);
    }
    setManualCode("");
  };

  // ── Save Card Assignment via Backend API ──
  const handleSaveAssignedCard = async (studentId, cardUid) => {
    const trimmed = cardUid.trim();
    if (!trimmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, cardUid: trimmed }),
      });
      const resJson = await res.json();
      if (!resJson.success) {
        toastFn(resJson.message || "Erreur d'attribution");
        return;
      }
    } catch (err) {
      console.warn("Backend assign error:", err);
    }

    // Update frontend state
    setData(d => ({
      ...d,
      students: (d.students || []).map(s => s.id === studentId ? { ...s, nfcCardId: trimmed.toUpperCase() } : s)
    }));
    toastFn(lang === "ar" ? "تم ربط بطاقة NFC بالتلميذ بنجاح ✓" : "Carte NFC associée à l'élève ✓");
    setAssignModalStudent(null);
    setAssignCardInput("");
  };

  // Group stats for active group
  const activeStudents = useMemo(() => {
    if (!activeSubgroup) return data.students || [];
    return (data.students || []).filter(s => s.subgroupId === activeSubgroup.id);
  }, [data.students, activeSubgroup]);

  const presentStudentIds = useMemo(() => {
    return new Set(
      (data.attendances || [])
        .filter(a => a.present && a.date === todayStr)
        .map(a => a.studentId)
    );
  }, [data.attendances, todayStr]);

  const presentCount = activeStudents.filter(s => presentStudentIds.has(s.id)).length;
  const absentCount = activeStudents.length - presentCount;

  return (
    <div>
      {/* ── Header (Hidden if embedded) ───────────────────────── */}
      {!embeddedSubgroupId && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: "linear-gradient(135deg, rgba(74,222,128,0.25) 0%, rgba(99,102,241,0.25) 100%)",
                border: "1px solid rgba(74,222,128,0.4)", display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Radio size={24} color="#4ade80" />
              </div>
              <div>
                <h2 className="f-display" style={{ fontSize: 26, fontWeight: 800, color: C.ink, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  {lang === "ar" ? "تسجيل الحضور بالبطاقة الذكية (Pointage NFC)" : "Pointage par Carte NFC / Puce"}
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#4ade80", background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", padding: "2px 8px", borderRadius: 999 }}>
                    LIVE
                  </span>
                </h2>
                <div style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 3 }}>
                  {lang === "ar"
                    ? "مرر بطاقة أو شريحة NFC للتلميذ لتسجيل حضوره فورياً مع التحقق المالي وتنبيهه"
                    : "Scannez les cartes NFC / badges pour valider instantanément les présences"}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 14px", borderRadius: 10,
              background: hardwareConnected ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.1)",
              border: `1px solid ${hardwareConnected ? "rgba(74,222,128,0.35)" : "rgba(248,113,113,0.3)"}`,
              color: hardwareConnected ? "#4ade80" : "#f87171",
              fontSize: 12.5, fontWeight: 700
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: hardwareConnected ? "#4ade80" : "#f87171",
                boxShadow: hardwareConnected ? "0 0 8px #4ade80" : "none"
              }} />
              <Usb size={14} />
              <span>
                {hardwareConnected
                  ? (lang === "ar" ? "قارئ 5YOA متصل (USB HID)" : "Lecteur 5YOA connecté (USB HID)")
                  : (lang === "ar" ? "قارئ 5YOA غير متصل" : "Lecteur 5YOA déconnecté")}
              </span>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 12px", borderRadius: 10,
                background: soundEnabled ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${soundEnabled ? "rgba(74,222,128,0.35)" : C.border}`,
                color: soundEnabled ? "#4ade80" : C.inkSoft, fontSize: 12.5, fontWeight: 700, cursor: "pointer"
              }}
              title={soundEnabled ? "كتم الصوت" : "تشغيل الصوت"}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              {soundEnabled ? (lang === "ar" ? "الصوت مفعّل" : "Bip activé") : (lang === "ar" ? "صامت" : "Muet")}
            </button>
            {onBack && <IconBtn icon={ArrowLeft} onClick={onBack} title={lang === "ar" ? "رجوع" : "Retour"} />}
          </div>
        </div>
      )}

      {/* ── Group selector & Date indicator ─────────────────── */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
        padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center",
        justifyContent: "space-between", flexWrap: "wrap", gap: 14
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.inkSoft, fontSize: 13, fontWeight: 700 }}>
            <Calendar size={15} color={C.accent} />
            <span>{lang === "ar" ? "تاريخ اليوم:" : "Date :"}</span>
            <span style={{ color: C.ink, background: "rgba(255,255,255,0.08)", padding: "3px 8px", borderRadius: 6 }}>{todayStr}</span>
          </div>

          {!embeddedSubgroupId && (
            <>
              <div style={{ width: 1, height: 20, background: C.border }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: C.inkSoft, fontWeight: 700 }}>{lang === "ar" ? "الفوج المستهدف:" : "Groupe cible :"}</span>
                <select
                  value={selectedSubgroupId}
                  onChange={e => { setSelectedSubgroupId(e.target.value); setSelectedSessionId("auto"); }}
                  style={{
                    background: "rgba(255,255,255,0.08)", border: `1px solid ${C.border}`,
                    color: C.ink, padding: "6px 12px", borderRadius: 10, fontSize: 13, fontWeight: 700, outline: "none"
                  }}
                >
                  <option value="auto">{lang === "ar" ? "⚡ الكشف التلقائي (جميع الأفواج)" : "⚡ Détection automatique (tous les groupes)"}</option>
                  {subgroups.map(sg => (
                    <option key={sg.id} value={sg.id}>{sg.nom} ({sg.days?.join(", ")})</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Embedded connection info & sound toggle */}
        {embeddedSubgroupId && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 7, color: hardwareConnected ? "#4ade80" : "#f87171",
              fontSize: 12, fontWeight: 700
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: hardwareConnected ? "#4ade80" : "#f87171" }} />
              {hardwareConnected ? "NFC Connected" : "NFC Disconnected"}
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              style={{ background: "none", border: "none", color: soundEnabled ? "#4ade80" : C.inkSoft, cursor: "pointer", display: "flex" }}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        )}

        {/* Live Counter */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", padding: "4px 12px", borderRadius: 10 }}>
            <CheckCircle2 size={14} color="#4ade80" />
            <span style={{ fontSize: 12.5, fontWeight: 800, color: "#4ade80" }}>
              {lang === "ar" ? "الحاضرون:" : "Présents :"} {presentCount}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", padding: "4px 12px", borderRadius: 10 }}>
            <XCircle size={14} color="#f87171" />
            <span style={{ fontSize: 12.5, fontWeight: 800, color: "#f87171" }}>
              {lang === "ar" ? "الغياب:" : "Absents :"} {absentCount}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Scan Hub ───────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 24 }}>
        
        {/* Left: NFC Scanner Radar Card */}
        <div style={{
          background: C.surface, border: `1px solid ${lastScanned?.success ? "rgba(74,222,128,0.4)" : "rgba(226,150,58,0.3)"}`,
          borderRadius: 24, padding: "28px 24px", display: "flex", flexDirection: "column", alignItems: "center",
          textAlign: "center", position: "relative", overflow: "hidden"
        }}>
          {/* Glowing Animated NFC Radar Circle */}
          <div style={{
            position: "relative", width: 120, height: 120, borderRadius: "50%",
            background: hardwareConnected
              ? "radial-gradient(circle, rgba(74,222,128,0.2) 0%, rgba(99,102,241,0.05) 70%)"
              : "radial-gradient(circle, rgba(248,113,113,0.15) 0%, rgba(99,102,241,0.05) 70%)",
            border: `2px solid ${hardwareConnected ? "rgba(74,222,128,0.5)" : "rgba(248,113,113,0.4)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 18, boxShadow: hardwareConnected ? "0 0 30px rgba(74,222,128,0.2)" : "none"
          }}>
            <div style={{
              position: "absolute", inset: -10, borderRadius: "50%",
              border: `1.5px dashed ${hardwareConnected ? "rgba(74,222,128,0.35)" : "rgba(248,113,113,0.25)"}`,
              animation: "spin 12s linear infinite"
            }} />
            <Radio size={52} color={hardwareConnected ? "#4ade80" : "#f87171"} />
          </div>

          <h3 className="f-display" style={{ fontSize: 20, fontWeight: 800, color: C.ink, margin: "0 0 6px" }}>
            {hardwareConnected
              ? (lang === "ar" ? "جاهز لقراءة بطاقات NFC" : "Prêt à scanner les cartes NFC")
              : (lang === "ar" ? "في انتظار قارئ NFC..." : "Lecteur NFC en attente...")}
          </h3>
          <p style={{ color: C.inkSoft, fontSize: 13, maxWidth: 320, margin: "0 0 20px" }}>
            {hardwareConnected
              ? (lang === "ar"
                  ? "مرر بطاقة NTAG215 للتلميذ فوق القارئ لتسجيل حضوره تلقائياً وفورياً"
                  : "Approchez la carte NTAG215 de l'élève sur le lecteur 5YOA pour valider sa présence")
              : (lang === "ar"
                  ? "تأكد من توصيل قارئ 5YOA بمنفذ USB على جهازك"
                  : "Vérifiez que le lecteur 5YOA est branché sur votre port USB")}
          </p>

          {/* Scanner Input / Manual Search & Trigger */}
          <form onSubmit={handleManualSubmit} style={{ width: "100%", maxWidth: 360, position: "relative" }}>
            <input
              ref={inputRef}
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              placeholder={lang === "ar" ? "بحث برمز البطاقة أو الاسم..." : "Code badge, UID ou recherche..."}
              style={{
                width: "100%", padding: "12px 42px 12px 14px",
                borderRadius: 14, border: "1.5px solid rgba(74,222,128,0.45)",
                background: "rgba(255,255,255,0.07)", color: C.ink, fontSize: 14,
                fontWeight: 700, outline: "none", boxSizing: "border-box"
              }}
            />
            <button
              type="submit"
              style={{
                position: "absolute", right: isRTL ? "auto" : 8, left: isRTL ? 8 : "auto", top: "50%",
                transform: "translateY(-50%)", background: C.accent, border: "none", borderRadius: 8,
                width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                color: "#120e2e", cursor: "pointer"
              }}
              title={lang === "ar" ? "تسجيل" : "Valider"}
            >
              <Check size={16} />
            </button>
          </form>
        </div>

        {/* Right: Last Scanned Result & Student Live Profile */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: "24px",
          display: "flex", flexDirection: "column", justifyContent: "center"
        }}>
          {lastScanned ? (
            lastScanned.success ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  {lastScanned.isDuplicate ? (
                    <span style={{
                      fontSize: 12, fontWeight: 800, color: "#fbbf24", background: "rgba(251,191,36,0.15)",
                      border: "1px solid rgba(251,191,36,0.3)", padding: "4px 10px", borderRadius: 999,
                      display: "inline-flex", alignItems: "center", gap: 5
                    }}>
                      <AlertTriangle size={13} /> {lang === "ar" ? "تنبيه: تم تسجيل الحضور مسبقاً" : "Pointage déjà enregistré"}
                    </span>
                  ) : (
                    <span style={{
                      fontSize: 12, fontWeight: 800, color: "#4ade80", background: "rgba(74,222,128,0.15)",
                      border: "1px solid rgba(74,222,128,0.3)", padding: "4px 10px", borderRadius: 999,
                      display: "inline-flex", alignItems: "center", gap: 5
                    }}>
                      <CheckCircle2 size={13} /> {lang === "ar" ? "تم تسجيل الحضور بنجاح" : "Présence confirmée"}
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700 }}>
                    {lastScanned.timestamp}
                  </span>
                </div>

                {/* Student Card Info */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: "rgba(226,150,58,0.2)", border: `2px solid ${C.accent}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, fontWeight: 800, color: C.accent
                  }}>
                    {lastScanned.student?.prenom?.[0]}{lastScanned.student?.nom?.[0]}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.ink }}>
                      {lastScanned.student?.prenom} {lastScanned.student?.nom}
                    </h4>
                    <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 2 }}>
                      {lastScanned.subgroup?.nom || (lang === "ar" ? "فوج غير محدد" : "Groupe")} · {lastScanned.student?.phone || "—"}
                    </div>
                  </div>
                </div>

                {/* Duplicate Warning Notice */}
                {lastScanned.isDuplicate && (
                  <div style={{
                    background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)",
                    borderRadius: 12, padding: "10px 14px", marginBottom: 14, fontSize: 12.5,
                    color: "#fbbf24", display: "flex", alignItems: "center", gap: 8
                  }}>
                    <Clock size={16} />
                    <span>
                      {lang === "ar"
                        ? `تم تسجيل الحضور بالفعل. انتظر ${lastScanned.remainingSeconds || 10} ثوانٍ لتفادي التكرار.`
                        : `Présence déjà validée. Patientez ${lastScanned.remainingSeconds || 10}s pour un nouveau scan.`}
                    </span>
                  </div>
                )}

                {/* Financial Status Box */}
                {lastScanned.financial && (
                  <div style={{
                    background: lastScanned.financial.totalUnpaid > 0 ? "rgba(248,113,113,0.08)" : "rgba(74,222,128,0.08)",
                    border: `1px solid ${lastScanned.financial.totalUnpaid > 0 ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.3)"}`,
                    borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between"
                  }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: lastScanned.financial.totalUnpaid > 0 ? "#f87171" : "#4ade80", textTransform: "uppercase" }}>
                        {lang === "ar" ? "الوضعية المالية للمستحقات" : "Statut des paiements"}
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginTop: 2 }}>
                        {lastScanned.financial.totalUnpaid > 0
                          ? `${lang === "ar" ? "تنبيه: متبقي عليه" : "Reste à payer :"} ${lastScanned.financial.totalUnpaid.toLocaleString()} DA`
                          : (lang === "ar" ? "جميع المستحقات مسددة ومستوفاة ✓" : "Tous les paiements sont à jour ✓")}
                      </div>
                    </div>
                    {lastScanned.financial.totalUnpaid > 0 && (
                      <AlertTriangle size={20} color="#f87171" />
                    )}
                  </div>
                )}

                {/* Quick Profile Link */}
                <button
                  onClick={() => onNav && onNav({ screen: "student", studentId: lastScanned.student?.id })}
                  style={{
                    width: "100%", padding: "10px", borderRadius: 12,
                    background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
                    color: C.ink, fontSize: 13, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                  }}
                >
                  <Eye size={15} color={C.accent} />
                  {lang === "ar" ? "عرض الملف الشامل للتلميذ" : "Voir la fiche élève"}
                </button>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "20px 10px" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <XCircle size={26} color="#f87171" />
                </div>
                <h4 style={{ margin: "0 0 6px", fontSize: 16, color: "#f87171", fontWeight: 700 }}>
                  {lastScanned.message}
                </h4>
                <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 16 }}>
                  {lang === "ar" ? "هذه البطاقة غير مربوطة بأي تلميذ في النظام." : "Cette carte NFC n'est associée à aucun élève."}
                </div>

                {lastScanned.isUnknown && (
                  <button
                    onClick={() => {
                      const firstStudent = (data.students || [])[0];
                      if (firstStudent) {
                        setAssignModalStudent(firstStudent);
                        setAssignCardInput(lastScanned.code || "");
                      }
                    }}
                    style={{
                      padding: "8px 16px", borderRadius: 10,
                      background: C.accent, border: "none", color: "#120e2e",
                      fontSize: 13, fontWeight: 700, cursor: "pointer",
                      display: "inline-flex", alignItems: "center", gap: 6
                    }}
                  >
                    <CreditCard size={15} />
                    {lang === "ar" ? "ربط هذه البطاقة بتلميذ الآن" : "Attribuer cette carte à un élève"}
                  </button>
                )}
              </div>
            )
          ) : (
            <div style={{ textAlign: "center", padding: "40px 10px", color: C.inkSoft }}>
              <Radio size={36} color="rgba(255,255,255,0.2)" style={{ margin: "0 auto 10px", display: "block" }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {lang === "ar" ? "في انتظار المسح الأول..." : "En attente du premier scan..."}
              </div>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>
                {lang === "ar" ? "ستظهر بيانات التلميذ المسجل هنا مباشرة" : "Les détails de l'élève pointé s'afficheront ici"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Scanned Students Table / Feed ────────────── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h3 className="f-display" style={{ fontSize: 17, fontWeight: 700, color: C.ink, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <UserCheck size={18} color="#4ade80" />
            {lang === "ar" ? "سجل الحضور المسجل لليوم" : "Présences enregistrées aujourd'hui"} ({recentScans.length})
          </h3>
          <span style={{ fontSize: 12, color: C.inkSoft }}>
            {lang === "ar" ? "يتم إرسال إشعار فوري في حساب التلميذ عند كل تسجيل" : "Notification automatique transmise à chaque pointage"}
          </span>
        </div>

        {recentScans.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: C.inkSoft, fontSize: 13 }}>
            {lang === "ar" ? "لم يتم تسجيل أي تلميذ بعد اليوم" : "Aucun pointage enregistré pour l'instant"}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {recentScans.map((r, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${C.border}`, flexWrap: "wrap", gap: 10
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: "rgba(74,222,128,0.15)",
                    border: "1px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#4ade80"
                  }}>
                    {r.student?.prenom?.[0]}{r.student?.nom?.[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>
                      {r.student?.prenom} {r.student?.nom}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.inkSoft }}>
                      {r.subgroup?.nom || "—"} · {r.student?.phone || "—"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Financial status */}
                  <span style={{
                    fontSize: 11.5, fontWeight: 700,
                    color: r.financial?.totalUnpaid > 0 ? "#f87171" : "#4ade80",
                    background: r.financial?.totalUnpaid > 0 ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.1)",
                    border: `1px solid ${r.financial?.totalUnpaid > 0 ? "rgba(248,113,113,0.25)" : "rgba(74,222,128,0.25)"}`,
                    padding: "3px 8px", borderRadius: 6
                  }}>
                    {r.financial?.totalUnpaid > 0
                      ? `${lang === "ar" ? "باقي:" : "Reste :"} ${r.financial.totalUnpaid} DA`
                      : (lang === "ar" ? "مستوفى ✓" : "À jour ✓")}
                  </span>

                  <span className="f-mono" style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700 }}>
                    {r.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Assign NFC Cards Management Section ──────────────── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h3 className="f-display" style={{ fontSize: 17, fontWeight: 700, color: C.ink, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <CreditCard size={18} color={C.accent} />
              {lang === "ar" ? "إدارة وربط بطاقات NFC بالتلاميذ" : "Gestion et association des badges NFC"}
            </h3>
            <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 2 }}>
              {lang === "ar" ? "قم بربط كل تلميذ ببطاقة NFC أو شريحة خاصة به لتمكينه من المسح الفوري" : "Attribuez des identifiants de cartes NFC aux élèves"}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", padding: "4px 10px", borderRadius: 10, border: `1px solid ${C.border}` }}>
            <Search size={14} color={C.inkSoft} />
            <input
              type="text"
              value={quickSearch}
              onChange={e => setQuickSearch(e.target.value)}
              placeholder={lang === "ar" ? "بحث عن تلميذ..." : "Rechercher..."}
              style={{ background: "transparent", border: "none", color: C.ink, fontSize: 12.5, outline: "none", width: 140 }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10, maxHeight: 360, overflowY: "auto" }}>
          {(data.students || [])
            .filter(s => {
              if (!quickSearch.trim()) return true;
              const q = quickSearch.toLowerCase().trim();
              return `${s.prenom} ${s.nom}`.toLowerCase().includes(q) || (s.phone || "").includes(q);
            })
            .slice(0, 30)
            .map(st => {
              const sg = subgroups.find(g => g.id === st.subgroupId);
              const hasCard = !!st.nfcCardId;

              return (
                <div
                  key={st.id}
                  style={{
                    background: "rgba(255,255,255,0.03)", border: `1px solid ${hasCard ? "rgba(74,222,128,0.25)" : C.border}`,
                    borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>
                      {st.prenom} {st.nom}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.inkSoft }}>
                      {sg?.nom || "—"} {hasCard ? "· Carte configurée ✓" : "· Sans carte"}
                    </div>
                  </div>

                  <button
                    onClick={() => { setAssignModalStudent(st); setAssignCardInput(st.nfcCardId || ""); }}
                    style={{
                      padding: "5px 10px", borderRadius: 8, border: "none",
                      background: hasCard ? "rgba(74,222,128,0.15)" : C.accentSoft,
                      color: hasCard ? "#4ade80" : C.accent, fontSize: 11.5, fontWeight: 700,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                    }}
                  >
                    <CreditCard size={12} />
                    {hasCard ? (lang === "ar" ? "تعديل البطاقة" : "Modifier") : (lang === "ar" ? "+ ربط بطاقة" : "+ Assigner")}
                  </button>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── Modal: Assign NFC Card ───────────────────────────── */}
      {assignModalStudent && (
        <Modal
          title={lang === "ar" ? `ربط بطاقة NFC للتلميذ: ${assignModalStudent.prenom} ${assignModalStudent.nom}` : `Assigner une carte NFC : ${assignModalStudent.prenom} ${assignModalStudent.nom}`}
          onClose={() => setAssignModalStudent(null)}
        >
          <div style={{ display: "grid", gap: 16 }}>
            {/* Student selection if needed */}
            <Field label={lang === "ar" ? "التلميذ المحدد" : "Élève sélectionné"}>
              <select
                value={assignModalStudent.id}
                onChange={e => {
                  const found = (data.students || []).find(s => s.id === e.target.value);
                  if (found) {
                    setAssignModalStudent(found);
                    setAssignCardInput(found.nfcCardId || "");
                  }
                }}
                style={{
                  width: "100%", padding: "10px", borderRadius: 10,
                  border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.08)",
                  color: C.ink, fontSize: 13.5, fontWeight: 700, outline: "none"
                }}
              >
                {(data.students || []).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.prenom} {s.nom} ({s.phone || "—"})
                  </option>
                ))}
              </select>
            </Field>

            <Field label={lang === "ar" ? "رمز بطاقة NFC" : "Code du badge NFC"}>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  autoFocus
                  value={assignCardInput}
                  onChange={e => setAssignCardInput(e.target.value)}
                  placeholder={lang === "ar" ? "مرر البطاقة على القارئ الآن..." : "Approchez la carte sur le lecteur 5YOA..."}
                  style={{
                    width: "100%", padding: "12px", borderRadius: 10,
                    border: `1.5px solid ${C.accent}`, background: "rgba(255,255,255,0.08)",
                    color: C.ink, fontSize: 14, fontWeight: 700, outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>
            </Field>

            <div style={{
              background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)",
              borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#4ade80", display: "flex", alignItems: "center", gap: 8
            }}>
              <Sparkles size={16} />
              <span>
                {lang === "ar"
                  ? "💡 المسح التلقائي مفعّل: ضع البطاقة على قارئ 5YOA وسيكتب الرمز فورياً."
                  : "💡 Détection en direct : Posez la carte sur le lecteur 5YOA pour capturer son identifiant automatiquement."}
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <PrimaryBtn full onClick={() => handleSaveAssignedCard(assignModalStudent.id, assignCardInput)}>
                <Check size={16} />
                {lang === "ar" ? "حفظ وربط البطاقة" : "Enregistrer et associer"}
              </PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
