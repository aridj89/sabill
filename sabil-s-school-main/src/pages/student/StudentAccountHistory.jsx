import React, { useMemo, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, CreditCard, ClipboardList, Wallet, Clock, Radio } from "lucide-react";
import { C, getStudentFinancialSummary } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";

/* ── Helpers ─────────────────────────────────────────────────── */
const toNum = (v) => Number(v) || 0;

/** ISO timestamp → local YYYY-MM-DD */
function localYmd(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function paymentAmounts(p) {
  const expected = toNum(p?.expectedAmount || p?.amount);
  const isFullyPaid = p?.paid === true || p?.status === "paid";
  const paid = isFullyPaid ? expected : toNum(p?.paidAmount);
  return { expected, paid, remaining: Math.max(0, expected - paid) };
}

function paymentStatus(p) {
  const { paid, remaining } = paymentAmounts(p);
  if (remaining === 0 && paid > 0) return "paid";
  if (paid > 0) return "partial";
  return "unpaid";
}

/**
 * Student account: full history of payments & attendances,
 * with date and time for every entry.
 */
export default function StudentAccountHistory({ student, data }) {
  const { lang } = useLanguage();
  const L = (ar, fr) => (lang === "ar" ? ar : fr);
  const locale = lang === "ar" ? "ar-DZ" : "fr-FR";
  const [attFilter, setAttFilter] = useState("all"); // all | present | absent

  const fmtDate = (ymd) => {
    if (!ymd) return "—";
    const d = new Date(String(ymd).slice(0, 10) + "T12:00");
    if (isNaN(d)) return String(ymd);
    return d.toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  };
  const fmtTime = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d)) return null;
    return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  };

  const fin = useMemo(() => getStudentFinancialSummary(data, student.id), [data, student.id]);

  /* ── Payments history ── */
  const payments = useMemo(() => {
    const groups = data.groups || [];
    return (data.payments || [])
      .filter(p => p && p.studentId === student.id)
      .map(p => {
        const { expected, paid, remaining } = paymentAmounts(p);
        const status = paymentStatus(p);
        const dateStr = p.paidDate || (p.paidAt ? localYmd(p.paidAt) : null);
        const pType = String(p.type || p.feeType || "").toLowerCase();
        let label = p.label;
        if (!label) {
          if (["registration", "enrollment", "inscription"].includes(pType)) label = L("حقوق التسجيل", "Frais d'inscription");
          else if (["debt", "previous_debt", "dette"].includes(pType)) label = L("دين سابق", "Dette antérieure");
          else if (p.month) {
            const [y, m] = String(p.month).split("-").map(Number);
            const monthName = new Date(y, (m || 1) - 1, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
            label = L(`شهرية ${monthName}`, `Mensualité ${monthName}`);
          } else label = L(`دفعة رقم ${p.cycleNum || 1}`, `Paiement #${p.cycleNum || 1}`);
        }
        const grp = groups.find(g => g.id === (p.groupId || p.subgroupId));
        return {
          id: p.id,
          label,
          groupName: grp?.nom || "",
          note: p.note || "",
          expected, paid, remaining, status,
          date: status === "unpaid" ? null : dateStr,
          time: status === "unpaid" ? null : fmtTime(p.paidAt),
          sortKey: p.paidAt || (p.paidDate ? p.paidDate + "T00:00" : "") || "",
        };
      })
      .sort((a, b) => {
        // Unpaid first (action required), then most recent payments
        if ((a.status === "unpaid") !== (b.status === "unpaid")) return a.status === "unpaid" ? -1 : 1;
        return String(b.sortKey).localeCompare(String(a.sortKey));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.payments, data.groups, student.id, lang]);

  /* ── Attendance history ── */
  const attendances = useMemo(() => {
    const sessionsById = new Map((data.sessions || []).map(s => [s.id, s]));
    return (data.attendances || [])
      .filter(a => a && a.studentId === student.id)
      .map(a => {
        const sess = a.sessionId ? sessionsById.get(a.sessionId) : null;
        const date = a.customDate || a.date || sess?.date || null;
        // Time priority: NFC scan time → time it was marked → scheduled session time
        const time = a.time || fmtTime(a.markedAt || a.createdAt) || sess?.time || null;
        const isCustom = !!(a.customDate && a.originalDate && a.customDate !== a.originalDate);
        return {
          id: a.id,
          date,
          time,
          present: !!a.present,
          nfc: !!a.nfcVerified,
          isCustom,
          originalDate: a.originalDate,
          note: a.note || sess?.note || "",
          isExtra: !!sess?.isExtra,
          sortKey: `${date || ""}T${a.time || sess?.time || "00:00"}`,
        };
      })
      .filter(a => a.date)
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.attendances, data.sessions, student.id, lang]);

  const presentCount = attendances.filter(a => a.present).length;
  const absentCount = attendances.length - presentCount;
  const shownAttendances = attendances.filter(a =>
    attFilter === "all" ? true : attFilter === "present" ? a.present : !a.present
  );

  /* ── Styles ── */
  const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 20 };
  const h3 = { fontSize: 16, fontWeight: 700, color: C.ink, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 };
  const th = {
    textAlign: lang === "ar" ? "right" : "left", padding: "10px 12px", color: C.inkSoft, fontWeight: 700,
    borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.03)", fontSize: 12, whiteSpace: "nowrap",
  };
  const td = { padding: "10px 12px", color: C.ink, fontSize: 13, borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" };
  const pill = (color, bg) => ({
    display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700,
    color, background: bg, padding: "3px 9px", borderRadius: 999,
  });
  const statusPill = {
    paid: { c: "#4ade80", b: "rgba(74,222,128,0.15)", l: L("مدفوع", "Payé"), I: CheckCircle2 },
    partial: { c: C.accent, b: "rgba(226,150,58,0.15)", l: L("جزئي", "Partiel"), I: AlertTriangle },
    unpaid: { c: "#f87171", b: "rgba(248,113,113,0.15)", l: L("غير مدفوع", "Impayé"), I: XCircle },
  };

  const SummaryTile = ({ label, value, color, sub }) => (
    <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div className="f-mono" style={{ fontSize: 20, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 20, marginTop: 20 }}>
      {/* ── Summary ── */}
      <div style={card}>
        <h3 style={h3}>
          <Wallet size={18} color={C.accent} />
          {L("حسابي — الملخص", "Mon compte — Résumé")}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
          <SummaryTile
            label={L("المبلغ الإجمالي", "Total à payer")}
            value={`${fin.totalExpected.toLocaleString()} DA`}
            color={C.ink}
          />
          <SummaryTile
            label={L("المسدد (خلصت)", "Total payé")}
            value={`${fin.totalPaid.toLocaleString()} DA`}
            color="#4ade80"
          />
          <SummaryTile
            label={L("المتبقي (باقي)", "Reste à payer")}
            value={fin.totalUnpaid > 0 ? `${fin.totalUnpaid.toLocaleString()} DA` : L("مستوفى ✓", "À jour ✓")}
            color={fin.totalUnpaid > 0 ? "#f87171" : "#4ade80"}
          />
          <SummaryTile
            label={L("الحضور / الغياب", "Présences / Absences")}
            value={<><span style={{ color: "#4ade80" }}>{presentCount}</span> / <span style={{ color: "#f87171" }}>{absentCount}</span></>}
            color={C.ink}
            sub={attendances.length > 0 ? `${Math.round((presentCount / attendances.length) * 100)}% ${L("نسبة الحضور", "d'assiduité")}` : null}
          />
        </div>
      </div>

      {/* ── Payments history ── */}
      <div style={card}>
        <h3 style={h3}>
          <CreditCard size={18} color={fin.totalUnpaid > 0 ? "#f87171" : "#4ade80"} />
          {L("سجل المدفوعات", "Historique des paiements")}
          <span style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>({payments.length})</span>
        </h3>
        {payments.length === 0 ? (
          <div style={{ fontSize: 13, color: C.inkSoft }}>{L("لا توجد دفعات مسجلة بعد.", "Aucun paiement enregistré.")}</div>
        ) : (
          <div style={{ overflowX: "auto", borderRadius: 14, border: `1px solid ${C.border}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>{L("التاريخ", "Date")}</th>
                  <th style={th}>{L("الساعة", "Heure")}</th>
                  <th style={th}>{L("البيان", "Libellé")}</th>
                  <th style={{ ...th, textAlign: "center" }}>{L("المبلغ المطلوب", "Montant dû")}</th>
                  <th style={{ ...th, textAlign: "center" }}>{L("المسدد", "Payé")}</th>
                  <th style={{ ...th, textAlign: "center" }}>{L("المتبقي", "Reste")}</th>
                  <th style={{ ...th, textAlign: "center" }}>{L("الحالة", "Statut")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const s = statusPill[p.status];
                  return (
                    <tr key={p.id}>
                      <td style={td}>{p.date ? fmtDate(p.date) : <span style={{ color: C.inkSoft }}>—</span>}</td>
                      <td style={td}>
                        {p.time
                          ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={12} color={C.inkSoft} />{p.time}</span>
                          : <span style={{ color: C.inkSoft }}>—</span>}
                      </td>
                      <td style={{ ...td, whiteSpace: "normal", minWidth: 160 }}>
                        <div style={{ fontWeight: 700 }}>{p.label}</div>
                        {(p.groupName || p.note) && (
                          <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 2 }}>
                            {[p.groupName, p.note].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </td>
                      <td className="f-mono" style={{ ...td, textAlign: "center" }}>{p.expected.toLocaleString()} DA</td>
                      <td className="f-mono" style={{ ...td, textAlign: "center", color: "#4ade80", fontWeight: 700 }}>{p.paid.toLocaleString()} DA</td>
                      <td className="f-mono" style={{ ...td, textAlign: "center", color: p.remaining > 0 ? "#f87171" : C.inkSoft, fontWeight: 700 }}>
                        {p.remaining.toLocaleString()} DA
                      </td>
                      <td style={{ ...td, textAlign: "center" }}>
                        <span style={pill(s.c, s.b)}><s.I size={13} /> {s.l}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Attendance history ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <h3 style={{ ...h3, margin: 0 }}>
            <ClipboardList size={18} color="#818cf8" />
            {L("سجل الحضور والغياب", "Historique des présences / absences")}
          </h3>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { v: "all", l: `${L("الكل", "Tout")} (${attendances.length})`, c: C.ink },
              { v: "present", l: `${L("حاضر", "Présent")} (${presentCount})`, c: "#4ade80" },
              { v: "absent", l: `${L("غائب", "Absent")} (${absentCount})`, c: "#f87171" },
            ].map(f => (
              <button
                key={f.v}
                type="button"
                onClick={() => setAttFilter(f.v)}
                style={{
                  padding: "5px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  border: `1px solid ${attFilter === f.v ? f.c : C.border}`,
                  background: attFilter === f.v ? "rgba(255,255,255,0.1)" : "transparent",
                  color: attFilter === f.v ? f.c : C.inkSoft,
                }}
              >
                {f.l}
              </button>
            ))}
          </div>
        </div>
        {shownAttendances.length === 0 ? (
          <div style={{ fontSize: 13, color: C.inkSoft }}>{L("لا توجد سجلات حضور بعد.", "Aucun enregistrement de présence.")}</div>
        ) : (
          <div style={{ overflowX: "auto", maxHeight: 460, overflowY: "auto", borderRadius: 14, border: `1px solid ${C.border}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th style={th}>{L("التاريخ", "Date")}</th>
                  <th style={th}>{L("الساعة", "Heure")}</th>
                  <th style={{ ...th, textAlign: "center" }}>{L("الحالة", "Statut")}</th>
                  <th style={{ ...th, textAlign: "center" }}>{L("طريقة التسجيل", "Mode")}</th>
                  <th style={th}>{L("ملاحظة", "Remarque")}</th>
                </tr>
              </thead>
              <tbody>
                {shownAttendances.map(a => (
                  <tr key={a.id}>
                    <td style={td}>
                      <div style={{ fontWeight: 700 }}>{fmtDate(a.date)}</div>
                      {a.isCustom && (
                        <div style={{ fontSize: 10.5, color: "#60a5fa", marginTop: 2 }}>
                          {L(`بدل ${a.originalDate}`, `au lieu du ${a.originalDate}`)}
                        </div>
                      )}
                    </td>
                    <td style={td}>
                      {a.time
                        ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={12} color={C.inkSoft} />{a.time}</span>
                        : <span style={{ color: C.inkSoft }}>—</span>}
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      {a.present
                        ? <span style={pill("#4ade80", "rgba(74,222,128,0.15)")}><CheckCircle2 size={13} /> {L("حاضر", "Présent")}</span>
                        : <span style={pill("#f87171", "rgba(248,113,113,0.15)")}><XCircle size={13} /> {L("غائب", "Absent")}</span>}
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      {a.nfc
                        ? <span style={pill("#818cf8", "rgba(99,102,241,0.15)")}><Radio size={12} /> NFC</span>
                        : <span style={{ fontSize: 12, color: C.inkSoft }}>{L("يدوي", "Manuel")}</span>}
                    </td>
                    <td style={{ ...td, whiteSpace: "normal", color: C.inkSoft, fontSize: 12 }}>
                      {a.isExtra && <span style={{ ...pill(C.accent, C.accentSoft), marginInlineEnd: 6 }}>{L("حصة إضافية", "Extra")}</span>}
                      {a.note || (a.isExtra ? "" : "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
