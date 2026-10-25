// scratch/check_group_enrollments.js
import { loadDatabase } from "../server/dbHelpers.js";

console.log("==========================================");
console.log("🔍 AUDITING GROUPS & ENROLLMENTS FOR SAME-NAME LEVELS");
console.log("==========================================");

const data = loadDatabase();

const groups = data.groups || [];
const students = data.students || [];
const enrollments = data.enrollments || [];

console.log(`📊 Found ${groups.length} groups, ${students.length} students, ${enrollments.length} enrollments.`);

let ambiguousGroups = 0;
let ambiguousEnrollments = 0;

groups.forEach(g => {
  if (!g.categoryId || !g.levelId) {
    console.warn(`⚠️ Group missing scope: id=${g.id}, nom=${g.nom}, categoryId=${g.categoryId}, levelId=${g.levelId}`);
    ambiguousGroups++;
  }
});

enrollments.forEach(e => {
  if (!e.groupId) {
    console.warn(`⚠️ Enrollment missing groupId: id=${e.id}, studentId=${e.studentId}`);
    ambiguousEnrollments++;
  }
});

console.log("\n--- GROUP SCOPE SUMMARY ---");
groups.forEach(g => {
  const enCount = enrollments.filter(e => e.groupId === g.id).length;
  const stCount = students.filter(s => s.groupId === g.id).length;
  console.log(`Group [${g.id}] "${g.nom}": categoryId=${g.categoryId}, levelId=${g.levelId}, year=${g.academicYearId} => Enrollments: ${enCount}, Students(direct): ${stCount}`);
});

console.log("\n==========================================");
console.log(`Audit finished: ${ambiguousGroups} ambiguous groups, ${ambiguousEnrollments} ambiguous enrollments.`);
console.log("==========================================");
