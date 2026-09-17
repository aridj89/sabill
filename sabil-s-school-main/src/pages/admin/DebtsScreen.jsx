import React, { useState } from "react";
import { Search, Filter, AlertCircle, CheckCircle2, UserPlus, X, Pencil, Trash2 } from "lucide-react";
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
  const [addForm, setAddForm] = useState({
    studentId: "",
    studentName: "",
    academicYear: activeYearId || "",
    level: "2ème CEM",
    teacher: "",
    amount: "",
    paymentAmount: "",
  });
  const [payModal, setPayModal] = useState(null); // { studentId, studentName, maxAmount }
  const [payAmount, setPayAmount] = useState("");
  const [editDebtModal, setEditDebtModal] = useState(null);

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

  const handleEditDebtSubmit = (e) => {
    e.preventDefault();
    if (!editDebtModal) return;

    const newAmt = Number(editDebtModal.amount) || 0;
    const targetStudentId = editDebtModal.studentId;

    setData(d => {
      // 1. Update the student info (level, teacher, nom, prenom)
      const updatedStudents = (d.students || []).map(s => {
        if (s.id === targetStudentId) {
          return {
            ...s,
            nom: editDebtModal.nom !== undefined ? editDebtModal.nom : s.nom,
            prenom: editDebtModal.prenom !== undefined ? editDebtModal.prenom : s.prenom,
            level: editDebtModal.level !== undefined ? editDebtModal.level : s.level,
            teacher: editDebtModal.teacher !== undefined ? editDebtModal.teacher : s.teacher,
          };
        }
        return s;
      });

      // 2. Update or insert the debt in debtCarryOvers
      let updatedDebts = [...(d.debtCarryOvers || [])];
      if (editDebtModal.debtId) {
        if (newAmt <= 0) {
          updatedDebts = updatedDebts.filter(c => c.id !== editDebtModal.debtId);
        } else {
          updatedDebts = updatedDebts.map(c => {
            if (c.id === editDebtModal.debtId) {
              return {
                ...c,
                amount: newAmt,
                toYearId: editDebtModal.yearId || c.toYearId,
                level: editDebtModal.level || c.level,
                teacher: editDebtModal.teacher || c.teacher,
                note: [editDebtModal.level, editDebtModal.teacher].filter(Boolean).join(" - ")
              };
            }
            return c;
          });
        }
      } else if (newAmt > 0) {
        updatedDebts.push({
          id: uid(),
          studentId: targetStudentId,
          fromYearId: "manual",
          toYearId: editDebtModal.yearId || activeYearId || "2026-2027",
          amount: newAmt,
          level: editDebtModal.level || "2ème CEM",
          teacher: editDebtModal.teacher || "",
          note: [editDebtModal.level, editDebtModal.teacher].filter(Boolean).join(" - "),
          createdAt: new Date().toISOString()
        });
      }

      return {
        ...d,
        students: updatedStudents,
        debtCarryOvers: updatedDebts
      };
    });

    setEditDebtModal(null);
    if (toastFn) toastFn(lang === "ar" ? "تم تعديل الدين بنجاح ✓" : "Dette modifiée avec succès ✓");
  };

  const handleDeleteDebt = (debtId, studentId) => {
    if (window.confirm(lang === "ar" ? "هل أنت متأكد من حذف هذا الدين؟" : "Confirmer la suppression de cette dette ?")) {
      setData(d => ({
        ...d,
        debtCarryOvers: (d.debtCarryOvers || []).filter(c => debtId ? c.id !== debtId : c.studentId !== studentId)
      }));
      setEditDebtModal(null);
      if (toastFn) toastFn(lang === "ar" ? "تم حذف الدين ✓" : "Dette supprimée ✓");
    }
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!addForm.studentName || !addForm.amount) return;
    
    let targetStudentId = addForm.studentId;
    let isNewStudent = false;
    let newStudentObj = null;

    if (!targetStudentId) {
      // Find if exact match exists just in case
      const existing = (data.students || []).find(st => `${st.prenom} ${st.nom}`.toLowerCase() === addForm.studentName.toLowerCase().trim());
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
          level: addForm.level || "2ème CEM",
          teacher: addForm.teacher || "",
          createdAt: new Date().toISOString()
        };
      }
    }

    const resolvedYearId = addForm.academicYear || activeYearId || (data.academicYears?.[0]?.id || "2026-2027");
    
    const newDebt = {
      id: uid(),
      studentId: targetStudentId,
      fromYearId: "manual",
      toYearId: resolvedYearId,
      level: addForm.level || "2ème CEM",
      teacher: addForm.teacher || "",
      note: [addForm.level, addForm.teacher].filter(Boolean).join(" - "),
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
        academicYearId: resolvedYearId
      };
    }
    
    setData(d => ({
      ...d,
      students: isNewStudent ? [...(d.students || []), newStudentObj] : (d.students || []),
      debtCarryOvers: [...(d.debtCarryOvers || []), newDebt],
      payments: newPayment ? [...(d.payments || []), newPayment] : (d.payments || [])
    }));
    
    setShowAddModal(false);
    setAddForm({
      studentId: "",
      studentName: "",
      academicYear: activeYearId || "",
      level: "2ème CEM",
      teacher: "",
      amount: "",
      paymentAmount: "",
    });
    if (toastFn) toastFn(lang === "ar" ? "تم إضافة الدين بنجاح" : "Dette ajoutée avec succès");
  };

  const debtsData = data.students.map(st => {
    const fin = getStudentFinancialSummary(data, st.id, activeYearId);
    
    // Support both groupId (new) and groupId (old)
    const groupId = st.groupId;
    const sg = (data.groups || []).find(s => s.id === groupId);
    const groupName = sg 
      ? sg.nom 
      : (st.level 
          ? `${st.level}${st.teacher ? ` (${st.teacher})` : ""}` 
          : (lang === "ar" ? "بدون مجموعة" : "Sans groupe"));
    
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
                        {(d.student.prenom?.[0] || d.student.nom?.[0] || "S").toUpperCase()}{(d.student.nom?.[0] || d.student.prenom?.[1] || "").toUpperCase()}
                      </div>
                      <div style={{ fontWeight: 700, color: C.ink, fontSize: 14 }}>{d.student.prenom || ""} {d.student.nom || ""}</div>
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
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                      <button 
                        onClick={() => {
                          const existingDebt = (data.debtCarryOvers || []).find(c => c.studentId === d.student.id);
                          setEditDebtModal({
                            studentId: d.student.id,
                            studentName: `${d.student.prenom} ${d.student.nom}`,
                            nom: d.student.nom,
                            prenom: d.student.prenom,
                            debtId: existingDebt ? existingDebt.id : null,
                            amount: existingDebt ? existingDebt.amount : d.totalUnpaid,
                            yearId: existingDebt ? existingDebt.toYearId : (activeYearId || "2026-2027"),
                            level: d.student.level || (existingDebt ? existingDebt.level : "2ème CEM"),
                            teacher: d.student.teacher || (existingDebt ? existingDebt.teacher : ""),
                          });
                        }}
                        style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(226,150,58,0.15)", border: "1px solid rgba(226,150,58,0.4)", color: "#e2963a", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                        title={lang === "ar" ? "تعديل الدين" : "Modifier dette"}
                      >
                        <Pencil size={13} />
                        {lang === "ar" ? "تعديل" : "Modifier"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <Modal title={lang === "ar" ? "إضافة دين لطالب (أو طالب جديد)" : "Ajouter dette à un élève"} onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddSubmit} style={{ display: "grid", gap: 14 }}>
            {/* Student Name with Auto-Suggest */}
            <div style={{ position: "relative" }}>
              <label style={{ display: "block", color: C.inkSoft, fontSize: 13, marginBottom: 4, fontWeight: 600 }}>
                {lang === "ar" ? "الطالب (اكتب الاسم أو اختر من القائمة)" : "Élève (Saisir ou sélectionner)"}
              </label>
              <input 
                type="text"
                style={{ ...inputStyle, background: "rgba(255,255,255,0.06)" }} 
                value={addForm.studentName}
                onChange={e => {
                  setAddForm({ ...addForm, studentName: e.target.value, studentId: "" });
                  setShowStudentDropdown(true);
                }}
                onFocus={() => setShowStudentDropdown(true)}
                onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
                placeholder={lang === "ar" ? "اكتب اسم ولقب الطالب..." : "Nom et prénom de l'élève..."}
                required
              />
              {showStudentDropdown && addForm.studentName && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#1c1836", border: `1px solid ${C.border}`, borderRadius: 8, maxHeight: 160, overflowY: "auto", zIndex: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                  {(data.students || []).filter(st => `${st.prenom} ${st.nom}`.toLowerCase().includes(addForm.studentName.toLowerCase())).map(st => (
                    <div 
                      key={st.id} 
                      style={{ padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid rgba(255,255,255,0.06)`, color: C.ink, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      onClick={() => {
                        setAddForm({ 
                          ...addForm, 
                          studentName: `${st.prenom} ${st.nom}`, 
                          studentId: st.id,
                          level: st.level || addForm.level || "2ème CEM",
                          teacher: st.teacher || addForm.teacher || "",
                        });
                        setShowStudentDropdown(false);
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{st.prenom} {st.nom}</span>
                      <span style={{ fontSize: 11.5, color: C.inkSoft }}>{st.level || (lang === "ar" ? "طالب مسجل" : "Élève inscrit")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Année Scolaire & Niveau (2ème CEM, etc.) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 13, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "السنة الدراسية" : "Année scolaire"}
                </label>
                <select
                  style={{ ...inputStyle, background: "rgba(255,255,255,0.06)", cursor: "pointer" }}
                  value={addForm.academicYear}
                  onChange={e => setAddForm({ ...addForm, academicYear: e.target.value })}
                >
                  <option value="" style={{ background: "#1e1a38", color: "#fff" }}>
                    {lang === "ar" ? "-- السنة الحالية --" : "-- Année en cours --"}
                  </option>
                  {(data.academicYears || []).map(y => (
                    <option key={y.id} value={y.id} style={{ background: "#1e1a38", color: "#fff" }}>
                      {y.name || y.id}
                    </option>
                  ))}
                  <option value="2026-2027" style={{ background: "#1e1a38", color: "#fff" }}>2026 / 2027</option>
                  <option value="2025-2026" style={{ background: "#1e1a38", color: "#fff" }}>2025 / 2026</option>
                  <option value="2024-2025" style={{ background: "#1e1a38", color: "#fff" }}>2024 / 2025</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 13, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "المستوى الدراسي (2ème CEM...)" : "Niveau (ex: 2ème CEM)"}
                </label>
                <input 
                  type="text"
                  style={{ ...inputStyle, background: "rgba(255,255,255,0.06)" }}
                  value={addForm.level}
                  onChange={e => setAddForm({ ...addForm, level: e.target.value })}
                  placeholder="ex: 2ème CEM"
                  list="levels-suggestions"
                />
                <datalist id="levels-suggestions">
                  <option value="2ème CEM" />
                  <option value="1ère CEM" />
                  <option value="3ème CEM" />
                  <option value="4ème CEM" />
                  <option value="4ème Primaire" />
                  <option value="5ème Primaire" />
                  <option value="1ère Lycée" />
                  <option value="2ème Lycée" />
                  <option value="3ème Lycée (BAC)" />
                  <option value="Langues" />
                  <option value="Zoom" />
                </datalist>
              </div>
            </div>

            {/* Quick Level Presets Buttons */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["2ème CEM", "1ère CEM", "3ème CEM", "4ème CEM", "Primaire", "Lycée", "Zoom"].map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setAddForm({ ...addForm, level: lvl })}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 6,
                    fontSize: 11.5,
                    border: addForm.level === lvl ? "1px solid #e2963a" : "1px solid rgba(255,255,255,0.15)",
                    background: addForm.level === lvl ? "rgba(226,150,58,0.25)" : "rgba(255,255,255,0.04)",
                    color: addForm.level === lvl ? "#e2963a" : C.inkSoft,
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Professeur / Groupe */}
            <div>
              <label style={{ display: "block", color: C.inkSoft, fontSize: 13, marginBottom: 4, fontWeight: 600 }}>
                {lang === "ar" ? "الأستاذ / الفوج (Professeur / Groupe)" : "Professeur / Groupe"}
              </label>
              <input 
                type="text" 
                style={{ ...inputStyle, background: "rgba(255,255,255,0.06)" }} 
                value={addForm.teacher} 
                onChange={e => setAddForm({ ...addForm, teacher: e.target.value })} 
                placeholder={lang === "ar" ? "اسم الأستاذ أو الفوج..." : "Nom de l'enseignant ou du groupe..."} 
                list="teachers-groups-suggestions"
              />
              <datalist id="teachers-groups-suggestions">
                {(data.groups || []).map(g => (
                  <option key={g.id} value={g.nom} />
                ))}
              </datalist>
            </div>

            {/* Montant & Versement */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 13, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "مبلغ الدين (DA)" : "Montant de la dette (DA)"}
                </label>
                <input 
                  type="number" 
                  style={inputStyle} 
                  value={addForm.amount} 
                  onChange={e => setAddForm({ ...addForm, amount: e.target.value })} 
                  required 
                  min="1" 
                  placeholder="DA"
                />
              </div>

              <div>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 13, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "دفع دفعة الآن (Versement)" : "Versement immédiat (DA)"}
                </label>
                <input 
                  type="number" 
                  style={inputStyle} 
                  value={addForm.paymentAmount} 
                  onChange={e => setAddForm({ ...addForm, paymentAmount: e.target.value })} 
                  min="0" 
                  max={addForm.amount || 0} 
                  placeholder="0" 
                />
              </div>
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

      {editDebtModal && (
        <Modal 
          title={lang === "ar" ? `تعديل دين : ${editDebtModal.studentName}` : `Modifier la dette : ${editDebtModal.studentName}`} 
          onClose={() => setEditDebtModal(null)}
        >
          <form onSubmit={handleEditDebtSubmit} style={{ display: "grid", gap: 14 }}>
            {/* Student Name */}
            <div>
              <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                {lang === "ar" ? "اسم ولقب التلميذ" : "Nom et prénom"}
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input
                  type="text"
                  style={inputStyle}
                  value={editDebtModal.nom || ""}
                  onChange={e => setEditDebtModal({ ...editDebtModal, nom: e.target.value })}
                  placeholder="Nom"
                  required
                />
                <input
                  type="text"
                  style={inputStyle}
                  value={editDebtModal.prenom || ""}
                  onChange={e => setEditDebtModal({ ...editDebtModal, prenom: e.target.value })}
                  placeholder="Prénom"
                  required
                />
              </div>
            </div>

            {/* Montant de la dette */}
            <div>
              <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                {lang === "ar" ? "مبلغ الدين (DA)" : "Montant de la dette (DA)"}
              </label>
              <input
                type="number"
                style={{ ...inputStyle, fontSize: 16, fontWeight: 700, color: "#f87171" }}
                value={editDebtModal.amount}
                onChange={e => setEditDebtModal({ ...editDebtModal, amount: e.target.value })}
                required
                min="0"
              />
            </div>

            {/* Année scolaire & Niveau */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "السنة الدراسية" : "Année scolaire"}
                </label>
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={editDebtModal.yearId}
                  onChange={e => setEditDebtModal({ ...editDebtModal, yearId: e.target.value })}
                >
                  {(data.academicYears || []).map(y => (
                    <option key={y.id} value={y.id} style={{ background: "#1e1a38", color: "#fff" }}>
                      {y.name || y.id}
                    </option>
                  ))}
                  <option value="2026-2027" style={{ background: "#1e1a38", color: "#fff" }}>2026 / 2027</option>
                  <option value="2025-2026" style={{ background: "#1e1a38", color: "#fff" }}>2025 / 2026</option>
                  <option value="2024-2025" style={{ background: "#1e1a38", color: "#fff" }}>2024 / 2025</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "المستوى الدراسي" : "Niveau"}
                </label>
                <input
                  type="text"
                  style={inputStyle}
                  value={editDebtModal.level || ""}
                  onChange={e => setEditDebtModal({ ...editDebtModal, level: e.target.value })}
                  placeholder="ex: 2ème CEM"
                  list="edit-debt-levels-list"
                />
                <datalist id="edit-debt-levels-list">
                  <option value="2ème CEM" />
                  <option value="1ère CEM" />
                  <option value="3ème CEM" />
                  <option value="4ème CEM" />
                  <option value="4ème Primaire" />
                  <option value="5ème Primaire" />
                  <option value="1ère Lycée" />
                  <option value="2ème Lycée" />
                  <option value="3ème Lycée (BAC)" />
                  <option value="Langues" />
                  <option value="Zoom" />
                </datalist>
              </div>
            </div>

            {/* Quick Level Presets Buttons */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["2ème CEM", "1ère CEM", "3ème CEM", "4ème CEM", "Primaire", "Lycée", "Zoom"].map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setEditDebtModal({ ...editDebtModal, level: lvl })}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 6,
                    fontSize: 11.5,
                    border: editDebtModal.level === lvl ? "1px solid #e2963a" : "1px solid rgba(255,255,255,0.15)",
                    background: editDebtModal.level === lvl ? "rgba(226,150,58,0.25)" : "rgba(255,255,255,0.04)",
                    color: editDebtModal.level === lvl ? "#e2963a" : C.inkSoft,
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Professeur / Groupe */}
            <div>
              <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                {lang === "ar" ? "الأستاذ / الفوج (Professeur / Groupe)" : "Professeur / Groupe"}
              </label>
              <input
                type="text"
                style={inputStyle}
                value={editDebtModal.teacher || ""}
                onChange={e => setEditDebtModal({ ...editDebtModal, teacher: e.target.value })}
                placeholder={lang === "ar" ? "اسم الأستاذ أو الفوج..." : "Nom de l'enseignant ou du groupe..."}
                list="edit-debt-teachers-list"
              />
              <datalist id="edit-debt-teachers-list">
                {(data.groups || []).map(g => (
                  <option key={g.id} value={g.nom} />
                ))}
              </datalist>
            </div>

            {/* Actions: Delete & Save */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
              <button
                type="button"
                onClick={() => handleDeleteDebt(editDebtModal.debtId, editDebtModal.studentId)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 14px", borderRadius: 10,
                  background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.35)",
                  color: "#f87171", cursor: "pointer", fontWeight: 700, fontSize: 13
                }}
              >
                <Trash2 size={15} />
                {lang === "ar" ? "حذف الدين" : "Supprimer"}
              </button>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditDebtModal(null)}
                  style={{
                    padding: "9px 16px", borderRadius: 10,
                    background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
                    color: C.ink, cursor: "pointer", fontWeight: 600
                  }}
                >
                  {lang === "ar" ? "إلغاء" : "Annuler"}
                </button>
                <button
                  type="submit"
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "9px 18px", borderRadius: 10,
                    background: C.accent, border: "none",
                    color: "#fff", cursor: "pointer", fontWeight: 700
                  }}
                >
                  <Pencil size={15} />
                  {lang === "ar" ? "حفظ التعديلات" : "Enregistrer"}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
