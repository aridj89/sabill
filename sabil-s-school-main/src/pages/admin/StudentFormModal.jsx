import React, { useState, useEffect, useRef } from "react";
import { Radio, CheckCircle2, Usb, AlertTriangle } from "lucide-react";
import { C, inputStyle, uid } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Modal from "../../components/ui/Modal";
import Field from "../../components/ui/Field";
import PrimaryBtn from "../../components/ui/PrimaryBtn";

const API_BASE_URL = "http://localhost:5000/api/nfc";

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

export default function StudentFormModal({ subgroupId, initial, enrollmentFee, onClose, onSave }) {
  const { t, lang } = useLanguage();
  const isEdit = !!initial;

  const [form, setForm] = useState(initial ? {
    nom: initial.nom,
    prenom: initial.prenom,
    phone: initial.phone || "",
    password: initial.password || "",
    nfcCardId: initial.nfcCardId || "",
    enrollmentPaid: initial.enrollmentPaid,
    enrollmentDate: initial.enrollmentDate || new Date().toISOString().slice(0, 10),
  } : {
    nom: "",
    prenom: "",
    phone: "",
    password: uid().slice(0, 6),
    nfcCardId: "",
    enrollmentPaid: false,
    enrollmentDate: new Date().toISOString().slice(0, 10),
  });

  const [nfcConnected, setNfcConnected] = useState(false);
  const [justScanned, setJustScanned] = useState(false);
  const justScannedTimer = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Live 5YOA NFC Reader Stream Connection ──
  useEffect(() => {
    let eventSource = null;

    // Check status
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/status`);
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
      eventSource = new EventSource(`${API_BASE_URL}/stream`);

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

  const handleSave = () => {
    if (!form.nom.trim() || !form.prenom.trim() || !form.phone.trim()) return;
    const student = {
      id: initial?.id || uid(),
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      phone: form.phone.trim(),
      password: form.password,
      nfcCardId: (form.nfcCardId || "").trim().toUpperCase(),
      subgroupId: subgroupId ?? initial?.subgroupId,
      enrollmentPaid: form.enrollmentPaid,
      enrollmentDate: form.enrollmentDate,
    };
    onSave(student);
  };

  const isValid = form.nom.trim() && form.prenom.trim() && form.phone.trim();

  return (
    <Modal
      title={isEdit
        ? (lang === "ar" ? "تعديل بيانات التلميذ" : "Modifier l'élève")
        : (lang === "ar" ? "إضافة تلميذ جديد" : "Ajouter un élève")
      }
      onClose={onClose}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={lang === "ar" ? "اللقب" : "Nom"}>
          <input autoFocus style={inputStyle} placeholder="Kaci" value={form.nom} onChange={e => set("nom", e.target.value)} />
        </Field>
        <Field label={lang === "ar" ? "الاسم" : "Prénom"}>
          <input style={inputStyle} placeholder="Yasmine" value={form.prenom} onChange={e => set("prenom", e.target.value)} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={lang === "ar" ? "رقم الهاتف (معرف الدخول)" : "Téléphone (Identifiant)"}>
          <input style={inputStyle} placeholder="0550112233" value={form.phone} onChange={e => set("phone", e.target.value)} />
        </Field>
        <Field label={lang === "ar" ? "كلمة المرور المؤقتة" : "Mot de passe généré"}>
          <div style={{ position: "relative" }}>
            <input style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: 2, paddingRight: 40 }} readOnly value={form.password} />
            <button
              onClick={() => set("password", uid().slice(0, 6))}
              style={{ position: "absolute", right: 6, top: 6, bottom: 6, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, color: C.inkSoft, cursor: "pointer", padding: "0 8px", fontSize: 12, fontWeight: 700 }}
              title={lang === "ar" ? "توليد كلمة مرور جديدة" : "Générer un nouveau mot de passe"}
            >
              ↻
            </button>
          </div>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={lang === "ar" ? "تاريخ التسجيل" : "Date d'inscription"}>
          <input type="date" style={inputStyle} value={form.enrollmentDate} onChange={e => set("enrollmentDate", e.target.value)} />
        </Field>

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
                borderColor: justScanned ? "#4ade80" : form.nfcCardId ? C.accent : inputStyle.borderColor,
                boxShadow: justScanned ? "0 0 14px rgba(74,222,128,0.35)" : "none",
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
          <div style={{ fontSize: 11, color: justScanned ? "#4ade80" : C.inkSoft, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            {justScanned ? (
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
      </div>

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
            : (lang === "ar" ? "إضافة التلميذ" : "Ajouter l'élève")}
        </PrimaryBtn>
      </div>
    </Modal>
  );
}
