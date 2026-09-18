import React, { useState, useMemo } from "react";
import {
  Search, Filter, AlertCircle, CheckCircle2, UserPlus, X,
  Edit2, Trash2, CreditCard, DollarSign, Calendar, GraduationCap,
  User, Phone, ChevronRight, ArrowUpDown, History, Plus
} from "lucide-react";
import { C, getStudentFinancialSummary, uid, inputStyle } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Modal from "../../components/ui/Modal";
import PrimaryBtn from "../../components/ui/PrimaryBtn";
import Field from "../../components/ui/Field";

const DEBT_YEARS = [
  "2024/2025",
  "2023/2024",
  "2022/2023",
  "2021/2022",
  "2020/2021",
];

const STUDY_LEVELS = [
  "2ème AS",
  "1ère AS",
  "3ème AS (BAC)",
  "4ème CEM",
  "3ème CEM",
  "2ème CEM",
  "1ère CEM",
  "5ème Primaire",
  "4ème Primaire",
  "3ème Primaire",
  "Langues",
  "Autre"
];

export default function DebtsScreen({ data, setData, toastFn, onNav, activeYearId }) {
  const { lang } = useLanguage();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'unpaid' | 'paid'
  const [filterLevel, setFilterLevel] = useState("all");
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null); // { debtId, studentId, studentName, amount, debtYear, level, phone, teacher }
  const [payModal, setPayModal] = useState(null); // { studentId, studentName, debtId, maxAmount, remaining }
  const [payAmount, setPayAmount] = useState("");
  const [historyModal, setHistoryModal] = useState(null); // { studentId, studentName, payments }

  // Add Form State
  const [addForm, setAddForm] = useState({
    studentId: "",
    studentName: "",
    nom: "",
    prenom: "",
    phone: "",
    amount: "",
    paymentAmount: "",
    debtYear: "2024/2025",
    level: "2ème AS",
    teacher: "",
    note: "",
  });

  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  // ── 1. Calculate All Debts & Financials ──
  const debtsList = useMemo(() => {
    const carryOvers = data.debtCarryOvers || [];
    const students = data.students || [];
    const payments = data.payments || [];

    // Group debts by carryover item or by student
    return carryOvers.map(debt => {
      const st = students.find(s => s.id === debt.studentId) || {
        id: debt.studentId,
        nom: debt.nom || "",
        prenom: debt.prenom || debt.studentName || "Élève",
        phone: debt.phone || "",
        studyClass: debt.level || "2ème AS",
      };

      const debtAmount = Number(debt.amount) || 0;
      
      // Calculate payments specifically tied to this debt or student debt payments
      const debtPayments = payments.filter(p => 
        (p.debtId === debt.id) || 
        (!p.debtId && p.studentId === st.id && (p.type === "debt" || p.note?.includes("dette")))
      );
      
      const totalPaidOnDebt = debtPayments.reduce((sum, p) => sum + (Number(p.paidAmount || p.amount) || 0), 0);
      const remainingDebt = Math.max(0, debtAmount - totalPaidOnDebt);
      const isSettled = remainingDebt === 0;

      return {
        debtId: debt.id,
        debt,
        student: st,
        studentName: `${st.prenom} ${st.nom}`.trim() || st.prenom || "Élève",
        nom: st.nom || "",
        prenom: st.prenom || "",
        phone: st.phone || debt.phone || "—",
        debtYear: debt.debtYear || debt.fromYearId || "2024/2025",
        level: debt.level || st.studyClass || st.level || "2ème AS",
        teacher: debt.teacher || "—",
        amount: debtAmount,
        totalPaid: totalPaidOnDebt,
        remaining: remainingDebt,
        isSettled,
        payments: debtPayments,
        createdAt: debt.createdAt || new Date().toISOString(),
      };
    });
  }, [data.debtCarryOvers, data.students, data.payments]);

  // Also include students who have overall unpaid previous debt if not in carryOvers
  const allDebtsCombined = useMemo(() => {
    return debtsList;
  }, [debtsList]);

  // ── 2. Top Summary Stats ──
  const stats = useMemo(() => {
    let totalDebt = 0;
    let totalRecovered = 0;
    let totalRemaining = 0;
    const studentIds = new Set();

    allDebtsCombined.forEach(d => {
      totalDebt += d.amount;
      totalRecovered += d.totalPaid;
      totalRemaining += d.remaining;
      studentIds.add(d.student.id);
    });

    return {
      totalDebt,
      totalRecovered,
      totalRemaining,
      studentCount: studentIds.size,
    };
  }, [allDebtsCombined]);

  // ── 3. Filters ──
  const filteredDebts = useMemo(() => {
    return allDebtsCombined.filter(d => {
      if (filterStatus === "unpaid" && d.isSettled) return false;
      if (filterStatus === "paid" && !d.isSettled) return false;
      if (filterLevel !== "all" && d.level !== filterLevel) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = d.studentName.toLowerCase().includes(q);
        const matchesPhone = d.phone.includes(q);
        const matchesLevel = (d.level || "").toLowerCase().includes(q);
        const matchesYear = (d.debtYear || "").toLowerCase().includes(q);
        const matchesTeacher = (d.teacher || "").toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesLevel && !matchesYear && !matchesTeacher) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => b.remaining - a.remaining || b.amount - a.amount);
  }, [allDebtsCombined, filterStatus, filterLevel, search]);

  // ── 4. Add Debt Handler ──
  const handleAddSubmit = (e) => {
    e.preventDefault();
    const amountNum = Number(addForm.amount);
    if (!amountNum || amountNum <= 0) return;

    let targetStudentId = addForm.studentId;
    let isNewStudent = false;
    let newStudentObj = null;

    let prenom = addForm.prenom.trim();
    let nom = addForm.nom.trim();

    if (!prenom && !nom && addForm.studentName) {
      const parts = addForm.studentName.trim().split(" ");
      nom = parts.length > 1 ? parts.pop() : "";
      prenom = parts.join(" ") || addForm.studentName.trim();
    }

    if (!targetStudentId) {
      // Check if student with same name exists
      const existing = (data.students || []).find(
        st => `${st.prenom} ${st.nom}`.toLowerCase().trim() === `${prenom} ${nom}`.toLowerCase().trim()
      );
      if (existing) {
        targetStudentId = existing.id;
      } else {
        targetStudentId = uid();
        isNewStudent = true;
        newStudentObj = {
          id: targetStudentId,
          nom: nom,
          prenom: prenom || "Élève",
          phone: addForm.phone.trim(),
          studyClass: addForm.level,
          accountStatus: "active",
          createdAt: new Date().toISOString(),
        };
      }
    }

    const debtId = uid();
    const newDebtObj = {
      id: debtId,
      studentId: targetStudentId,
      nom,
      prenom,
      phone: addForm.phone.trim(),
      amount: amountNum,
      debtYear: addForm.debtYear,
      fromYearId: addForm.debtYear,
      toYearId: activeYearId || "manual",
      level: addForm.level,
      teacher: addForm.teacher.trim(),
      note: addForm.note.trim(),
      createdAt: new Date().toISOString(),
    };

    let initialPayment = null;
    const paymentAmt = Number(addForm.paymentAmount);
    if (paymentAmt > 0) {
      initialPayment = {
        id: uid(),
        studentId: targetStudentId,
        debtId: debtId,
        amount: paymentAmt,
        paidAmount: paymentAmt,
        expectedAmount: paymentAmt,
        status: "paid",
        paid: true,
        type: "debt",
        note: `Versement initial dette (${addForm.debtYear} - ${addForm.level})`,
        paidDate: new Date().toISOString().slice(0, 10),
        month: new Date().toISOString().slice(0, 7),
        academicYearId: activeYearId || null,
      };
    }

    setData(d => ({
      ...d,
      students: isNewStudent ? [...(d.students || []), newStudentObj] : (d.students || []),
      debtCarryOvers: [...(d.debtCarryOvers || []), newDebtObj],
      payments: initialPayment ? [...(d.payments || []), initialPayment] : (d.payments || []),
    }));

    setShowAddModal(false);
    setAddForm({
      studentId: "",
      studentName: "",
      nom: "",
      prenom: "",
      phone: "",
      amount: "",
      paymentAmount: "",
      debtYear: "2024/2025",
      level: "2ème AS",
      teacher: "",
      note: "",
    });

    if (toastFn) toastFn(lang === "ar" ? "تمت إضافة الدين والبيانات بنجاح ✓" : "Dette enregistrée avec succès ✓");
  };

  // ── 5. Versement (Payment) Handler ──
  const handlePaySubmit = (e) => {
    e.preventDefault();
    const amount = Number(payAmount);
    if (!amount || amount <= 0 || !payModal) return;

    const newPayment = {
      id: uid(),
      studentId: payModal.studentId,
      debtId: payModal.debtId,
      amount: amount,
      expectedAmount: amount,
      paidAmount: amount,
      status: "paid",
      paid: true,
      type: "debt",
      note: `Versement dette (${payModal.debtYear || "Dette"})`,
      paidDate: new Date().toISOString().slice(0, 10),
      month: new Date().toISOString().slice(0, 7),
      academicYearId: activeYearId || null,
    };

    setData(d => ({
      ...d,
      payments: [...(d.payments || []), newPayment]
    }));

    setPayModal(null);
    setPayAmount("");
    if (toastFn) toastFn(lang === "ar" ? `تم تسجيل دفعة بقيمة ${amount.toLocaleString()} DA ✓` : `Versement de ${amount.toLocaleString()} DA enregistré ✓`);
  };

  // ── 6. Edit Debt Handler ──
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingDebt) return;

    const updatedAmount = Number(editingDebt.amount) || 0;
    const debtId = editingDebt.debtId;
    const studentId = editingDebt.studentId;

    setData(d => {
      // Update debt carryover record
      const updatedCarryOvers = (d.debtCarryOvers || []).map(debt => {
        if (debt.id === debtId) {
          return {
            ...debt,
            amount: updatedAmount,
            debtYear: editingDebt.debtYear,
            fromYearId: editingDebt.debtYear,
            level: editingDebt.level,
            teacher: editingDebt.teacher,
            nom: editingDebt.nom,
            prenom: editingDebt.prenom,
            phone: editingDebt.phone,
          };
        }
        return debt;
      });

      // Also update student profile if modified
      const updatedStudents = (d.students || []).map(st => {
        if (st.id === studentId) {
          return {
            ...st,
            nom: editingDebt.nom,
            prenom: editingDebt.prenom,
            phone: editingDebt.phone,
            studyClass: editingDebt.level,
          };
        }
        return st;
      });

      return {
        ...d,
        debtCarryOvers: updatedCarryOvers,
        students: updatedStudents,
      };
    });

    setEditingDebt(null);
    if (toastFn) toastFn(lang === "ar" ? "تم تحديث بيانات الدين والحساب بنجاح ✓" : "Dette et compte modifiés avec succès ✓");
  };

  // ── 7. Delete Debt Handler ──
  const handleDeleteDebt = (item) => {
    const confirmMsg = lang === "ar"
      ? `هل أنت متأكد من حذف دين الطالب: ${item.studentName} بقيمة ${item.amount.toLocaleString()} DA ؟`
      : `Voulez-vous vraiment supprimer la dette de ${item.studentName} (${item.amount.toLocaleString()} DA) ?`;

    if (!window.confirm(confirmMsg)) return;

    setData(d => ({
      ...d,
      debtCarryOvers: (d.debtCarryOvers || []).filter(c => c.id !== item.debtId),
      // Also remove associated debt payments if any
      payments: (d.payments || []).filter(p => p.debtId !== item.debtId)
    }));

    if (toastFn) toastFn(lang === "ar" ? "تم حذف الدين بنجاح" : "Dette supprimée");
  };

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 14 }}>
        <div>
          <h2 className="f-display" style={{ fontSize: 24, fontWeight: 800, color: C.ink, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <DollarSign size={26} color={C.accent} />
            {lang === "ar" ? "إدارة ديون الطلاب والمستحقات السابقة" : "Gestion des Dettes & Arriérés"}
          </h2>
          <p style={{ color: C.inkSoft, fontSize: 13.5, margin: "4px 0 0" }}>
            {lang === "ar"
              ? "متابعة ديون السنوات السابقة، الدفعات (Versements)، وتعديل أو حذف الحسابات"
              : "Suivi des arriérés, gestion des versements, modification et suppression"}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 14,
            background: "linear-gradient(135deg, #E2963A, #f59e0b)", color: "#fff", border: "none",
            cursor: "pointer", fontWeight: 800, fontSize: 14, boxShadow: "0 6px 20px rgba(226,150,58,0.4)"
          }}
        >
          <Plus size={18} />
          {lang === "ar" ? "+ إضافة دين جديد" : "+ Ajouter une dette"}
        </button>
      </div>

      {/* ── Summary Cards Bar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 24 }}>
        {/* Total Dettes */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: C.inkSoft, fontSize: 12.5, fontWeight: 700 }}>
            <span>{lang === "ar" ? "إجمالي الديون المسجلة" : "Total des Dettes"}</span>
            <AlertCircle size={18} color="#f87171" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#f87171", marginTop: 8 }}>
            {stats.totalDebt.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 700 }}>DA</span>
          </div>
          <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 4 }}>
            {stats.studentCount} {lang === "ar" ? "تلميذ مسجل" : "élèves concernés"}
          </div>
        </div>

        {/* Total Versé (Recouvré) */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: C.inkSoft, fontSize: 12.5, fontWeight: 700 }}>
            <span>{lang === "ar" ? "إجمالي الدفعات المسددة" : "Total Recouvré (Versé)"}</span>
            <CheckCircle2 size={18} color="#4ade80" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#4ade80", marginTop: 8 }}>
            {stats.totalRecovered.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 700 }}>DA</span>
          </div>
          <div style={{ fontSize: 11.5, color: "#4ade80", marginTop: 4, fontWeight: 600 }}>
            {stats.totalDebt > 0 ? Math.round((stats.totalRecovered / stats.totalDebt) * 100) : 0}% {lang === "ar" ? "نسبة التحصيل" : "recouvrés"}
          </div>
        </div>

        {/* Reste à payer */}
        <div style={{ background: C.surface, border: "1.5px solid rgba(226,150,58,0.4)", borderRadius: 18, padding: "18px 20px", boxShadow: "0 8px 24px rgba(226,150,58,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#E2963A", fontSize: 12.5, fontWeight: 700 }}>
            <span>{lang === "ar" ? "المتبقي للاستيفاء (Reste)" : "Reste à Recouvrer"}</span>
            <DollarSign size={18} color="#E2963A" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#E2963A", marginTop: 8 }}>
            {stats.totalRemaining.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 700 }}>DA</span>
          </div>
          <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 4 }}>
            {lang === "ar" ? "مستحقات غير مسددة" : "Montant restant en attente"}
          </div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, padding: "10px 14px", borderRadius: 12, flex: 1, minWidth: 240 }}>
          <Search size={16} color={C.inkSoft} />
          <input 
            type="text" 
            placeholder={lang === "ar" ? "بحث بالطالب، المستوى (2ème AS)، الهاتف، أو الأستاذ..." : "Rechercher par élève, niveau (2ème AS), téléphone, prof..."} 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ background: "transparent", border: "none", outline: "none", color: C.ink, width: "100%", fontSize: 13.5, fontWeight: 600 }} 
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: C.inkSoft, cursor: "pointer" }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status filter tabs */}
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", padding: 4, borderRadius: 12, border: `1px solid ${C.border}` }}>
          {[
            { id: "all", labelFr: "Tous", labelAr: "الكل" },
            { id: "unpaid", labelFr: "Non soldés", labelAr: "غير مسددة" },
            { id: "paid", labelFr: "Soldés ✓", labelAr: "مسددة بالكامل" },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              style={{
                padding: "7px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 700, border: "none",
                background: filterStatus === f.id ? (f.id === "unpaid" ? "rgba(248,113,113,0.25)" : f.id === "paid" ? "rgba(74,222,128,0.25)" : "rgba(226,150,58,0.25)") : "transparent",
                color: filterStatus === f.id ? (f.id === "unpaid" ? "#f87171" : f.id === "paid" ? "#4ade80" : "#E2963A") : C.inkSoft,
                cursor: "pointer", transition: "all 0.15s"
              }}
            >
              {lang === "ar" ? f.labelAr : f.labelFr}
            </button>
          ))}
        </div>

        {/* Level filter */}
        <select
          value={filterLevel}
          onChange={e => setFilterLevel(e.target.value)}
          style={{
            padding: "9px 14px", borderRadius: 12, background: "rgba(255,255,255,0.06)",
            border: `1px solid ${C.border}`, color: C.ink, fontSize: 12.5, fontWeight: 700, cursor: "pointer", outline: "none"
          }}
        >
          <option value="all">{lang === "ar" ? "كل المستويات" : "Tous les niveaux"}</option>
          {STUDY_LEVELS.map(lvl => (
            <option key={lvl} value={lvl}>{lvl}</option>
          ))}
        </select>
      </div>

      {/* ── Debts Table / List ── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden", boxShadow: "0 12px 32px rgba(0,0,0,0.2)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${C.border}` }}>
                <th style={{ padding: "14px 18px", color: C.inkSoft, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>{lang === "ar" ? "الطالب والحساب" : "Élève & Compte"}</th>
                <th style={{ padding: "14px 16px", color: C.inkSoft, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>{lang === "ar" ? "المستوى الدراسي" : "Niveau"}</th>
                <th style={{ padding: "14px 16px", color: C.inkSoft, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>{lang === "ar" ? "سنة الدين" : "Année Dette"}</th>
                <th style={{ padding: "14px 16px", color: C.inkSoft, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>{lang === "ar" ? "مبلغ الدين" : "Montant Dette"}</th>
                <th style={{ padding: "14px 16px", color: C.inkSoft, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>{lang === "ar" ? "المدفوع (Versé)" : "Versé"}</th>
                <th style={{ padding: "14px 16px", color: C.inkSoft, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>{lang === "ar" ? "المتبقي (Reste)" : "Reste à payer"}</th>
                <th style={{ padding: "14px 16px", color: C.inkSoft, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>{lang === "ar" ? "الحالة" : "Statut"}</th>
                <th style={{ padding: "14px 18px", color: C.inkSoft, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" }}>{lang === "ar" ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "48px 20px", textAlign: "center", color: C.inkSoft, fontSize: 14 }}>
                    <AlertCircle size={32} color={C.inkSoft} style={{ margin: "0 auto 10px", display: "block", opacity: 0.5 }} />
                    {lang === "ar" ? "لا توجد ديون مطابقة للبحث أو الفلتر" : "Aucune dette correspondante aux filtres"}
                  </td>
                </tr>
              ) : filteredDebts.map(d => (
                <tr
                  key={d.debtId}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    transition: "background 0.15s ease",
                    background: d.isSettled ? "rgba(74,222,128,0.02)" : "transparent"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={e => e.currentTarget.style.background = d.isSettled ? "rgba(74,222,128,0.02)" : "transparent"}
                >
                  {/* Élève & Compte */}
                  <td style={{ padding: "14px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: d.isSettled ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
                        color: d.isSettled ? "#4ade80" : "#f87171",
                        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0
                      }}>
                        {d.prenom[0] || "E"}{d.nom[0] || ""}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: C.ink, fontSize: 14.5 }}>
                          {d.studentName}
                        </div>
                        <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                          <Phone size={11} /> {d.phone}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Niveau */}
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      display: "inline-block", padding: "3px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)"
                    }}>
                      <GraduationCap size={12} style={{ display: "inline", marginRight: 4 }} />
                      {d.level}
                    </span>
                  </td>

                  {/* Année Dette */}
                  <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700, color: C.inkSoft }}>
                    <Calendar size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                    {d.debtYear}
                  </td>

                  {/* Montant Dette */}
                  <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 800, color: C.ink }}>
                    {d.amount.toLocaleString()} DA
                  </td>

                  {/* Versé */}
                  <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 700, color: "#4ade80" }}>
                    {d.totalPaid.toLocaleString()} DA
                  </td>

                  {/* Reste à payer */}
                  <td style={{ padding: "14px 16px", fontSize: 15, fontWeight: 800, color: d.remaining > 0 ? "#f87171" : "#4ade80" }}>
                    {d.remaining.toLocaleString()} DA
                  </td>

                  {/* Statut */}
                  <td style={{ padding: "14px 16px" }}>
                    {d.isSettled ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(74,222,128,0.15)", color: "#4ade80", padding: "4px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>
                        <CheckCircle2 size={13} /> {lang === "ar" ? "مسدد بالكامل ✓" : "Soldé ✓"}
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(248,113,113,0.15)", color: "#f87171", padding: "4px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>
                        <AlertCircle size={13} /> {lang === "ar" ? "مستحق الدفع" : "Non soldé"}
                      </span>
                    )}
                  </td>

                  {/* Actions Buttons */}
                  <td style={{ padding: "14px 18px", textAlign: "right" }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {/* Versement Button */}
                      {!d.isSettled && (
                        <button 
                          onClick={() => {
                            setPayModal({
                              studentId: d.student.id,
                              studentName: d.studentName,
                              debtId: d.debtId,
                              debtYear: d.debtYear,
                              maxAmount: d.remaining,
                            });
                            setPayAmount(d.remaining);
                          }}
                          style={{
                            padding: "6px 12px", borderRadius: 9, background: "rgba(74,222,128,0.15)",
                            border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80",
                            fontWeight: 800, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4
                          }}
                          title={lang === "ar" ? "تسديد دفعة (Versement)" : "Effectuer un versement"}
                        >
                          <CreditCard size={13} />
                          {lang === "ar" ? "تسديد" : "Versement"}
                        </button>
                      )}

                      {/* Modifier Button */}
                      <button
                        onClick={() => {
                          setEditingDebt({
                            debtId: d.debtId,
                            studentId: d.student.id,
                            nom: d.nom,
                            prenom: d.prenom,
                            phone: d.phone === "—" ? "" : d.phone,
                            amount: d.amount,
                            debtYear: d.debtYear,
                            level: d.level,
                            teacher: d.teacher === "—" ? "" : d.teacher,
                          });
                        }}
                        style={{
                          padding: "6px 10px", borderRadius: 9, background: "rgba(226,150,58,0.15)",
                          border: "1px solid rgba(226,150,58,0.35)", color: "#E2963A",
                          fontWeight: 700, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4
                        }}
                        title={lang === "ar" ? "تعديل الدين والحساب" : "Modifier la dette & compte"}
                      >
                        <Edit2 size={13} />
                        {lang === "ar" ? "تعديل" : "Modifier"}
                      </button>

                      {/* Supprimer Button */}
                      <button
                        onClick={() => handleDeleteDebt(d)}
                        style={{
                          padding: "6px 8px", borderRadius: 9, background: "rgba(248,113,113,0.1)",
                          border: "1px solid rgba(248,113,113,0.25)", color: "#f87171",
                          cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center"
                        }}
                        title={lang === "ar" ? "حذف الدين" : "Supprimer la dette"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal 1: Ajouter une Dette ── */}
      {showAddModal && (
        <Modal title={lang === "ar" ? "إضافة دين جديد / مستحقات سابقة" : "Ajouter une Dette / Arriéré"} onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddSubmit} style={{ display: "grid", gap: 14 }}>
            {/* Nom & Prénom */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "اللقب (Nom)" : "Nom"}
                </label>
                <input
                  type="text"
                  style={inputStyle}
                  value={addForm.nom}
                  onChange={e => setAddForm({ ...addForm, nom: e.target.value })}
                  placeholder="Kaci"
                />
              </div>
              <div style={{ position: "relative" }}>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "الاسم (Prénom) أو اختر تلميذ" : "Prénom (ou élève existant)"}
                </label>
                <input
                  type="text"
                  style={inputStyle}
                  value={addForm.prenom}
                  onChange={e => {
                    setAddForm({ ...addForm, prenom: e.target.value, studentId: "" });
                    setShowStudentDropdown(true);
                  }}
                  onFocus={() => setShowStudentDropdown(true)}
                  onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
                  placeholder="Yasmine..."
                  required
                />
                {showStudentDropdown && addForm.prenom && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, maxHeight: 150, overflowY: "auto", zIndex: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
                    {(data.students || []).filter(st => `${st.prenom} ${st.nom}`.toLowerCase().includes(addForm.prenom.toLowerCase())).map(st => (
                      <div 
                        key={st.id} 
                        style={{ padding: "8px 12px", cursor: "pointer", borderBottom: `1px solid ${C.border}`, color: C.ink, fontSize: 13 }}
                        onMouseDown={() => {
                          setAddForm({
                            ...addForm,
                            studentId: st.id,
                            prenom: st.prenom,
                            nom: st.nom,
                            phone: st.phone || "",
                            level: st.studyClass || addForm.level,
                          });
                          setShowStudentDropdown(false);
                        }}
                      >
                        <strong>{st.prenom} {st.nom}</strong> {st.phone && <span style={{ color: C.inkSoft, fontSize: 11 }}>({st.phone})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Téléphone & Niveau */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "رقم الهاتف" : "Téléphone"}
                </label>
                <input
                  type="text"
                  style={inputStyle}
                  value={addForm.phone}
                  onChange={e => setAddForm({ ...addForm, phone: e.target.value })}
                  placeholder="05XXXXXXXX"
                />
              </div>

              <div>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "المستوى الدراسي (Année d'étude)" : "Niveau / Année d'étude"}
                </label>
                <input
                  type="text"
                  style={inputStyle}
                  value={addForm.level}
                  onChange={e => setAddForm({ ...addForm, level: e.target.value })}
                  list="debt-levels-presets"
                  placeholder="ex: 2ème AS"
                  required
                />
                <datalist id="debt-levels-presets">
                  {STUDY_LEVELS.map(lvl => (
                    <option key={lvl} value={lvl} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Montant de la dette & Année de la dette */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "مبلغ الدين (DA)" : "Montant de la Dette (DA)"}
                </label>
                <input
                  type="number"
                  style={{ ...inputStyle, fontWeight: 800, color: "#f87171" }}
                  value={addForm.amount}
                  onChange={e => setAddForm({ ...addForm, amount: e.target.value })}
                  required
                  min="1"
                  placeholder="5000"
                />
              </div>

              <div>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "سنة الدين (Année de dette)" : "Année de la dette"}
                </label>
                <input
                  type="text"
                  style={inputStyle}
                  value={addForm.debtYear}
                  onChange={e => setAddForm({ ...addForm, debtYear: e.target.value })}
                  list="debt-years-presets"
                  placeholder="2024/2025"
                  required
                />
                <datalist id="debt-years-presets">
                  {DEBT_YEARS.map(yr => (
                    <option key={yr} value={yr} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Enseignant & Versement Initial */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "الأستاذ / المادة (اختياري)" : "Professeur / Matière"}
                </label>
                <input
                  type="text"
                  style={inputStyle}
                  value={addForm.teacher}
                  onChange={e => setAddForm({ ...addForm, teacher: e.target.value })}
                  placeholder="ex: Prof Maths"
                />
              </div>

              <div>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "دفعة فورية مسددة (Versement)" : "Versement initial (DA)"}
                </label>
                <input
                  type="number"
                  style={{ ...inputStyle, fontWeight: 700, color: "#4ade80" }}
                  value={addForm.paymentAmount}
                  onChange={e => setAddForm({ ...addForm, paymentAmount: e.target.value })}
                  min="0"
                  max={addForm.amount || undefined}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "none", color: C.ink, cursor: "pointer", fontWeight: 600 }}
              >
                {lang === "ar" ? "إلغاء" : "Annuler"}
              </button>
              <button
                type="submit"
                style={{ padding: "10px 20px", borderRadius: 10, background: C.accent, border: "none", color: "#fff", cursor: "pointer", fontWeight: 800 }}
              >
                {lang === "ar" ? "حفظ وتأكيد الدين" : "Enregistrer la dette"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal 2: Effectuer un Versement ── */}
      {payModal && (
        <Modal title={lang === "ar" ? `تسديد دفعة (Versement) : ${payModal.studentName}` : `Effectuer un Versement : ${payModal.studentName}`} onClose={() => setPayModal(null)}>
          <form onSubmit={handlePaySubmit} style={{ display: "grid", gap: 16 }}>
            <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(226,150,58,0.1)", border: "1px solid rgba(226,150,58,0.25)" }}>
              <div style={{ fontSize: 12, color: C.inkSoft }}>{lang === "ar" ? "المبلغ المتبقي غير المسدد:" : "Reste à payer sur cette dette :"}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#f87171", marginTop: 2 }}>
                {payModal.maxAmount.toLocaleString()} DA
              </div>
            </div>

            <div>
              <label style={{ display: "block", color: C.inkSoft, fontSize: 13, marginBottom: 6, fontWeight: 600 }}>
                {lang === "ar" ? "المبلغ المراد دفعه الآن (DA)" : "Montant à verser (DA)"}
              </label>
              <input 
                type="number" 
                style={{ ...inputStyle, fontSize: 16, fontWeight: 800, color: "#4ade80" }} 
                value={payAmount} 
                onChange={e => setPayAmount(e.target.value)} 
                required 
                min="1"
                max={payModal.maxAmount}
                autoFocus
              />

              {/* Quick shortcut buttons */}
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {[1000, 2000, 3000, 5000].filter(v => v < payModal.maxAmount).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setPayAmount(v)}
                    style={{
                      padding: "4px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                      background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: C.inkSoft, cursor: "pointer"
                    }}
                  >
                    +{v} DA
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPayAmount(payModal.maxAmount)}
                  style={{
                    padding: "4px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                    background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", cursor: "pointer"
                  }}
                >
                  {lang === "ar" ? "المبلغ كامل (Totalité)" : "Totalité (Soldé)"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setPayModal(null)}
                style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "none", color: C.ink, cursor: "pointer", fontWeight: 600 }}
              >
                {lang === "ar" ? "إلغاء" : "Annuler"}
              </button>
              <button
                type="submit"
                style={{ padding: "10px 20px", borderRadius: 10, background: "#4ade80", border: "none", color: "#120e2e", cursor: "pointer", fontWeight: 800 }}
              >
                {lang === "ar" ? "تأكيد الدفعة (Valider)" : "Confirmer le Versement"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal 3: Modifier la Dette & Compte ── */}
      {editingDebt && (
        <Modal title={lang === "ar" ? `تعديل دين وحساب : ${editingDebt.prenom} ${editingDebt.nom}` : `Modifier la Dette : ${editingDebt.prenom} ${editingDebt.nom}`} onClose={() => setEditingDebt(null)}>
          <form onSubmit={handleEditSubmit} style={{ display: "grid", gap: 14 }}>
            {/* Nom & Prénom */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "اللقب (Nom)" : "Nom"}
                </label>
                <input
                  type="text"
                  style={inputStyle}
                  value={editingDebt.nom}
                  onChange={e => setEditingDebt({ ...editingDebt, nom: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "الاسم (Prénom)" : "Prénom"}
                </label>
                <input
                  type="text"
                  style={inputStyle}
                  value={editingDebt.prenom}
                  onChange={e => setEditingDebt({ ...editingDebt, prenom: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Téléphone & Niveau */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "رقم الهاتف" : "Téléphone"}
                </label>
                <input
                  type="text"
                  style={inputStyle}
                  value={editingDebt.phone}
                  onChange={e => setEditingDebt({ ...editingDebt, phone: e.target.value })}
                  placeholder="05XXXXXXXX"
                />
              </div>
              <div>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "المستوى الدراسي" : "Niveau / Classe"}
                </label>
                <input
                  type="text"
                  style={inputStyle}
                  value={editingDebt.level}
                  onChange={e => setEditingDebt({ ...editingDebt, level: e.target.value })}
                  list="edit-debt-levels"
                  required
                />
                <datalist id="edit-debt-levels">
                  {STUDY_LEVELS.map(lvl => (
                    <option key={lvl} value={lvl} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Montant de la dette & Année de la dette */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "مبلغ الدين الإجمالي (DA)" : "Montant Total Dette (DA)"}
                </label>
                <input
                  type="number"
                  style={{ ...inputStyle, fontWeight: 800, color: "#f87171" }}
                  value={editingDebt.amount}
                  onChange={e => setEditingDebt({ ...editingDebt, amount: e.target.value })}
                  required
                  min="1"
                />
              </div>
              <div>
                <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                  {lang === "ar" ? "سنة الدين" : "Année de la dette"}
                </label>
                <input
                  type="text"
                  style={inputStyle}
                  value={editingDebt.debtYear}
                  onChange={e => setEditingDebt({ ...editingDebt, debtYear: e.target.value })}
                  list="edit-debt-years"
                  required
                />
                <datalist id="edit-debt-years">
                  {DEBT_YEARS.map(yr => (
                    <option key={yr} value={yr} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Enseignant */}
            <div>
              <label style={{ display: "block", color: C.inkSoft, fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                {lang === "ar" ? "الأستاذ / المادة" : "Professeur / Matière"}
              </label>
              <input
                type="text"
                style={inputStyle}
                value={editingDebt.teacher}
                onChange={e => setEditingDebt({ ...editingDebt, teacher: e.target.value })}
                placeholder="Professeur"
              />
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setEditingDebt(null)}
                style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "none", color: C.ink, cursor: "pointer", fontWeight: 600 }}
              >
                {lang === "ar" ? "إلغاء" : "Annuler"}
              </button>
              <button
                type="submit"
                style={{ padding: "10px 20px", borderRadius: 10, background: C.accent, border: "none", color: "#fff", cursor: "pointer", fontWeight: 800 }}
              >
                {lang === "ar" ? "حفظ التعديلات" : "Enregistrer les modifications"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
