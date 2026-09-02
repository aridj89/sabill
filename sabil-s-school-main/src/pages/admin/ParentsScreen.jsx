import React, { useState } from "react";
import { Plus, MessageCircle, Bell, Pencil, Trash2, Search, CheckCircle, XCircle, X } from "lucide-react";
import { C, uid } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import PrimaryBtn from "../../components/ui/PrimaryBtn";
import IconBtn from "../../components/ui/IconBtn";
import Pill from "../../components/ui/Pill";
import ParentFormModal from "./ParentFormModal";

export default function ParentsScreen({ data, setData, toastFn, openChat, onBack }) {
  const { t, isRTL } = useLanguage();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");

  const studentOf = (pid) => data.students.find(s => s.id === pid);

  const removeParent = (id) => {
    if (window.confirm(t("deleteParentConfirm"))) {
      setData(d => ({ ...d, parents: d.parents.filter(p => p.id !== id) }));
      toastFn(t("parentDeletedToast"));
    }
  };

  const sendReminder = (parent) => {
    const reminderText = isRTL
      ? "تذكير: يرجى تسوية اشتراك هذا الشهر (4 حصص)."
      : "Rappel : paiement du mois (4 séances) à régler.";
    const note = { id: uid(), parentId: parent.id, text: reminderText, ts: Date.now(), read: false };
    setData(d => ({ ...d, notifications: [...d.notifications, note] }));
    toastFn(t("paymentReminderToast", { name: parent.nom }));
  };

  const filteredParents = data.parents.filter(parent => {
    const st = studentOf(parent.studentId);
    const sTerm = search.toLowerCase();
    const matchParent = parent.nom.toLowerCase().includes(sTerm);
    const matchPhone = parent.telephone.includes(sTerm);
    const matchStudent = st && (`${st.prenom} ${st.nom}`).toLowerCase().includes(sTerm);
    return matchParent || matchPhone || matchStudent;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h2 className="f-display" style={{ fontSize: 24, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: "-0.01em" }}>{t("parentsTitle")}</h2>
          <div style={{ position: "relative", width: 240, height: 38, display: "flex", alignItems: "center" }}>
            <Search size={15} color={C.inkSoft} style={{ position: "absolute", left: isRTL ? "auto" : 12, right: isRTL ? 12 : "auto", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder={t("searchParentPlaceholder")} 
              style={{
                width: "100%", height: 38, padding: isRTL ? "0 34px 0 12px" : "0 12px 0 34px", borderRadius: 10,
                border: `1px solid ${C.border}`, fontSize: 13.5, color: C.ink,
                outline: "none", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(4px)",
              }} 
            />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PrimaryBtn onClick={() => setShowAdd(true)}><Plus size={16} /> {t("addParentBtn")}</PrimaryBtn>
          {onBack && (
            <IconBtn icon={X} onClick={onBack} title={t("close")} />
          )}
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {filteredParents.map(parent => {
          const st = studentOf(parent.studentId);
          return (
            <div key={parent.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: C.navySoft, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.navy }}>
                {parent.nom.split(" ").map(x => x[0]).slice(0, 2).join("")}
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, color: C.ink, fontSize: 15 }}>{parent.nom}</div>
                <div className="f-mono" style={{ fontSize: 12.5, color: C.inkSoft }}>{parent.telephone}</div>
                <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 2 }}>{t("parentLinkedStudent")} <b style={{ color: C.ink }}>{st ? `${st.prenom} ${st.nom}` : "—"}</b></div>
              </div>
              {st && (
                <Pill good={st.paye}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {st.paye ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {st.paye ? t("paid") : t("unpaid")}
                  </div>
                </Pill>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <IconBtn icon={MessageCircle} onClick={() => openChat(parent.id)} title={t("chatBtn")} />
                <IconBtn icon={Bell} onClick={() => sendReminder(parent)} title={t("sendReminderBtn")} />
                <IconBtn icon={Pencil} onClick={() => setEditing(parent)} title={t("edit")} />
                <IconBtn icon={Trash2} onClick={() => removeParent(parent.id)} title={t("delete")} />
              </div>
            </div>
          );
        })}
        {filteredParents.length === 0 && (
          <p style={{ color: C.inkSoft }}>
            {t("noParentsFound")}
          </p>
        )}
      </div>

      {(showAdd || editing) && (
        <ParentFormModal
          data={data}
          initial={editing}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSave={(p) => {
            setData(d => {
              const exists = d.parents.some(x => x.id === p.id);
              return { ...d, parents: exists ? d.parents.map(x => x.id === p.id ? p : x) : [...d.parents, p] };
            });
            toastFn(editing ? t("parentUpdatedToast") : t("parentAddedToast"));
            setShowAdd(false); setEditing(null);
          }}
        />
      )}
    </div>
  );
}
