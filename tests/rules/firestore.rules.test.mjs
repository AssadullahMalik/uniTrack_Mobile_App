/**
 * UniTrack Firestore Security Rules — automated tests
 * ====================================================
 * Verifies authorized AND unauthorized access against the real rules file
 * using the Firebase Emulator Suite (no production data touched).
 *
 * SETUP (one time, only needed to run these tests):
 *   npm install --no-save firebase-tools "@firebase/rules-unit-testing@5"
 *   (v6 of rules-unit-testing requires firebase v13; this project uses v12.)
 *
 * RUN (from the project root, emulator starts and stops automatically):
 *   npm run test:rules
 *   # or directly:
 *   npx firebase emulators:exec --project demo-unitrack --only firestore "node tests/rules/firestore.rules.test.mjs"
 *
 * The emulator requires Java 11+ (verified on this machine: Java 23).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';

import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rules = readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8');

let testEnv;

// ---- tiny test harness -------------------------------------------------
let passed = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (err) {
    failures.push({ name, err });
    console.log(`FAIL  ${name}\n      ${err?.message ?? err}`);
  }
}

// ---- fixtures ----------------------------------------------------------
const U = {
  admin: 'admin1',
  teacher1: 'teacher1',
  teacher2: 'teacher2',
  cr: 'cr1',
  student1: 'student1',
  student2: 'student2',
};

const verified = (uid) => testEnv.authenticatedContext(uid, { email_verified: true });
const unverified = (uid) => testEnv.authenticatedContext(uid, { email_verified: false });

async function seed() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', U.admin), { name: 'Admin', email: 'a@x.pk', role: 'admin', isApproved: true });
    await setDoc(doc(db, 'users', U.teacher1), { name: 'T1', email: 't1@x.pk', role: 'teacher', isApproved: true });
    await setDoc(doc(db, 'users', U.teacher2), { name: 'T2', email: 't2@x.pk', role: 'teacher', isApproved: false });
    await setDoc(doc(db, 'users', U.cr), { name: 'CR', email: 'cr@x.pk', role: 'cr', isApproved: true });
    await setDoc(doc(db, 'users', U.student1), { name: 'S1', email: 's1@x.pk', role: 'student', isApproved: true });
    await setDoc(doc(db, 'users', U.student2), { name: 'S2', email: 's2@x.pk', role: 'student', isApproved: true });

    await setDoc(doc(db, 'subjects', 's1'), {
      name: 'SE', code: 'SE-401', teacherId: U.teacher1, teacherName: 'T1',
      status: 'active', enrolledStudents: [],
    });
    await setDoc(doc(db, 'assignments', 'a1'), { title: 'A1', teacherId: U.teacher1, subjectId: 's1' });
    await setDoc(doc(db, 'tests', 't1'), { title: 'T1', teacherId: U.teacher1, subjectId: 's1' });
    await setDoc(doc(db, 'tests', 't2'), { title: 'T2', teacherId: U.teacher2, subjectId: 's2' });
    await setDoc(doc(db, 'presentations', 'p1'), { title: 'P1', teacherId: U.teacher1 });
  });
}

// ---- suite -------------------------------------------------------------
async function main() {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-unitrack',
    firestore: { rules, host: '127.0.0.1', port: 8080 },
  });

  await seed();

  const anon = testEnv.unauthenticatedContext().firestore();
  const admin = verified(U.admin).firestore();
  const t1 = verified(U.teacher1).firestore();
  const t2 = verified(U.teacher2).firestore();
  const cr = verified(U.cr).firestore();
  const s1 = verified(U.student1).firestore();
  const s2 = verified(U.student2).firestore();

  // ---------- authentication gates ----------
  await check('anonymous cannot read subjects', () =>
    assertFails(getDocs(collection(anon, 'subjects'))));

  await check('unverified user cannot read subjects', () =>
    assertFails(getDocs(collection(unverified(U.student1).firestore(), 'subjects'))));

  await check('verified student can read subjects', () =>
    assertSucceeds(getDocs(collection(s1, 'subjects'))));

  // ---------- users ----------
  await check('student reads own profile', () =>
    assertSucceeds(getDoc(doc(s1, 'users', U.student1))));

  await check('student cannot read another user', () =>
    assertFails(getDoc(doc(s1, 'users', U.student2))));

  await check('teacher can read other users (roll numbers)', () =>
    assertSucceeds(getDoc(doc(t1, 'users', U.student1))));

  await check('signup: unverified user creates own student profile', async () => {
    const nb = unverified('newbie').firestore();
    await assertSucceeds(setDoc(doc(nb, 'users', 'newbie'), {
      name: 'New', email: 'n@x.pk', role: 'student', isApproved: true,
    }));
  });

  await check('signup: cannot self-assign admin role', async () => {
    const nb = unverified('newbie2').firestore();
    await assertFails(setDoc(doc(nb, 'users', 'newbie2'), {
      name: 'New', email: 'n2@x.pk', role: 'admin', isApproved: true,
    }));
  });

  await check('signup: teacher profile must start unapproved', async () => {
    const nb = unverified('newteacher').firestore();
    await assertFails(setDoc(doc(nb, 'users', 'newteacher'), {
      name: 'NT', email: 'nt@x.pk', role: 'teacher', isApproved: true,
    }));
    await assertSucceeds(setDoc(doc(nb, 'users', 'newteacher'), {
      name: 'NT', email: 'nt@x.pk', role: 'teacher', isApproved: false,
    }));
  });

  await check('signup: password field is rejected', async () => {
    const nb = unverified('newbie3').firestore();
    await assertFails(setDoc(doc(nb, 'users', 'newbie3'), {
      name: 'New', email: 'n3@x.pk', role: 'student', isApproved: true, password: 'x',
    }));
  });

  await check('student can edit own name/phone (non-privileged fields)', () =>
    assertSucceeds(updateDoc(doc(s1, 'users', U.student1), { name: 'S1b', phone: '0300' })));

  await check('student cannot self-promote role to admin', () =>
    assertFails(updateDoc(doc(s1, 'users', U.student1), { role: 'admin' })));

  await check('student cannot change own isApproved', () =>
    assertFails(updateDoc(doc(s1, 'users', U.student1), { isApproved: false })));

  await check('teacher cannot self-approve (isApproved lock)', () =>
    assertFails(updateDoc(doc(t2, 'users', U.teacher2), { isApproved: true })));

  await check('admin approves teacher via users update', () =>
    assertSucceeds(updateDoc(doc(admin, 'users', U.teacher2), { isApproved: true })));

  await check('student cannot delete users', () =>
    assertFails(deleteDoc(doc(s1, 'users', U.student2))));

  // ---------- teacher requests ----------
  await check('teacher request: create own pending (unverified ok)', async () => {
    const nb = unverified('newteacher').firestore();
    await assertSucceeds(setDoc(doc(nb, 'teacherRequests', 'newteacher'), {
      teacherId: 'newteacher', name: 'NT', email: 'nt@x.pk',
      status: 'pending', type: 'teacher',
    }));
  });

  await check('teacher request: cannot self-approve', () =>
    assertFails(updateDoc(doc(t2, 'teacherRequests', 'newteacher'), { status: 'approved' })));

  await check('teacher request: admin can approve', () =>
    assertSucceeds(updateDoc(doc(admin, 'teacherRequests', 'newteacher'), {
      status: 'approved', decidedAt: serverTimestamp(),
    })));

  // ---------- subjects ----------
  await check('teacher creates own subject', () =>
    assertSucceeds(setDoc(doc(t1, 'subjects', 's-new'), {
      name: 'New', code: 'X-1', teacherId: U.teacher1, teacherName: 'T1',
      status: 'active', enrolledStudents: [],
    })));

  await check('teacher cannot create subject owned by someone else', () =>
    assertFails(setDoc(doc(t2, 'subjects', 's-bad'), {
      name: 'Bad', code: 'X-2', teacherId: U.teacher1, teacherName: 'T1',
      status: 'active', enrolledStudents: [],
    })));

  await check('student cannot create subjects', () =>
    assertFails(setDoc(doc(s1, 'subjects', 's-hack'), { name: 'H', teacherId: U.student1 })));

  await check('student cannot edit subjects', () =>
    assertFails(updateDoc(doc(s1, 'subjects', 's1'), { enrolledStudents: [U.student1] })));

  await check('owner teacher can edit subject enrolledStudents', () =>
    assertSucceeds(updateDoc(doc(t1, 'subjects', 's1'), { enrolledStudents: arrayUnion(U.student1) })));

  await check('non-owner teacher cannot edit subject', () =>
    assertFails(updateDoc(doc(t2, 'subjects', 's1'), { enrolledStudents: [] })));

  // ---------- assignments / tests / presentations ----------
  await check('owner teacher creates assignment; student cannot', async () => {
    await assertSucceeds(setDoc(doc(t1, 'assignments', 'a-new'), { title: 'X', teacherId: U.teacher1 }));
    await assertFails(setDoc(doc(s1, 'assignments', 'a-hack'), { title: 'X', teacherId: U.student1 }));
  });

  await check('non-owner teacher cannot grade-update an assignment', () =>
    assertFails(updateDoc(doc(t2, 'assignments', 'a1'), { title: 'hijack' })));

  await check('students can read tests (advisory scoring model)', () =>
    assertSucceeds(getDoc(doc(s1, 'tests', 't1'))));

  await check('student cannot create presentations', () =>
    assertFails(setDoc(doc(s1, 'presentations', 'p-hack'), { title: 'X', teacherId: U.student1 })));

  // ---------- submissions ----------
  await check('student creates own assignment submission', () =>
    assertSucceeds(setDoc(doc(s1, 'submissions', `assignment_a1_${U.student1}`), {
      studentId: U.student1, studentName: 'S1', subjectId: 's1', assignmentId: 'a1',
      fileUrl: 'https://x/f.pdf', fileName: 'f.pdf', submittedAt: serverTimestamp(),
    })));

  await check('student cannot submit as someone else', () =>
    assertFails(setDoc(doc(s1, 'submissions', `assignment_a1_${U.student2}`), {
      studentId: U.student2, assignmentId: 'a1', submittedAt: serverTimestamp(),
    })));

  await check('student cannot re-submit (create on existing id fails)', () =>
    assertFails(setDoc(doc(s1, 'submissions', `assignment_a1_${U.student1}`), {
      studentId: U.student1, assignmentId: 'a1', submittedAt: serverTimestamp(),
    })));

  await check('student cannot edit own submission marks', () =>
    assertFails(updateDoc(doc(s1, 'submissions', `assignment_a1_${U.student1}`), { marks: 999 })));

  await check('non-owner teacher cannot grade submission', () =>
    assertFails(updateDoc(doc(t2, 'submissions', `assignment_a1_${U.student1}`), { marks: 5 })));

  await check('owner teacher grades submission', () =>
    assertSucceeds(updateDoc(doc(t1, 'submissions', `assignment_a1_${U.student1}`), {
      marks: 18, feedback: 'Good', gradedAt: serverTimestamp(),
    })));

  await check('owner teacher grades: cannot tamper frozen fields', () =>
    assertFails(updateDoc(doc(t1, 'submissions', `assignment_a1_${U.student1}`), {
      marks: 20, studentId: U.student2,
    })));

  await check('student test submission + owner-only query', async () => {
    await assertSucceeds(setDoc(doc(s1, 'submissions', `test_t1_${U.student1}`), {
      studentId: U.student1, studentName: 'S1', testId: 't1', answers: [0, 1],
      submittedAt: serverTimestamp(), marks: null, feedback: null,
    }));
    await assertSucceeds(getDocs(query(collection(t1, 'submissions'), where('testId', '==', 't1'))));
    await assertFails(getDocs(query(collection(t2, 'submissions'), where('testId', '==', 't1'))));
  });

  await check('student reads only own submissions', () =>
    assertSucceeds(getDoc(doc(s1, 'submissions', `assignment_a1_${U.student1}`))));

  await check('other student cannot read it', () =>
    assertFails(getDoc(doc(s2, 'submissions', `assignment_a1_${U.student1}`))));

  // ---------- enrollment request + approval batch ----------
  await check('student creates own enrollment request', () =>
    assertSucceeds(setDoc(doc(s1, 'enrollmentRequests', `${U.student1}_s1`), {
      studentId: U.student1, studentName: 'S1', subjectId: 's1', teacherId: U.teacher1,
      status: 'pending', type: 'student', requestedAt: serverTimestamp(), decidedAt: null,
    })));

  await check('student cannot request enrollment for someone else', () =>
    assertFails(setDoc(doc(s1, 'enrollmentRequests', `${U.student2}_s1`), {
      studentId: U.student2, studentName: 'S2', subjectId: 's1', teacherId: U.teacher1,
      status: 'pending', type: 'student',
    })));

  await check('unrelated teacher cannot read the request', () =>
    assertFails(getDoc(doc(t2, 'enrollmentRequests', `${U.student1}_s1`))));

  await check('student lists only own requests (constrained query)', () =>
    assertSucceeds(getDocs(query(collection(s1, 'enrollmentRequests'), where('studentId', '==', U.student1)))));

  await check('teacher lists requests addressed to them (constrained query)', () =>
    assertSucceeds(getDocs(query(collection(t1, 'enrollmentRequests'), where('teacherId', '==', U.teacher1)))));

  await check('unconstrained enrollmentRequests list is denied (rules are not filters)', () =>
    assertFails(getDocs(collection(t1, 'enrollmentRequests'))));

  await check('subject teacher approves request — atomic batch', async () => {
    const batch = writeBatch(t1);
    batch.update(doc(t1, 'enrollmentRequests', `${U.student1}_s1`), {
      status: 'approved', decidedAt: serverTimestamp(),
    });
    batch.set(doc(t1, 'enrollments', `${U.student1}_s1`), {
      studentId: U.student1, studentName: 'S1', subjectId: 's1', teacherId: U.teacher1,
      enrolledAt: serverTimestamp(),
    });
    batch.update(doc(t1, 'subjects', 's1'), { enrolledStudents: arrayUnion(U.student1) });
    await assertSucceeds(batch.commit());
  });

  await check('student cannot self-approve a request', () =>
    assertFails(updateDoc(doc(s1, 'enrollmentRequests', `${U.student1}_s1`), { status: 'approved' })));

  await check('student can drop own enrollment (delete)', () =>
    assertSucceeds(deleteDoc(doc(s1, 'enrollments', `${U.student1}_s1`))));

  // ---------- student self-removal from subjects.enrolledStudents ----------
  // At this point subjects/s1.enrolledStudents == [student1] (approval batch).
  await check('student removes only self from enrolledStudents', () =>
    assertSucceeds(updateDoc(doc(s1, 'subjects', 's1'), { enrolledStudents: arrayRemove(U.student1) })));

  await check('student cannot remove another student from enrolledStudents', async () => {
    await assertSucceeds(updateDoc(doc(t1, 'subjects', 's1'), { enrolledStudents: arrayUnion(U.student2) }));
    // student1 tries to evict student2 -> new [] != old.removeAll([student1]) == [student2]
    await assertFails(updateDoc(doc(s1, 'subjects', 's1'), { enrolledStudents: arrayRemove(U.student2) }));
  });

  await check('student drop cannot bundle other field changes', () =>
    assertFails(updateDoc(doc(s1, 'subjects', 's1'), { name: 'hacked', enrolledStudents: arrayRemove(U.student1) })));

  // ---------- notifications ----------
  await check('teacher notifies a student', () =>
    assertSucceeds(setDoc(doc(t1, 'notifications', 'n1'), {
      userId: U.student1, title: 'Hi', body: 'New assignment', type: 'assignment', read: false,
    })));

  await check('student cannot notify another user', () =>
    assertFails(setDoc(doc(s1, 'notifications', 'n-hack'), {
      userId: U.student2, title: 'spam', body: 'spam', read: false,
    })));

  await check('student marks own notification read', () =>
    assertSucceeds(updateDoc(doc(s1, 'notifications', 'n1'), { read: true })));

  await check('other user cannot read/mark the notification', () =>
    assertFails(getDoc(doc(s2, 'notifications', 'n1'))));

  // ---------- announcements ----------
  await check('CR posts announcement; student cannot', async () => {
    await assertSucceeds(setDoc(doc(cr, 'announcements', 'ann1'), {
      crId: U.cr, crName: 'CR', title: 'Hi', body: 'Class',
    }));
    await assertFails(setDoc(doc(s1, 'announcements', 'ann-hack'), {
      crId: U.student1, crName: 'S', title: 'x', body: 'x',
    }));
  });

  // ---------- presentation marks ----------
  await check('owner teacher grades presentation; student cannot', async () => {
    await assertSucceeds(setDoc(doc(t1, 'presentationMarks', `p1_${U.student1}`), {
      presentationId: 'p1', studentId: U.student1, marks: 15, totalMarks: 20,
    }));
    await assertFails(setDoc(doc(s1, 'presentationMarks', 'pm-hack'), {
      presentationId: 'p1', studentId: U.student1, marks: 20, totalMarks: 20,
    }));
  });

  await check('student reads own presentation mark only', async () => {
    await assertSucceeds(getDoc(doc(s1, 'presentationMarks', `p1_${U.student1}`)));
    await assertFails(getDoc(doc(s2, 'presentationMarks', `p1_${U.student1}`)));
  });

  // ---------- admin ----------
  await check('admin can list users collection (admin screens)', () =>
    assertSucceeds(getDocs(collection(admin, 'users'))));

  await check('teacher can list users collection (grading screens)', () =>
    assertSucceeds(getDocs(collection(t1, 'users'))));

  await check('student cannot list users collection', () =>
    assertFails(getDocs(collection(s1, 'users'))));

  await check('admin can list pending teacher requests', () =>
    assertSucceeds(getDocs(query(collection(admin, 'teacherRequests'), where('status', '==', 'pending')))));

  await check('admin can delete a submission', () =>
    assertSucceeds(deleteDoc(doc(admin, 'submissions', `test_t1_${U.student1}`))));

  await check('admin can delete users', () =>
    // NOTE: 'newbie' was created for real in the signup test above.
    assertSucceeds(deleteDoc(doc(admin, 'users', 'newbie'))));

  await testEnv.cleanup();

  console.log('\n----------------------------------------');
  console.log(`Rules tests: ${passed} passed, ${failures.length} failed.`);
  if (failures.length) {
    console.log('Failed cases:');
    for (const f of failures) console.log(`  - ${f.name}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test run crashed:', err);
  process.exit(1);
});
