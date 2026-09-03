import React, { useState } from "react";
import { Save, Calendar, Clock, DollarSign, FileText } from "lucide-react";
import { C, inputStyle, uid } from "../../theme/tokens";
import { useLanguage } from "../../context/LanguageContext";
import Modal from "../../components/ui/Modal";
import PrimaryBtn from "../../components/ui/PrimaryBtn";

export default function ExtraSessionModal({ subgroupId, onClose, onSave }) {
  const { lang, t } = useLanguage();
  
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("14:00");
  const [price, setPrice] = useState(500);
  const [isGroupPrice, setIsGroupPrice] = useState(false);
  const [note, setNote] = useState("");

  const handleSave = () => {
    onSave({
      id: uid(),
      subgroupId,
      date,
      time,
      price: Number(price),
      isGroupPrice,
      note,
    });
  };

  return (
    <Modal title={t("addExtraSession")} onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        
        {/* Date & Time */}
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 6 }}>
              {lang === "ar" ? "التاريخ" : "Date"}
            </label>
            <div style={{ position: "relative" }}>
              <Calendar size={14} color={C.inkSoft} style={{ position: "absolute", left: lang === "ar" ? "auto" : 12, right: lang === "ar" ? 12 : "auto", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{ ...inputStyle, paddingLeft: lang === "ar" ? 12 : 34, paddingRight: lang === "ar" ? 34 : 12 }}
              />
            </div>
          </div>
          <div style={{ width: 120 }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 6 }}>
              {lang === "ar" ? "الوقت" : "Heure"}
            </label>
            <div style={{ position: "relative" }}>
              <Clock size={14} color={C.inkSoft} style={{ position: "absolute", left: lang === "ar" ? "auto" : 12, right: lang === "ar" ? 12 : "auto", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                style={{ ...inputStyle, paddingLeft: lang === "ar" ? 12 : 34, paddingRight: lang === "ar" ? 34 : 12 }}
              />
            </div>
          </div>
        </div>

        {/* Price & Type */}
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 6 }}>
              {t("extraSessionPrice")} (DA)
            </label>
            <div style={{ position: "relative" }}>
              <DollarSign size={14} color={C.inkSoft} style={{ position: "absolute", left: lang === "ar" ? "auto" : 12, right: lang === "ar" ? 12 : "auto", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                style={{ ...inputStyle, paddingLeft: lang === "ar" ? 12 : 34, paddingRight: lang === "ar" ? 34 : 12 }}
                min="0"
              />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 6 }}>
              {lang === "ar" ? "نوع السعر" : "Type de tarification"}
            </label>
            <select
              value={isGroupPrice ? "group" : "student"}
              onChange={e => setIsGroupPrice(e.target.value === "group")}
              style={{ ...inputStyle, appearance: "none" }}
            >
              <option value="student">{t("pricePerStudent")}</option>
              <option value="group">{t("priceForGroup")}</option>
            </select>
          </div>
        </div>

        {/* Note */}
        <div>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 6 }}>
            {lang === "ar" ? "ملاحظة (اختياري)" : "Remarque (optionnel)"}
          </label>
          <div style={{ position: "relative" }}>
            <FileText size={14} color={C.inkSoft} style={{ position: "absolute", left: lang === "ar" ? "auto" : 12, right: lang === "ar" ? 12 : "auto", top: 12 }} />
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              style={{ ...inputStyle, paddingLeft: lang === "ar" ? 12 : 34, paddingRight: lang === "ar" ? 34 : 12, resize: "vertical" }}
              placeholder={lang === "ar" ? "موضوع الحصة الإضافية…" : "Sujet de la séance..."}
            />
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <PrimaryBtn full onClick={handleSave}>
            <Save size={15} />
            {lang === "ar" ? "حفظ الحصة الإضافية" : "Enregistrer la séance suppl."}
          </PrimaryBtn>
        </div>
      </div>
    </Modal>
  );
}
