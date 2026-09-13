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
    parentsList: "Comptes Étudiants",
    messagesNav: "Groupes de communication",
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

    // Comm Groups & Categories
    commGroupsTitle: "Groupes de communication",
    commGroupsSubtitle: "Canaux de communication entre l'administration et les parents",
    addCommGroup: "+ Nouveau groupe",
    commGroupNameLabel: "Nom du groupe",
    commGroupNamePlaceholder: "Ex: A1, B2, Groupe avancé…",
    commGroupCreated: "Groupe créé",
    commGroupDeleted: "Groupe supprimé",
    deleteCommGroupConfirm: "Supprimer ce groupe de communication ?",
    noCommGroups: "Aucun groupe de communication",
    noCommGroupsSubtitle: "Créez un groupe pour commencer à échanger.",
    selectCommGroup: "Sélectionnez un groupe",
    noGroupsInCategory: "Aucun groupe dans cette catégorie",
    membersCount: "membre(s)",
    pinnedToGroup: "Groupe épinglé",
    addCommCategory: "+ Nouvelle catégorie",
    commCategoryNameLabel: "Nom de la catégorie",
    commCategoryNamePlaceholder: "Ex: Langue Française, Maths, Arabe…",
    commCatCreated: "Catégorie créée",
    commCatDeleted: "Catégorie supprimée",
    deleteCommCategoryConfirm: "Supprimer cette catégorie et tous ses groupes ?",
    noCommCategories: "Aucune catégorie",
    noCommCategoriesSubtitle: "Créez une catégorie pour organiser vos groupes.",
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

    // Student Accounts Screen
    parentsTitle: "Gestion des Comptes Étudiants",
    parentsSubtitle: "Suivi des comptes de connexion et coordonnées des élèves",
    addParentBtn: "+ Nouveau compte",
    searchParentPlaceholder: "Rechercher par nom ou numéro…",
    noParentsFound: "Aucun compte étudiant trouvé",
    parentLinkedStudent: "Élève associé :",
    noLinkedStudent: "Aucun élève lié",
    sendReminderBtn: "Rappel paiement",
    whatsappBtn: "WhatsApp",
    chatBtn: "Message",
    deleteParentConfirm: "Voulez-vous vraiment supprimer ce compte ?",
    parentDeletedToast: "Compte supprimé",
    parentAddedToast: "Compte ajouté avec succès",
    parentUpdatedToast: "Compte modifié",

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

    modalNewParent: "Nouveau compte étudiant",
    modalEditParent: "Modifier le compte",
    parentFullNameLabel: "Nom et prénom",
    phoneLabel: "Numéro de téléphone",
    passwordLabel: "Mot de passe de connexion",
    linkStudentLabel: "Associer à un élève",

    modalAddSession: "Ajouter une séance supplémentaire",
    selectGroupLabel: "Sélectionner le groupe",
    // Financials
    financeNav: "Finances",
    financeTitle: "Tableau de Bord Financier",
    financeSubtitle: "Suivi des revenus, paiements et statistiques globales",
    totalIncome: "Revenus (Ce mois)",
    expectedIncome: "Revenus attendus",
    unpaidAmount: "Montant non payé",
    paidStudents: "Élèves à jour",
    unpaidStudents: "Élèves avec impayés",
    totalGroups: "Total Groupes",
    totalStudentsStat: "Total Élèves",
    selectMonth: "Sélectionner le mois",
    regularSessions: "Séances régulières",
    extraSessionsFinance: "Séances supplémentaires",
    totalCollected: "Total encaissé",
    extraSessionPrice: "Prix de la séance",
    pricePerStudent: "Par élève",
    priceForGroup: "Prix global",
    partial: "Partiel",
    amountPaid: "Montant payé",
    amountRemaining: "Reste",
    paymentDate: "Date de paiement",
    addExtraSession: "+ Séance suppl.",
    extraSessionTitle: "Séance Supplémentaire",
    groupSummary: "Bilan des groupes",
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
    parentsList: "حسابات الطلاب",
    messagesNav: "مجموعات التواصل",
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

    // Comm Groups & Categories
    commGroupsTitle: "مجموعات التواصل",
    commGroupsSubtitle: "قنوات التواصل بين الإدارة وأولياء الأمور",
    addCommGroup: "+ مجموعة جديدة",
    commGroupNameLabel: "اسم المجموعة",
    commGroupNamePlaceholder: "مثال: A1، B2، مجموعة متقدمة…",
    commGroupCreated: "تم إنشاء المجموعة بنجاح",
    commGroupDeleted: "تم حذف المجموعة",
    deleteCommGroupConfirm: "هل تريد حذف مجموعة التواصل هذه؟",
    noCommGroups: "لا توجد مجموعات تواصل",
    noCommGroupsSubtitle: "أنشئ مجموعة للبدء في التواصل.",
    selectCommGroup: "اختر مجموعة",
    noGroupsInCategory: "لا توجد مجموعات في هذا التصنيف",
    membersCount: "عضو",
    pinnedToGroup: "مجموعة مثبتة",
    addCommCategory: "+ تصنيف جديد",
    commCategoryNameLabel: "اسم التصنيف",
    commCategoryNamePlaceholder: "مثال: اللغة الفرنسية، رياضيات، عربية…",
    commCatCreated: "تم إنشاء التصنيف بنجاح",
    commCatDeleted: "تم حذف التصنيف",
    deleteCommCategoryConfirm: "حذف هذا التصنيف وجميع مجموعاته؟",
    noCommCategories: "لا توجد تصنيفات",
    noCommCategoriesSubtitle: "أنشئ تصنيفاً لتنظيم مجموعاتك.",
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

    // Student Accounts Screen
    parentsTitle: "إدارة حسابات الطلاب",
    parentsSubtitle: "متابعة حسابات الدخول والتواصل مع التلاميذ",
    addParentBtn: "+ حساب جديد",
    searchParentPlaceholder: "بحث بالاسم أو رقم الهاتف…",
    noParentsFound: "لم يتم العثور على أي حساب طالب",
    parentLinkedStudent: "التلميذ المرتبط:",
    noLinkedStudent: "لا يوجد تلميذ مرتبط",
    sendReminderBtn: "تذكير بالدفع",
    whatsappBtn: "واتساب",
    chatBtn: "مراسلة",
    deleteParentConfirm: "هل أنت متأكد من حذف هذا الحساب؟",
    parentDeletedToast: "تم حذف الحساب",
    parentAddedToast: "تمت إضافة الحساب بنجاح",
    parentUpdatedToast: "تم تحديث الحساب",

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

    modalNewParent: "حساب طالب جديد",
    modalEditParent: "تعديل بيانات الحساب",
    parentFullNameLabel: "اسم ولقب الطالب",
    phoneLabel: "رقم الهاتف",
    passwordLabel: "كلمة مرور الحساب",
    linkStudentLabel: "ربط بالتلميذ",

    modalAddSession: "إضافة حصة إضافية",
    selectGroupLabel: "اختر الفوج",
    // Financials
    financeNav: "المالية",
    financeTitle: "لوحة القيادة المالية",
    financeSubtitle: "متابعة الدخل والمدفوعات والإحصائيات العامة",
    totalIncome: "الدخل (هذا الشهر)",
    expectedIncome: "الدخل المتوقع",
    unpaidAmount: "المبلغ غير المدفوع",
    paidStudents: "تلاميذ سددوا",
    unpaidStudents: "تلاميذ لم يسددوا",
    totalGroups: "مجموع الأفواج",
    totalStudentsStat: "إجمالي التلاميذ",
    selectMonth: "اختر الشهر",
    regularSessions: "الحصص العادية",
    extraSessionsFinance: "الحصص الإضافية",
    totalCollected: "إجمالي المحصل",
    extraSessionPrice: "سعر الحصة",
    pricePerStudent: "لكل تلميذ",
    priceForGroup: "للمجموعة كاملة",
    partial: "جزئي",
    amountPaid: "المبلغ المدفوع",
    amountRemaining: "المتبقي",
    paymentDate: "تاريخ الدفع",
    addExtraSession: "+ حصة إضافية",
    extraSessionTitle: "حصة إضافية",
    groupSummary: "ملخص الأفواج",
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

  const isRTL = false; // اتجاه الكتابة ثابت LTR دائماً

  useEffect(() => {
    document.documentElement.dir = "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

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
