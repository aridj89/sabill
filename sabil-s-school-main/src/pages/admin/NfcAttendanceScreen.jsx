import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Radio, CheckCircle2, XCircle, AlertTriangle, Users,
  Calendar, Clock, Search, ArrowLeft, RefreshCw, Smartphone,
  CreditCard, ShieldCheck, Volume2, VolumeX, Sparkles, UserCheck,
  Send, Plus, Trash2, Check, AlertCircle, Eye, ChevronRight
} from "lucide-react";
import { C, CAT_BY_ID, uid, getStudentFinancialSummary } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import PrimaryBtn from "../../components/ui/PrimaryBtn";
import IconBtn from "../../components/ui/IconBtn";
import Modal from "../../components/ui/Modal";
import Field from "../../components/ui/Field";

/* ── Web Audio Beep generator ── */
function playTone(success = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
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

export default function NfcAttendanceScreen({ data, setData, toastFn, onBack, onNav }) {
  const { lang, isRTL } = useLanguage();
  const todayStr = new Date().toISOString().slice(0, 10);

  // States
  const [selectedSubgroupId, setSelectedSubgroupId] = useState("auto"); // "auto" or specific sg.id
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

  const inputRef = useRef(null);

  // Check Web NFC API availability
  useEffect(() => {
    if ("NDEFReader" in window) {
      setNfcSupported(true);
    }
  }, []);

  // Keep input focused for USB barcode / NFC RFID keyboard wedge scanners
  useEffect(() => {
    const focusTimer = setInterval(() => {
      if (inputRef.current && document.activeElement !== inputRef.current && !assignModalStudent) {
        // Only focus if not interacting with another text input or modal
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea" && tag !== "select") {
          inputRef.current.focus();
        }
      }
    }, 1500);
    return () => clearInterval(focusTimer);
  }, [assignModalStudent]);

  // Subgroups and sessions list
  const subgroups = data.subgroups || [];
  const todaySessions = (data.sessions || []).filter(s => s.date === todayStr);

  // Active target subgroup & session if selected
  const activeSubgroup = selectedSubgroupId !== "auto"
    ? subgroups.find(s => s.id === selectedSubgroupId)
    : null;

  const activeGroupSessions = activeSubgroup
    ? (data.sessions || []).filter(s => s.subgroupId === activeSubgroup.id && s.date === todayStr)
    : todaySessions;

  // ── Start Web NFC Scan (Mobile sensor) ──
  const startMobileNfc = async () => {
    setNfcError("");
    if (!("NDEFReader" in window)) {
      setNfcError(lang === "ar" ? "جهازك أو متصفحك لا يدعم Web NFC" : "Web NFC non supporté sur ce navigateur");
      return;
    }
    try {
      const ndef = new window.NDEFReader();
      await ndef.scan();
      setNfcActive(true);
      toastFn(lang === "ar" ? "مستشعر NFC نشط الآن، قرّب البطاقة 📱" : "Lecteur NFC actif, approchez la carte 📱");

      ndef.onreading = (event) => {
        const serialNumber = event.serialNumber || "";
        if (serialNumber) {
          handleCardScanned(serialNumber);
        }
      };

      ndef.onreadingerror = () => {
        if (soundEnabled) playTone(false);
        setNfcError(lang === "ar" ? "تعذر قراءة بطاقة NFC، حاول ثانية" : "Erreur de lecture NFC");
      };
    } catch (err) {
      setNfcActive(false);
      setNfcError(err?.message || (lang === "ar" ? "فشل تفعيل NFC" : "Échec d'activation NFC"));
    }
  };

  // ── Process Scanned NFC / Tag Code ──
  const handleCardScanned = (rawCode) => {
    const code = (rawCode || "").trim().toLowerCase();
    if (!code) return;

    // 1. Find matching student by nfcCardId, student.id, student.phone, or name
    const students = data.students || [];
    const matched = students.find(s =>
      (s.nfcCardId && s.nfcCardId.toLowerCase() === code) ||
      (s.id && s.id.toLowerCase() === code) ||
      (s.phone && s.phone.toLowerCase() === code) ||
      (`${s.prenom} ${s.nom}`.toLowerCase() === code)
    );

    if (!matched) {
      if (soundEnabled) playTone(false);
      setLastScanned({
        success: false,
        code,
        message: lang === "ar" ? "بطاقة NFC غير مسجلة لأي تلميذ!" : "Carte NFC non reconnue !",
        timestamp: new Date().toLocaleTimeString("fr-FR"),
      });
      return;
    }

    // 2. Identify target session
    let targetSessionId = selectedSessionId !== "auto" ? selectedSessionId : null;
    let targetSg = subgroups.find(sg => sg.id === matched.subgroupId);

    if (!targetSessionId) {
      // Find today's session for this student's subgroup
      const stTodaySession = (data.sessions || []).find(s => s.subgroupId === matched.subgroupId && s.date === todayStr);
      if (stTodaySession) {
        targetSessionId = stTodaySession.id;
      } else {
        // Fallback: pick closest planned session or create one on the fly
        const stNextSession = (data.sessions || []).find(s => s.subgroupId === matched.subgroupId && s.status === "planned");
        if (stNextSession) {
          targetSessionId = stNextSession.id;
        } else {
          // Create attendance session if none exists
          targetSessionId = `sess_nfc_${todayStr}_${matched.subgroupId}`;
        }
      }
    }

    const nowTime = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const nowTimeShort = nowTime.slice(0, 5);

    // 3. Mark Attendance in data
    setData(d => {
      const existingAttIndex = (d.attendances || []).findIndex(
        a => a.studentId === matched.id && (a.sessionId === targetSessionId || a.date === todayStr)
      );

      let updatedAttendances = [...(d.attendances || [])];
      const newAttendanceRecord = {
        id: existingAttIndex >= 0 ? updatedAttendances[existingAttIndex].id : uid(),
        sessionId: targetSessionId,
        studentId: matched.id,
        present: true,
        date: todayStr,
        time: nowTimeShort,
        nfcVerified: true,
      };

      if (existingAttIndex >= 0) {
        updatedAttendances[existingAttIndex] = newAttendanceRecord;
      } else {
        updatedAttendances.push(newAttendanceRecord);
      }

      // Send Instant Student Notification
      const sgName = targetSg ? targetSg.nom : "";
      const notif = {
        id: uid(),
        userId: matched.id,
        type: "presence",
        title: lang === "ar" ? "تسجيل حضورك بالبطاقة NFC ⏱️" : "Pointage NFC validé ⏱️",
        message: lang === "ar"
          ? `تم تأكيد تسجيل حضورك في حصة ${sgName ? `(${sgName}) ` : ""}بتاريخ ${todayStr} الساعة ${nowTimeShort}.`
          : `Votre présence à la séance ${sgName ? `(${sgName}) ` : ""}a été validée par NFC le ${todayStr} à ${nowTimeShort}.`,
        date: todayStr,
        time: nowTimeShort,
        read: false,
      };

      return {
        ...d,
        attendances: updatedAttendances,
        userNotifications: [...(d.userNotifications || []), notif],
      };
    });

    if (soundEnabled) playTone(true);

    const fin = getStudentFinancialSummary(data, matched.id);

    const scanResult = {
      success: true,
      student: matched,
      subgroup: targetSg,
      timestamp: nowTime,
      financial: fin,
    };

    setLastScanned(scanResult);
    setRecentScans(prev => [scanResult, ...prev.filter(r => r.student?.id !== matched.id)].slice(0, 15));
    setManualCode("");

    toastFn(
      lang === "ar"
        ? `تم تسجيل حضور: ${matched.prenom} ${matched.nom} ✓`
        : `Présence validée : ${matched.prenom} ${matched.nom} ✓`
    );
  };

  const handleManualSubmit = (e) => {
    if (e) e.preventDefault();
    if (manualCode.trim()) {
      handleCardScanned(manualCode.trim());
    }
  };

  // ── Associate Card to Student ──
  const handleSaveAssignedCard = (studentId, cardUid) => {
    if (!cardUid.trim()) return;
    setData(d => ({
      ...d,
      students: (d.students || []).map(s => s.id === studentId ? { ...s, nfcCardId: cardUid.trim() } : s)
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
      {/* ── Header ──────────────────────────────────────────── */}
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
          {/* Sound toggle */}
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

          {/* Web NFC Mobile button */}
          {nfcSupported && (
            <button
              onClick={startMobileNfc}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 10,
                background: nfcActive ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.08)",
                border: `1px solid ${nfcActive ? "#818cf8" : C.border}`,
                color: nfcActive ? "#818cf8" : C.ink, fontSize: 12.5, fontWeight: 700, cursor: "pointer"
              }}
            >
              <Smartphone size={15} />
              {nfcActive ? (lang === "ar" ? "مستشعر الهاتف نشط ✓" : "NFC Téléphone actif ✓") : (lang === "ar" ? "تفعيل NFC الهاتف" : "Scanner NFC Mobile")}
            </button>
          )}

          {onBack && <IconBtn icon={ArrowLeft} onClick={onBack} title={lang === "ar" ? "رجوع" : "Retour"} />}
        </div>
      </div>

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

          <div style={{ width: 1, height: 20, background: C.border }} />

          {/* Subgroup selector */}
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
        </div>

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
            background: "radial-gradient(circle, rgba(74,222,128,0.2) 0%, rgba(99,102,241,0.05) 70%)",
            border: "2px solid rgba(74,222,128,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 18, boxShadow: "0 0 30px rgba(74,222,128,0.2)"
          }}>
            <div style={{
              position: "absolute", inset: -10, borderRadius: "50%",
              border: "1.5px dashed rgba(74,222,128,0.35)", animation: "spin 12s linear infinite"
            }} />
            <Radio size={52} color="#4ade80" />
          </div>

          <h3 className="f-display" style={{ fontSize: 20, fontWeight: 800, color: C.ink, margin: "0 0 6px" }}>
            {lang === "ar" ? "جاهز لقراءة بطاقات NFC" : "Prêt à scanner les cartes NFC"}
          </h3>
          <p style={{ color: C.inkSoft, fontSize: 13, maxWidth: 300, margin: "0 0 20px" }}>
            {lang === "ar"
              ? "مرر بطاقة التلميذ أمام القارئ أو استخدم مربع الإدخال للبحث السريع"
              : "Passez le badge de l'élève sur le lecteur USB ou approchez le téléphone"}
          </p>

          {/* Scanner Input / Manual Trigger */}
          <form onSubmit={handleManualSubmit} style={{ width: "100%", maxWidth: 360, position: "relative" }}>
            <input
              ref={inputRef}
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              placeholder={lang === "ar" ? "امسح بطاقة NFC أو اكتب رقم الهاتف / الاسم..." : "Code badge NFC, téléphone ou nom..."}
              autoFocus
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

          {nfcError && (
            <div style={{ marginTop: 12, color: "#f87171", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <AlertCircle size={14} /> {nfcError}
            </div>
          )}
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
                  <span style={{
                    fontSize: 12, fontWeight: 800, color: "#4ade80", background: "rgba(74,222,128,0.15)",
                    border: "1px solid rgba(74,222,128,0.3)", padding: "4px 10px", borderRadius: 999,
                    display: "inline-flex", alignItems: "center", gap: 5
                  }}>
                    <CheckCircle2 size={13} /> {lang === "ar" ? "تم تسجيل الحضور بنجاح" : "Présence confirmée"}
                  </span>
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
                    {lastScanned.student.prenom?.[0]}{lastScanned.student.nom?.[0]}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.ink }}>
                      {lastScanned.student.prenom} {lastScanned.student.nom}
                    </h4>
                    <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 2 }}>
                      {lastScanned.subgroup?.nom || (lang === "ar" ? "فوج غير محدد" : "Groupe")} · {lastScanned.student.phone || "—"}
                    </div>
                  </div>
                </div>

                {/* Financial Status Box */}
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

                {/* Quick Profile Link */}
                <button
                  onClick={() => onNav({ screen: "student", studentId: lastScanned.student.id })}
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
                <div className="f-mono" style={{ fontSize: 12, color: C.inkSoft }}>
                  UID: {lastScanned.code}
                </div>
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
                      {sg?.nom || "—"} {hasCard ? `· UID: ${st.nfcCardId}` : ""}
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
            <Field label={lang === "ar" ? "معرّف / رقم بطاقة NFC (UID)" : "Identifiant carte NFC (UID)"}>
              <input
                type="text"
                autoFocus
                value={assignCardInput}
                onChange={e => setAssignCardInput(e.target.value)}
                placeholder={lang === "ar" ? "امسح البطاقة الآن أو اكتب الرمز..." : "Passez la carte sur le lecteur ou écrivez le code..."}
                style={{
                  width: "100%", padding: "12px", borderRadius: 10,
                  border: `1.5px solid ${C.accent}`, background: "rgba(255,255,255,0.08)",
                  color: C.ink, fontSize: 14, fontWeight: 700, outline: "none", boxSizing: "border-box"
                }}
              />
            </Field>

            <p style={{ margin: 0, fontSize: 12.5, color: C.inkSoft }}>
              {lang === "ar"
                ? "💡 نصيحة: عندما يكون هذا الحقل مفتوحاً، قم بتمرير البطاقة فوق قارئ NFC وسيكتب الرمز تلقائياً."
                : "💡 Astuce : Passez le badge sur le lecteur NFC pour insérer le code automatiquement."}
            </p>

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <PrimaryBtn full onClick={() => handleSaveAssignedCard(assignModalStudent.id, assignCardInput)}>
                <Check size={16} />
                {lang === "ar" ? "حفظ وربط البطاقة" : "Enregistrer la carte"}
              </PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
