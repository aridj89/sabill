// scratch/test_same_name_level_isolation.js
// Automated verification script for Category & Level Isolation (Primaire 4ème vs CEM 4ème)

console.log("==========================================");
console.log("🧪 TESTING SAME-NAME LEVEL ISOLATION (Primaire 4ème vs CEM 4ème)");
console.log("==========================================");

const mockData = {
  academicYears: [
    { id: "2025-2026", name: "2025-2026", isCurrent: true },
    { id: "2026-2027", name: "2026-2027", isCurrent: false },
  ],
  groups: [
    { id: "grp_prim_4a", nom: "Groupe Primaire A", categoryId: "primaire", levelId: "4ème", academicYearId: "2025-2026" },
    { id: "grp_cem_4a", nom: "Groupe CEM A", categoryId: "cem", levelId: "4ème", academicYearId: "2025-2026" },
    { id: "grp_cem_4_2026", nom: "Groupe CEM 2026", categoryId: "cem", levelId: "4ème", academicYearId: "2026-2027" },
  ],
  students: [
    { id: "stu_ahmed", nom: "Benali", prenom: "Ahmed", groupId: "grp_prim_4a" },
    { id: "stu_yacine", nom: "Brahimi", prenom: "Yacine", groupId: "grp_cem_4a" },
    { id: "stu_karim", nom: "Kasi", prenom: "Karim", groupId: "grp_cem_4_2026" },
  ],
  enrollments: [
    { id: "en_ahmed", studentId: "stu_ahmed", academicYearId: "2025-2026", groupId: "grp_prim_4a" },
    { id: "en_yacine", studentId: "stu_yacine", academicYearId: "2025-2026", groupId: "grp_cem_4a" },
    { id: "en_karim", studentId: "stu_karim", academicYearId: "2026-2027", groupId: "grp_cem_4_2026" },
  ],
};

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(` ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(` ❌ FAIL: ${message}`);
    failed++;
  }
}

// 1. Group Filtering for Primaire 4ème (2025-2026)
const primGroups = mockData.groups.filter(g => 
  g.categoryId === "primaire" && g.levelId === "4ème" && g.academicYearId === "2025-2026"
);
assert(primGroups.length === 1 && primGroups[0].id === "grp_prim_4a", "Primaire 4ème (2025-2026) should only find grp_prim_4a");

// 2. Student Resolution for Primaire 4ème Group
const primGroup = primGroups[0];
const primEnrollments = mockData.enrollments.filter(e => e.groupId === primGroup.id && e.academicYearId === "2025-2026");
const primEnrolledStudentIds = new Set(primEnrollments.map(e => e.studentId));
const primStudents = mockData.students.filter(s => primEnrolledStudentIds.has(s.id));

assert(primStudents.length === 1 && primStudents[0].id === "stu_ahmed", "Primaire 4ème group should ONLY contain Ahmed");
assert(!primStudents.some(s => s.id === "stu_yacine"), "Yacine MUST NOT appear in Primaire 4ème");

// 3. Group Filtering for CEM 4ème (2025-2026)
const cemGroups = mockData.groups.filter(g => 
  g.categoryId === "cem" && g.levelId === "4ème" && g.academicYearId === "2025-2026"
);
assert(cemGroups.length === 1 && cemGroups[0].id === "grp_cem_4a", "CEM 4ème (2025-2026) should only find grp_cem_4a");

// 4. Student Resolution for CEM 4ème Group
const cemGroup = cemGroups[0];
const cemEnrollments = mockData.enrollments.filter(e => e.groupId === cemGroup.id && e.academicYearId === "2025-2026");
const cemEnrolledStudentIds = new Set(cemEnrollments.map(e => e.studentId));
const cemStudents = mockData.students.filter(s => cemEnrolledStudentIds.has(s.id));

assert(cemStudents.length === 1 && cemStudents[0].id === "stu_yacine", "CEM 4ème group should ONLY contain Yacine");
assert(!cemStudents.some(s => s.id === "stu_ahmed"), "Ahmed MUST NOT appear in CEM 4ème");

// 5. Academic Year Isolation (2025-2026 vs 2026-2027)
const cem2026Groups = mockData.groups.filter(g => 
  g.categoryId === "cem" && g.levelId === "4ème" && g.academicYearId === "2026-2027"
);
const cem2026Group = cem2026Groups[0];
const cem2026Enrollments = mockData.enrollments.filter(e => e.groupId === cem2026Group.id && e.academicYearId === "2026-2027");
const cem2026EnrolledStudentIds = new Set(cem2026Enrollments.map(e => e.studentId));
const cem2026Students = mockData.students.filter(s => cem2026EnrolledStudentIds.has(s.id));

assert(cem2026Students.length === 1 && cem2026Students[0].id === "stu_karim", "2026-2027 CEM 4ème should ONLY contain Karim");
assert(!cem2026Students.some(s => s.id === "stu_yacine"), "2025-2026 Yacine MUST NOT appear in 2026-2027");

console.log("\n==========================================");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("==========================================");

if (failed > 0) {
  process.exit(1);
}
