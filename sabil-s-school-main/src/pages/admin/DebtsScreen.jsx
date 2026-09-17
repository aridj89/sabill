import React, { useState } from "react";
import { Search, Filter, AlertCircle, CheckCircle2, UserPlus, X } from "lucide-react";
import { C, getStudentFinancialSummary, uid, inputStyle } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Modal from "../../components/ui/Modal";
import PrimaryBtn from "../../components/ui/PrimaryBtn";

export default function DebtsScreen({ data, setData, toastFn, onNav, activeYearId }) {
  const { lang } = useLanguage();
  const [search, setSearch] = useState("");
  const [filterUnpaid, setFilterUnpaid] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [addForm, setAddForm] = useState({ studentId: "", studentName: "", amount: "", paymentAmount: "", yearId: activeYearId });
  const [payModal, setPayModal] = useState(null); // { studentId, studentName, maxAmount }
  const [payAmount, setPayAmount] = useState("");

  const handlePaySubmit = (e) => {
    e.preventDefault();
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return;

    const newPayment = {
      id: uid(),
      studentId: payModal.studentId,
      amount: amount,
      expectedAmount: amount,
      paidAmount: amount,
      status: "paid",
      type: "debt",
      paidDate: new Date().toISOString().slice(0, 10),
      month: new Date().toISOString().slice(0, 7), // Add month so it shows up in Finance
      academicYearId: activeYearId
    };

    setData(d => ({
      ...d,
      payments: [...(d.payments || []), newPayment]
    }));

    setPayModal(null);
    setPayAmount("");
    if (toastFn) toastFn(lang === "ar" ? "تم تسديد الدين بنجاح" : "Dette payée avec succès");
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!addForm.studentName || !addForm.amount) return;
    
    let targetStudentId = addForm.studentId;
    let isNewStudent = false;
    let newStudentObj = null;

    if (!targetStudentId) {
      // Find if exact match exists just in case
      const existing = data.students.find(st => `${st.prenom} ${st.nom}`.toLowerCase() === addForm.studentName.toLowerCase().trim());
      if (existing) {
        targetStudentId = existing.id;
      } else {
        // Create new student
        targetStudentId = uid();
        isNewStudent = true;
        const parts = addForm.studentName.trim().split(" ");
        const nom = parts.length > 1 ? parts.pop() : "";
        const prenom = parts.join(" ") || addForm.studentName.trim();
        
        newStudentObj = {
          id: targetStudentId,
          nom,
          prenom,
          createdAt: new Date().toISOString()
        };
      }
    }

    const resolvedYearId = addForm.yearId || activeYearId || (data.academicYears?.[0]?.id || null);
    
    const newDebt = {
      id: uid(),
      studentId: targetStudentId,
      fromYearId: "manual",
      toYearId: resolvedYearId,
      amount: Number(addForm.amount),
      createdAt: new Date().toISOString()
    };
    
    let newPayment = null;
    const paymentAmt = Number(addForm.paymentAmount);
    if (paymentAmt > 0) {
      newPayment = {
        id: uid(),
        studentId: targetStudentId,
        amount: paymentAmt,
        expectedAmount: paymentAmt,
        paidAmount: paymentAmt,
        status: "paid",
        type: "debt",
        paidDate: new Date().toISOString().slice(0, 10),
        month: new Date().toISOString().slice(0, 7),
        academicYearId: activeYearId
      };
    }
    
    setData(d => ({
      ...d,
      students: isNewStudent ? [...(d.students || []), newStudentObj] : (d.students || []),
      debtCarryOvers: [...(d.debtCarryOvers || []), newDebt],
      payments: newPayment ? [...(d.payments || []), newPayment] : (d.payments || [])
    }));
    
    setShowAddModal(false);
    setAddForm({ studentId: "", studentName: "", amount: "", paymentAmount: "", yearId: activeYearId });
    if (toastFn) toastFn(lang === "ar" ? "تم إضافة الدين بنجاح" : "Dette ajoutée avec succès");
  };

  const debtsData = data.students.map(st => {
    const fin = getStudentFinancialSummary(data, st.id, activeYearId);
    
    // Support both groupId (new) and groupId (old)
    const groupId = st.groupId || st.groupId;
    const sg = [...(data.groups || []), ...(data.groups || [])].find(s => s.id === groupId);
    const groupName = sg ? sg.nom : (lang === "ar" ? "بدون مجموعة" : "Sans groupe");
    
    return {
      student: st,
      groupName,
      ...fin
    };
  });

  const filtered = debtsData.filter(d => {
    if (filterUnpaid && d.totalUnpaid === 0) return false;
    if (search && !(d.student.nom + " " + d.student.prenom).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.totalUnpaid - a.totalUnpaid);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
        <h2 className="f-display" style={{ fontSize: 24, fontWeight: 700, color: C.ink, margin: 0 }}>
          {lang === "ar" ? "ديون الطلاب" : "Dettes des élèves"}
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12,
            background: C.accent, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14
          }}
        >
          <UserPlus size={16} />
          {lang === "ar" ? "إضافة دين سريع" : "Ajout dette rapide"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, padding: "8px 12px", borderRadius: 10, flex: 1, minWidth: 200 }}>
          <Search size={16} color={C.inkSoft} />
          <input 
            type="text" 
            placeholder={lang === "ar" ? "بحث عن طالب..." : "Rechercher un élève..."} 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ background: "transparent", border: "none", outline: "none", color: C.ink, width: "100%", fontSize: 14 }} 
          />
        </div>
        <button
          onClick={() => setFilterUnpaid(!filterUnpaid)}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10,
            background: filterUnpaid ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${filterUnpaid ? "rgba(248,113,113,0.3)" : C.border}`,
            color: filterUnpaid ? "#f87171" : C.ink,
            cursor: "pointer", fontWeight: 600, fontSize: 13.5
          }}
        >
          <Filter size={16} />
          {lang === "ar" ? "غير المسددة فقط" : "Impayés seulement"}
        </button>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: `1px solid ${C.border}` }}>
                <th style={{ padding: "14px 16px", color: C.inkSoft, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{lang === "ar" ? "الطالب" : "Élève"}</th>
                <th style={{ padding: "14px 16px", color: C.inkSoft, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{lang === "ar" ? "المجموعة" : "Groupe"}</th>
                <th style={{ padding: "14px 16px", color: C.inkSoft, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{lang === "ar" ? "الدين السابق" : "Dette Précédente"}</th>
                <th style={{ padding: "14px 16px", color: C.inkSoft, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{lang === "ar" ? "رسوم السنة الحالية" : "Frais actuels"}</th>
                <th style={{ padding: "14px 16px", color: C.inkSoft, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{lang === "ar" ? "إجمالي الدين" : "Dette Totale"}</th>
                <th style={{ padding: "14px 16px", color: C.inkSoft, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{lang === "ar" ? "الحالة" : "Statut"}</th>
                <th style={{ padding: "14px 16px", color: C.inkSoft, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{lang === "ar" ? "إجراء" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: "center", color: C.inkSoft, fontSize: 13.5 }}>
                    {lang === "ar" ? "لا يوجد بيانات مطابقة" : "Aucune donnée correspondante"}
                  </td>
                </tr>
              ) : filtered.map(d => (
                <tr key={d.student.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", transition: "background 0.1s" }}
                    onClick={() => onNav({ screen: "student", studentId: d.student.id })}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: d.totalUnpaid > 0 ? "rgba(248,113,113,0.15)" : "rgba(74,222,128,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: d.totalUnpaid > 0 ? "#f87171" : "#4ade80", fontWeight: 700, fontSize: 13 }}>
                        {d.student.prenom[0]}{d.student.nom[0]}
                      </div>
                      <div style={{ fontWeight: 700, color: C.ink, fontSize: 14 }}>{d.student.prenom} {d.student.nom}</div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", color: C.inkSoft, fontSize: 13.5 }}>{d.groupName}</td>
                  <td style={{ padding: "14px 16px", color: d.previousDebtRemaining > 0 ? "#f87171" : C.ink, fontSize: 13.5, fontWeight: d.previousDebtRemaining > 0 ? 700 : 500 }}>
                    {d.previousDebtRemaining.toLocaleString()} DA
                  </td>
                  <td style={{ padding: "14px 16px", color: d.currentFeesRemaining > 0 ? "#fbbf24" : C.ink, fontSize: 13.5, fontWeight: d.currentFeesRemaining > 0 ? 700 : 500 }}>
                    {d.currentFeesRemaining.toLocaleString()} DA
                  </td>
                  <td style={{ padding: "14px 16px", color: d.totalUnpaid > 0 ? "#f87171" : "#4ade80", fontSize: 14, fontWeight: 800 }}>
                    {d.totalUnpaid.toLocaleString()} DA
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {d.totalUnpaid === 0 ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(74,222,128,0.15)", color: "#4ade80", padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                        <CheckCircle2 size={14} /> {lang === "ar" ? "مسدد" : "Payé"}
                      </span>
                    ) : d.previousDebtRemaining > 0 ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(248,113,113,0.15)", color: "#f87171", padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                        <AlertCircle size={14} /> {lang === "ar" ? "دين قديم" : "Dette Préc."}
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(251,191,36,0.15)", color: "#fbbf24", padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                        <AlertCircle size={14} /> {lang === "ar" ? "غير مسدد" : "Impayé"}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }} onClick={e => e.stopPropagation()}>
                    {d.totalUnpaid > 0 && (
                      <button 
                        onClick={() => {
                          setPayModal({ studentId: d.student.id, studentName: `${d.student.prenom} ${d.student.nom}`, maxAmount: d.totalUnpaid });
                          setPayAmount(d.totalUnpaid);
                        }}
                        style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                      >
                        {lang === "ar" ? "تسديد" : "Payer"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <Modal title={lang === "ar" ? "إضافة دين لطالب موجود" : "Ajouter dette à un élève"} onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddSubmit} style={{ display: "grid", gap: 14 }}>
            <div style={{ position: "relative" }}>
              <label style={{ display: "block", color: C.inkSoft, fontSize: 13, marginBottom: 4, fontWeight: 600 }}>{lang === "ar" ? "الطالب" : "Élève"}</label>
              <input 
                type="text"
                style={{...inputStyle, background: "rgba(255,255,255,0.06)"}} 
                value={addForm.studentName}
                onChange={e => {
                  setAddForm({ ...addForm, studentName: e.target.value, studentId: "" });
                  setShowStudentDropdown(true);
                }}
                onFocus={() => setShowStudentDropdown(true)}
                onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
                placeholder={lang === "ar" ? "اكتب اسم الطالب..." : "Saisir le nom de l'élève..."}
                required
              />
              {showStudentDropdown && addForm.studentName && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, maxHeight: 150, overflowY: "auto", zIndex: 10 }}>
                  {(data.students || []).filter(st => `${st.prenom} ${st.nom}`.toLowerCase().includes(addForm.studentName.toLowerCase())).map(st => (
                    <div 
                      key={st.id} 
                      style={{ padding: "8px 12px", cursor: "pointer", borderBottom: `1px solid ${C.border}`, color: C.ink }}
                      onClick={() => {
                        setAddForm({ ...addForm, studentName: `${st.prenom} ${st.nom}`, studentId: st.id });
                        setShowStudentDropdown(false);
                      }}
                    >
                      {st.prenom} {st.nom}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={{ display: "block", color: C.inkSoft, fontSize: 13, marginBottom: 4, fontWeight: 600 }}>{lang === "ar" ? "مبلغ الدين (DA)" : "Montant de la dette (DA)"}</label>
              <input type="number" style={inputStyle} value={addForm.amount} onChange={e => setAddForm({ ...addForm, amount: e.target.value })} required min="1" />
            </div>
            <div>
              <label style={{ display: "block", color: C.inkSoft, fontSize: 13, marginBottom: 4, fontWeight: 600 }}>{lang === "ar" ? "دفع دفعة الآن (Versement) (اختياري)" : "Versement immédiat (DA) (Optionnel)"}</label>
              <input type="number" style={inputStyle} value={addForm.paymentAmount} onChange={e => setAddForm({ ...addForm, paymentAmount: e.target.value })} min="0" max={addForm.amount || 0} placeholder="0" />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "none", color: C.ink, cursor: "pointer", fontWeight: 600 }}>
                {lang === "ar" ? "إلغاء" : "Annuler"}
              </button>
              <button type="submit" style={{ padding: "10px 16px", borderRadius: 10, background: C.accent, border: "none", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                {lang === "ar" ? "إضافة" : "Ajouter"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {payModal && (
        <Modal title={lang === "ar" ? `تسديد دين - ${payModal.studentName}` : `Payer dette - ${payModal.studentName}`} onClose={() => setPayModal(null)}>
          <form onSubmit={handlePaySubmit} style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={{ display: "block", color: C.inkSoft, fontSize: 13, marginBottom: 6, fontWeight: 600 }}>{lang === "ar" ? "المبلغ المراد تسديده (DA)" : "Montant à payer (DA)"}</label>
              <input 
                type="number" 
                style={inputStyle} 
                value={payAmount} 
                onChange={e => setPayAmount(e.target.value)} 
                required 
                min="1"
                max={payModal.maxAmount}
              />
              <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 6 }}>
                {lang === "ar" ? "إجمالي الدين المستحق:" : "Dette totale:"} <strong style={{ color: "#f87171" }}>{payModal.maxAmount} DA</strong>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setPayModal(null)} style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "none", color: C.ink, cursor: "pointer", fontWeight: 600 }}>
                {lang === "ar" ? "إلغاء" : "Annuler"}
              </button>
              <button type="submit" style={{ padding: "10px 16px", borderRadius: 10, background: "#4ade80", border: "none", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                {lang === "ar" ? "تأكيد الدفع" : "Confirmer Paiement"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
