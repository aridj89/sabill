import React, { useState, useEffect, useRef } from "react";
import { Radio, CheckCircle2, Usb, AlertTriangle } from "lucide-react";
import { C, inputStyle, uid } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Modal from "../../components/ui/Modal";
import Field from "../../components/ui/Field";
import { API_BASE_URL } from "../../config/api";

const NFC_API_URL = `${API_BASE_URL}/api/nfc`;

function playScanTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch {}
}

function generateStudentCode(existingStudents) {
  const maxNum = (existingStudents || []).reduce((max, st) => {
    const match = (st.studentCode || "").match(/STU-(\d+)/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `STU-${String(maxNum + 1).padStart(3, "0")}`;
}

const GROUP_TYPES = [
  { value: "Normal", labelFr: "Groupe Normal", labelAr: "مجموعة عادية", color: "#818cf8" },
  { value: "Spéciale", labelFr: "Groupe Spéciale", labelAr: "مجموعة خاصة", color: "#4ade80" },
  { value: "Individuel", labelFr: "Individuel", labelAr: "فردي", color: "#f472b6" },
];

export default function StudentFormModal({ groupId, initial, enrollmentFee, onClose, onSave, allStudents, allGroups, allSubgroups }) {
  const { t, lang } = useLanguage();
  const isEdit = !!initial;

  const [form, setForm] = useState(initial ? {
    nom: initial.nom || "",
    prenom: initial.prenom || "",
    phone: initial.phone || "",
    password: initial.password || uid().slice(0, 6),
    school: initial.school || "",
    studyClass: initial.studyClass || "",
    nfcCardId: initial.nfcCardId || "",
    enrollmentPaid: !!initial.enrollmentPaid,
    enrollmentDate: initial.enrollmentDate || new Date().toISOString().slice(0, 10),
    monthlyPrice: initial.monthlyPrice || initial.montant || 0,
    groupId: initial.groupId || groupId || "",
    studentCode: initial.studentCode || generateStudentCode(allStudents),
    accountStatus: initial.accountStatus || "active",
  } : {
    nom: "",
    prenom: "",
    phone: "",
    password: uid().slice(0, 6),
    nfcCardId: "",
    enrollmentPaid: false,
    enrollmentDate: new Date().toISOString().slice(0, 10),
    monthlyPrice: 0,
    groupId: groupId || "",
    studentCode: generateStudentCode(allStudents),
    accountStatus: "active",
  });

  const [nfcConnected, setNfcConnected] = useState(false);
  const [justScanned, setJustScanned] = useState(false);
  const [showPassword, setShowPassword] = useState(!isEdit);
  const justScannedTimer = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Live 5YOA NFC Reader Stream Connection ──
  useEffect(() => {
    let eventSource = null;

    // Check status
    const checkStatus = async () => {
      try {
        const res = await fetch(`${NFC_API_URL}/status`);
        const json = await res.json();
        if (json.success && json.reader) {
          setNfcConnected(!!json.reader.connected);
        }
      } catch (err) {
        setNfcConnected(false);
      }
    };
    checkStatus();

    // Subscribe to SSE stream for live card taps
    try {
      eventSource = new EventSource(`${NFC_API_URL}/stream`);

      eventSource.addEventListener("connected", (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.readerStatus) {
            setNfcConnected(!!payload.readerStatus.connected);
          }
        } catch (_) {}
      });

      eventSource.addEventListener("status_change", (e) => {
        try {
          const payload = JSON.parse(e.data);
          setNfcConnected(!!payload.connected);
        } catch (_) {}
      });

      eventSource.addEventListener("card_scanned", (e) => {
        try {
          const result = JSON.parse(e.data);
          if (result && result.cardUid) {
            const uidClean = result.cardUid.toUpperCase().trim();
            set("nfcCardId", uidClean);
            setJustScanned(true);
            playScanTone();

            clearTimeout(justScannedTimer.current);
            justScannedTimer.current = setTimeout(() => {
              setJustScanned(false);
            }, 3500);
          }
        } catch (err) {
          console.error("Error reading NFC card in modal:", err);
        }
      });

      eventSource.onerror = () => {
        setNfcConnected(false);
      };
    } catch (err) {
      console.warn("SSE error in StudentFormModal:", err);
    }

    return () => {
      if (eventSource) eventSource.close();
      clearTimeout(justScannedTimer.current);
    };
  }, []);

  // Check NFC uniqueness
  const nfcDuplicate = form.nfcCardId && (allStudents || []).some(
    s => s.id !== initial?.id && s.nfcCardId && s.nfcCardId.toUpperCase() === form.nfcCardId.toUpperCase()
  );

  const handleSave = () => {
    if (!form.nom.trim() && !form.prenom.trim()) return;
    if (nfcDuplicate) return;
    const student = {
      ...(initial || {}),
      id: initial?.id || uid(),
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      phone: (form.phone || "").trim(),
      password: form.password || uid().slice(0, 6),
      school: (form.school || "").trim(),
      studyClass: (form.studyClass || "").trim(),
      nfcCardId: (form.nfcCardId || "").trim().toUpperCase(),
      groupId: form.groupId || groupId || "",
      monthlyPrice: Number(form.monthlyPrice) || 0,
      montant: Number(form.monthlyPrice) || 0,
      enrollmentPaid: !!form.enrollmentPaid,
      enrollmentDate: form.enrollmentDate,
      studentCode: form.studentCode || generateStudentCode(allStudents),
      accountStatus: form.accountStatus || "active",
      createdAt: initial?.createdAt || new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
    onSave(student);
  };

  const isValid = (form.nom.trim() || form.prenom.trim()) && !nfcDuplicate;

  // Build group options
  const groups = allGroups || allSubgroups || [];
  const getGroupTypeLabel = (gt) => {
    const found = GROUP_TYPES.find(g => g.value === gt);
    return found ? (lang === "ar" ? found.labelAr : found.labelFr) : gt;
  };

  const selectStyle = {
    ...inputStyle,
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23999' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: "right 8px center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "16px",
    paddingRight: 30,
  };

  return (
    <Modal
      title={isEdit
        ? (lang === "ar" ? "تعديل بيانات التلميذ" : "Modifier l'élève")
        : (lang === "ar" ? "إضافة تلميذ جديد" : "Ajouter un élève")
      }
      onClose={onClose}
    >
      {/* Student ID badge (auto-generated) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "8px 12px", borderRadius: 10, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
          {lang === "ar" ? "رمز التلميذ" : "Student ID"}
        </span>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#818cf8", fontFamily: "monospace", letterSpacing: 1 }}>
          {form.studentCode}
        </span>
        {form.accountStatus === "active" && (
          <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.15)", padding: "2px 8px", borderRadius: 999 }}>
            {lang === "ar" ? "نشط" : "Actif"}
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={lang === "ar" ? "اللقب" : "Nom"}>
          <input autoFocus style={inputStyle} placeholder="Kaci" value={form.nom} onChange={e => set("nom", e.target.value)} />
        </Field>
        <Field label={lang === "ar" ? "الاسم" : "Prénom"}>
          <input style={inputStyle} placeholder="Yasmine" value={form.prenom} onChange={e => set("prenom", e.target.value)} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={lang === "ar" ? "المدرسة (اختياري)" : "École (Optionnel)"}>
          <input style={inputStyle} placeholder={lang === "ar" ? "ثانوية الأمير عبد القادر" : "Lycée Emir Abdelkader"} value={form.school || ""} onChange={e => set("school", e.target.value)} />
        </Field>
        <Field label={lang === "ar" ? "الصف (اختياري)" : "Classe (Optionnel)"}>
          <input style={inputStyle} placeholder={lang === "ar" ? "1 AS" : "1 AS"} value={form.studyClass || ""} onChange={e => set("studyClass", e.target.value)} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={lang === "ar" ? "رقم الهاتف (معرف الدخول)" : "Téléphone (Identifiant)"}>
          <input style={inputStyle} placeholder="0550112233" value={form.phone} onChange={e => set("phone", e.target.value)} />
        </Field>
        <Field label={lang === "ar" ? "كلمة المرور" : "Mot de passe"}>
          <div style={{ position: "relative" }}>
            <input
              style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: 2, paddingRight: 70 }}
              type={showPassword ? "text" : "password"}
              readOnly={isEdit}
              value={form.password}
              onChange={e => {
                if (!isEdit) set("password", e.target.value);
              }}
            />
            <div style={{ position: "absolute", right: 4, top: 4, bottom: 4, display: "flex", gap: 2 }}>
              <button
                onClick={() => setShowPassword(!showPassword)}
                style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, color: C.inkSoft, cursor: "pointer", padding: "0 6px", fontSize: 11, fontWeight: 700 }}
                title={showPassword ? "Hide" : "Show"}
              >
                {showPassword ? "👁" : "👁‍🗨"}
              </button>
              <button
                onClick={() => set("password", uid().slice(0, 6))}
                style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, color: C.inkSoft, cursor: "pointer", padding: "0 6px", fontSize: 12, fontWeight: 700 }}
                title={lang === "ar" ? "توليد كلمة مرور جديدة" : "Générer"}
              >
                ↻
              </button>
            </div>
          </div>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={lang === "ar" ? "المجموعة" : "Groupe"}>
          <select
            style={selectStyle}
            value={form.groupId}
            onChange={e => set("groupId", e.target.value)}
          >
            <option value="">{lang === "ar" ? "-- اختر مجموعة --" : "-- Sélectionner --"}</option>
            {groups.map(sg => (
              <option key={sg.id} value={sg.id}>
                {sg.nom} ({sg.groupType || "Normal"})
              </option>
            ))}
          </select>
        </Field>
        <Field label={lang === "ar" ? "السعر الشهري (DA)" : "Prix mensuel (DA)"}>
          <input
            type="number"
            min={0}
            style={inputStyle}
            placeholder="2500"
            value={form.monthlyPrice}
            onChange={e => set("monthlyPrice", e.target.value)}
          />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={lang === "ar" ? "تاريخ التسجيل" : "Date d'inscription"}>
          <input type="date" style={inputStyle} value={form.enrollmentDate} onChange={e => set("enrollmentDate", e.target.value)} />
        </Field>
        <Field label={lang === "ar" ? "حالة الحساب" : "Statut du compte"}>
          <div style={{ display: "flex", gap: 6 }}>
            {["active", "inactive"].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => set("accountStatus", s)}
                style={{
                  flex: 1, padding: "9px 8px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
                  border: `1.5px solid ${form.accountStatus === s ? (s === "active" ? "rgba(74,222,128,0.5)" : "rgba(248,113,113,0.5)") : "rgba(255,255,255,0.15)"}`,
                  background: form.accountStatus === s ? (s === "active" ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)") : "rgba(255,255,255,0.04)",
                  color: form.accountStatus === s ? (s === "active" ? "#4ade80" : "#f87171") : "rgba(255,255,255,0.5)",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {s === "active" ? (lang === "ar" ? "نشط ✓" : "Actif ✓") : (lang === "ar" ? "معطل ✗" : "Inactif ✗")}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {/* ── NFC Card Field with live scan support ── */}
      <Field
        label={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <span>{lang === "ar" ? "بطاقة NFC / الرمز (UID)" : "Puce / Carte NFC"}</span>
            {nfcConnected && (
              <span style={{
                fontSize: 10.5, fontWeight: 700, color: "#4ade80",
                display: "inline-flex", alignItems: "center", gap: 4,
                background: "rgba(74,222,128,0.12)", padding: "1px 7px", borderRadius: 999
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} />
                {lang === "ar" ? "مسح مباشر" : "Scan direct"}
              </span>
            )}
          </div>
        }
      >
        <div style={{ position: "relative" }}>
          <input
            style={{
              ...inputStyle,
              borderColor: nfcDuplicate ? "#f87171" : justScanned ? "#4ade80" : form.nfcCardId ? C.accent : inputStyle.borderColor,
              boxShadow: nfcDuplicate ? "0 0 14px rgba(248,113,113,0.35)" : justScanned ? "0 0 14px rgba(74,222,128,0.35)" : "none",
              transition: "all 0.25s ease",
              paddingRight: form.nfcCardId ? 38 : 12,
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: 1
            }}
            placeholder={lang === "ar" ? "مرر بطاقة NTAG215..." : "Passez la carte sur le lecteur..."}
            value={form.nfcCardId}
            onChange={e => set("nfcCardId", e.target.value.toUpperCase())}
          />
          {form.nfcCardId && (
            <button
              type="button"
              onClick={() => set("nfcCardId", "")}
              style={{
                position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 6,
                color: C.inkSoft, cursor: "pointer", padding: "2px 7px", fontSize: 11, fontWeight: 700
              }}
              title={lang === "ar" ? "مسح" : "Effacer"}
            >
              ✕
            </button>
          )}
        </div>
        <div style={{ fontSize: 11, color: nfcDuplicate ? "#f87171" : justScanned ? "#4ade80" : C.inkSoft, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
          {nfcDuplicate ? (
            <>
              <AlertTriangle size={13} color="#f87171" />
              <span>{lang === "ar" ? "هذه البطاقة مرتبطة بطالب آخر!" : "Cette carte est déjà attribuée à un autre élève !"}</span>
            </>
          ) : justScanned ? (
            <>
              <CheckCircle2 size={13} color="#4ade80" />
              <span>{lang === "ar" ? "تم التقاط رمز البطاقة فورياً!" : "Carte scannée avec succès !"}</span>
            </>
          ) : nfcConnected ? (
            <>
              <Radio size={13} color={C.accent} />
              <span>{lang === "ar" ? "ضع البطاقة فوق قارئ 5YOA وسيكتب الرمز تلقائياً" : "Approchez la carte sur le lecteur 5YOA pour remplir l'ID"}</span>
            </>
          ) : (
            <span>{lang === "ar" ? "يمكنك كتابة معرف البطاقة يدوياً" : "Saisissez l'ID ou connectez le lecteur USB"}</span>
          )}
        </div>
      </Field>

      {/* Frais d'inscription */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 12, background: form.enrollmentPaid ? "rgba(74,222,128,0.1)" : "rgba(251,191,36,0.1)", border: `1px solid ${form.enrollmentPaid ? "rgba(74,222,128,0.3)" : "rgba(251,191,36,0.3)"}`, marginTop: 4 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
            {lang === "ar" ? "رسوم التسجيل" : "Frais d'inscription"}
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 800, color: C.accent }}>
              {enrollmentFee || 500} DA
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 2 }}>
            {form.enrollmentPaid
              ? (lang === "ar" ? "مدفوعة ✓" : "Payés ✓")
              : (lang === "ar" ? "غير مدفوعة" : "Non payés")
            }
          </div>
        </div>
        <button
          type="button"
          onClick={() => set("enrollmentPaid", !form.enrollmentPaid)}
          style={{
            padding: "7px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, border: "none",
            background: form.enrollmentPaid ? "rgba(74,222,128,0.25)" : "rgba(251,191,36,0.25)",
            color: form.enrollmentPaid ? "#4ade80" : "#fbbf24",
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          {form.enrollmentPaid
            ? (lang === "ar" ? "تحديد كغير مدفوع" : "Marquer impayé")
            : (lang === "ar" ? "تحديد كمدفوع" : "Marquer payé")
          }
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <PrimaryBtn full onClick={handleSave} disabled={!isValid}>
          {isEdit
            ? (lang === "ar" ? "حفظ التعديلات" : "Enregistrer")
            : (lang === "ar" ? "إنشاء التلميذ والحساب" : "Créer l'élève et le compte")}
        </PrimaryBtn>
      </div>
    </Modal>
  );
}
