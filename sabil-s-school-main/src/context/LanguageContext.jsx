import React, { createContext, useContext, useState, useEffect } from "react";

const translations = {
  fr: {
    // General
    loading: "Chargement…",
    cancel: "Annuler",
    save: "Enregistrer",
    delete: "Supprimer",
    edit: "Modifier",
    search: "Rechercher…",
    actions: "Actions",
    confirm: "Confirmer",
    close: "Fermer",
    back: "Retour",
    yes: "Oui",
    no: "Non",
    all: "Tous",

    // Roles & Levels & Types
    admin: "Administration",
    parent: "Parent",
    student: "Élève",
    primaire: "Primaire",
    cem: "CEM",
    lycee: "Lycée",
    typeNormal: "Normal",
    typeSpecial: "Spécial",
    typeIndividuel: "Individuel",

    // Login
    loginTitle: "Sabil's School",
    loginSubtitle: "Système de Gestion Scolaire & Plateforme Numérique",
    loginIdentifierLabel: "Identifiant / Téléphone",
    loginIdentifierPlaceholder: "Nom d'utilisateur ou téléphone",
    loginPasswordLabel: "MOT DE PASSE",
    loginForgot: "Mot de passe oublié ?",
    loginRemember: "Mémoriser ce poste",
    loginSubmit: "Se connecter →",
    loginError: "Identifiants incorrects",

    // Sidebar & Navigation
    categories: "Catégories",
    allGroups: "Tous les groupes",
    quickNav: "Accès Rapide",
    parentsList: "Gestion des Parents",
    messagesNav: "Messagerie directe",
    settingsNav: "Paramètres du compte",
    logout: "Déconnexion",
    searchStudentPlaceholder: "Rechercher un élève…",

    // Admin Dashboard / Groups
    mySchool: "Mon Établissement",
    manageGroupsSubtitle: "Gestion des niveaux et suivi des présences",
    addGroup: "+ Nouveau groupe",
    addStudent: "+ Ajouter un élève",
    noGroupsTitle: "Aucun groupe dans cette catégorie",
    noGroupsSubtitle: "Créez votre premier groupe pour commencer à ajouter des élèves.",
    createGroupBtn: "Créer un groupe",
    groupStudentsCount: "élève(s)",
    sessionsCount: "séances",
    addSessionBtn: "+ Séance supplémentaire",
    deleteGroupConfirm: "Êtes-vous sûr de vouloir supprimer ce groupe ?",
    groupDeleted: "Groupe supprimé",
    groupCreated: "Groupe créé",
    studentAdded: "Élève ajouté au groupe",
    studentDeleted: "Élève supprimé",
    extraSessionAdded: "Séance supplémentaire ajoutée",
    monthlyPrice: "Tarif mensuel",
    paid: "Payé",
    unpaid: "Non payé",
    markPaid: "Marquer comme payé",
    markUnpaid: "Marquer comme non payé",
    present: "Présent",
    absent: "Absent",
    notifyAbsenceToast: "Notification d'absence envoyée à {name}",
    paymentReminderToast: "Rappel de paiement envoyé à {name}",
    presenceRate: "Taux de présence",

    // Parents Screen
    parentsTitle: "Gestion des Parents",
    parentsSubtitle: "Suivi des comptes et coordonnées des responsables",
    addParentBtn: "+ Nouveau parent",
    searchParentPlaceholder: "Rechercher par nom ou numéro…",
    noParentsFound: "Aucun compte parent trouvé",
    parentLinkedStudent: "Élève associé :",
    noLinkedStudent: "Aucun élève lié",
    sendReminderBtn: "Rappel paiement",
    whatsappBtn: "WhatsApp",
    chatBtn: "Message",
    deleteParentConfirm: "Voulez-vous vraiment supprimer ce compte parent ?",
    parentDeletedToast: "Compte parent supprimé",
    parentAddedToast: "Parent ajouté avec succès",
    parentUpdatedToast: "Compte parent modifié",

    // Chat Screen
    chatTitle: "Messagerie",
    chatSubtitle: "Échangez directement avec l'administration et les parents",
    typeMessagePlaceholder: "Écrivez votre message…",
    sendBtn: "Envoyer",
    noConversationSelected: "Sélectionnez une discussion",
    noMessagesYet: "Aucun message pour le moment. Démarrez la conversation !",
    today: "Aujourd'hui",
    yesterday: "Hier",

    // Settings Screen
    settingsTitle: "Paramètres du Profil",
    settingsSubtitle: "Modifiez vos identifiants et informations administratives",
    adminInfo: "Informations Administrateur",
    firstNameLabel: "Prénom",
    lastNameLabel: "Nom",
    usernameLabel: "Nom d'utilisateur",
    newPasswordLabel: "Nouveau mot de passe",
    avatarLabel: "Avatar / Émoji",
    saveSettingsBtn: "Enregistrer les modifications",
    settingsSavedToast: "Profil mis à jour ✓",
    languagePreference: "Langue de l'application",

    // Parent App
    parentPortalTitle: "Carnet de Classe",
    parentWelcome: "Bienvenue",
    noStudentLinked: "Aucun élève lié à ce compte.",
    monthlyPresences: "Présences ce mois",
    monthlyAbsences: "Absences ce mois",
    sessionsDetail: "Détail des séances",
    session: "Séance",
    notifications: "Notifications",
    noNotifications: "Aucune notification",
    notificationsBadgeNew: "nouvelle(s)",
    paymentStatus: "Statut du paiement",
    paymentUpToDate: "Paiement à jour",
    paymentPending: "Paiement en attente",

    // Modals
    modalNewGroup: "Nouveau groupe",
    modalEditGroup: "Modifier le groupe",
    groupNameLabel: "Nom du groupe",
    groupNamePlaceholder: "Ex: Groupe A, Maths Avancé…",
    levelLabel: "Niveau scolaire",
    yearLabel: "Année",
    typeLabel: "Type de groupe",
    monthlyFeeLabel: "Tarif mensuel (DA)",

    modalNewStudent: "Ajouter un élève",
    modalEditStudent: "Modifier l'élève",
    studentFirstNameLabel: "Prénom de l'élève",
    studentLastNameLabel: "Nom de l'élève",
    studentAgeLabel: "Âge",

    modalNewParent: "Nouveau compte parent",
    modalEditParent: "Modifier le parent",
    parentFullNameLabel: "Nom et prénom du parent",
    phoneLabel: "Numéro de téléphone",
    passwordLabel: "Mot de passe de connexion",
    linkStudentLabel: "Associer à un élève",

    modalAddSession: "Ajouter une séance supplémentaire",
    selectGroupLabel: "Sélectionner le groupe",
    sessionDateLabel: "Date de la séance",
    sessionNoteLabel: "Remarque / Sujet (optionnel)",
  },

  ar: {
    // General
    loading: "جاري التحميل…",
    cancel: "إلغاء",
    save: "حفظ",
    delete: "حذف",
    edit: "تعديل",
    search: "بحث…",
    actions: "إجراءات",
    confirm: "تأكيد",
    close: "إغلاق",
    back: "رجوع",
    yes: "نعم",
    no: "لا",
    all: "الكل",

    // Roles & Levels & Types
    admin: "الإدارة",
    parent: "ولي الأمر",
    student: "تلميذ",
    primaire: "ابتدائي",
    cem: "متوسط",
    lycee: "ثانوي",
    typeNormal: "عادي",
    typeSpecial: "خاص",
    typeIndividuel: "فردي",

    // Login
    loginTitle: "مدرسة سبيل",
    loginSubtitle: "نظام التسيير المدرسي والمنصة الرقمية",
    loginIdentifierLabel: "اسم المستخدم أو رقم الهاتف",
    loginIdentifierPlaceholder: "اسم المستخدم أو الهاتف",
    loginPasswordLabel: "كلمة المرور",
    loginForgot: "نسيت الكلمة؟",
    loginRemember: "تذكر هذا الجهاز",
    loginSubmit: "تسجيل الدخول ←",
    loginError: "بيانات الدخول غير صحيحة",

    // Sidebar & Navigation
    categories: "الأقسام والمستويات",
    allGroups: "جميع الأفواج",
    quickNav: "وصول سريع",
    parentsList: "أولياء الأمور",
    messagesNav: "المراسلة المباشرة",
    settingsNav: "إعدادات الحساب",
    logout: "تسجيل الخروج",
    searchStudentPlaceholder: "بحث عن تلميذ…",

    // Admin Dashboard / Groups
    mySchool: "مؤسستي التعليمية",
    manageGroupsSubtitle: "إدارة المستويات ومتابعة الحضور والغياب",
    addGroup: "+ فوج جديد",
    addStudent: "+ إضافة تلميذ",
    noGroupsTitle: "لا يوجد أي فوج في هذا القسم",
    noGroupsSubtitle: "أنشئ فوجك الأول للبدء في إضافة التلاميذ ومتابعتهم.",
    createGroupBtn: "إنشاء فوج",
    groupStudentsCount: "تلميذ",
    sessionsCount: "حصص",
    addSessionBtn: "+ حصة إضافية",
    deleteGroupConfirm: "هل أنت متأكد من رغبتك في حذف هذا الفوج؟",
    groupDeleted: "تم حذف الفوج",
    groupCreated: "تم إنشاء الفوج بنجاح",
    studentAdded: "تمت إضافة التلميذ إلى الفوج",
    studentDeleted: "تم حذف التلميذ",
    extraSessionAdded: "تمت إضافة الحصة الإضافية",
    monthlyPrice: "الاشتراك الشهري",
    paid: "تم الدفع",
    unpaid: "غير مدفوع",
    markPaid: "تحديد كمدفوع",
    markUnpaid: "تحديد كغير مدفوع",
    present: "حاضر",
    absent: "غائب",
    notifyAbsenceToast: "تم إرسال إشعار الغياب إلى {name}",
    paymentReminderToast: "تم إرسال تذكير الدفع إلى {name}",
    presenceRate: "نسبة الحضور",

    // Parents Screen
    parentsTitle: "إدارة أولياء الأمور",
    parentsSubtitle: "متابعة الحسابات والتواصل مع أولياء التلاميذ",
    addParentBtn: "+ ولي أمر جديد",
    searchParentPlaceholder: "بحث بالاسم أو رقم الهاتف…",
    noParentsFound: "لم يتم العثور على أي حساب ولي أمر",
    parentLinkedStudent: "التلميذ التابع له:",
    noLinkedStudent: "لا يوجد تلميذ مرتبط",
    sendReminderBtn: "تذكير بالدفع",
    whatsappBtn: "واتساب",
    chatBtn: "مراسلة",
    deleteParentConfirm: "هل أنت متأكد من حذف حساب ولي الأمر هذا؟",
    parentDeletedToast: "تم حذف حساب ولي الأمر",
    parentAddedToast: "تمت إضافة ولي الأمر بنجاح",
    parentUpdatedToast: "تم تحديث حساب ولي الأمر",

    // Chat Screen
    chatTitle: "الرسائل والمحادثات",
    chatSubtitle: "تواصل مباشر وفوري بين الإدارة وأولياء الأمور",
    typeMessagePlaceholder: "اكتب رسالتك هنا…",
    sendBtn: "إرسال",
    noConversationSelected: "اختر محادثة لعرض الرسائل",
    noMessagesYet: "لا توجد رسائل بعد. ابدأ المحادثة الآن!",
    today: "اليوم",
    yesterday: "أمس",

    // Settings Screen
    settingsTitle: "إعدادات الملف الشخصي",
    settingsSubtitle: "تعديل بيانات الحساب الإداري وكلمة المرور",
    adminInfo: "معلومات المسؤول الإداري",
    firstNameLabel: "الاسم",
    lastNameLabel: "اللقب",
    usernameLabel: "اسم المستخدم",
    newPasswordLabel: "كلمة المرور الجديدة",
    avatarLabel: "الصورة الرمزية",
    saveSettingsBtn: "حفظ التغييرات",
    settingsSavedToast: "تم تحديث الملف الشخصي بنجاح ✓",
    languagePreference: "لغة التطبيق",

    // Parent App
    parentPortalTitle: "دفتر المتابعة المدرسية",
    parentWelcome: "مرحباً بك",
    noStudentLinked: "لا يوجد تلميذ مرتبط بهذا الحساب.",
    monthlyPresences: "حضور هذا الشهر",
    monthlyAbsences: "غياب هذا الشهر",
    sessionsDetail: "تفاصيل الحصص",
    session: "حصة",
    notifications: "الإشعارات",
    noNotifications: "لا توجد إشعارات حالياً",
    notificationsBadgeNew: "جديدة",
    paymentStatus: "حالة الدفع",
    paymentUpToDate: "الاشتراك مدفوع",
    paymentPending: "في انتظار الدفع",

    // Modals
    modalNewGroup: "فوج جديد",
    modalEditGroup: "تعديل الفوج",
    groupNameLabel: "اسم الفوج",
    groupNamePlaceholder: "مثال: فوج الرياضيات، فوج أ…",
    levelLabel: "المستوى التعليمي",
    yearLabel: "السنة الدراسية",
    typeLabel: "نوع الفوج",
    monthlyFeeLabel: "المبلغ الشهري (دج)",

    modalNewStudent: "إضافة تلميذ جديد",
    modalEditStudent: "تعديل بيانات التلميذ",
    studentFirstNameLabel: "اسم التلميذ",
    studentLastNameLabel: "لقب التلميذ",
    studentAgeLabel: "العمر",

    modalNewParent: "حساب ولي أمر جديد",
    modalEditParent: "تعديل بيانات ولي الأمر",
    parentFullNameLabel: "اسم ولقب ولي الأمر",
    phoneLabel: "رقم الهاتف",
    passwordLabel: "كلمة مرور الحساب",
    linkStudentLabel: "ربط بالتلميذ",

    modalAddSession: "إضافة حصة إضافية",
    selectGroupLabel: "اختر الفوج",
    sessionDateLabel: "تاريخ الحصة",
    sessionNoteLabel: "ملاحظة / موضوع الحصة (اختياري)",
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem("ecole-lang") || "fr";
    } catch {
      return "fr";
    }
  });

  const setLang = (newLang) => {
    setLangState(newLang);
    try {
      localStorage.setItem("ecole-lang", newLang);
    } catch {
      /* ignore */
    }
  };

  const isRTL = lang === "ar";

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, isRTL]);

  const t = (key, params = {}) => {
    let str = translations[lang]?.[key] || translations.fr?.[key] || key;
    if (params) {
      Object.keys(params).forEach((k) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), params[k]);
      });
    }
    return str;
  };

  const toggleLang = () => {
    setLang(lang === "fr" ? "ar" : "fr");
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, isRTL, t, translations }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
