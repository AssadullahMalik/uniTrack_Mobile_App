import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type FirestoreError,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  teacherId: string;
  enrolledAt: Date | null;
}

const COLLECTION = 'enrollments';

export function enrollmentId(studentId: string, subjectId: string) {
  return `${studentId}_${subjectId}`;
}

export async function enrollmentExists(studentId: string, subjectId: string) {
  const ref = doc(db, COLLECTION, enrollmentId(studentId, subjectId));
  const snap = await getDoc(ref);
  return snap.exists();
}

export function subscribeEnrollmentsForStudent(
  studentId: string,
  onData: (enrollments: Enrollment[]) => void,
  onError?: (err: FirestoreError) => void,
) {
  const q = query(collection(db, COLLECTION), where('studentId', '==', studentId));
  return onSnapshot(
    q,
    snap => {
      const rows: Enrollment[] = snap.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          studentId: data.studentId,
          studentName: data.studentName,
          subjectId: data.subjectId,
          teacherId: data.teacherId,
          enrolledAt: data.enrolledAt?.toDate?.() ?? null,
        };
      });
      onData(rows);
    },
    err => {
      if (onError) onError(err);
      else console.error('subscribeEnrollmentsForStudent error', err);
    },
  );
}

export function subscribeEnrollmentsForTeacher(
  teacherId: string,
  onData: (enrollments: Enrollment[]) => void,
  onError?: (err: FirestoreError) => void,
) {
  const q = query(collection(db, COLLECTION), where('teacherId', '==', teacherId));
  return onSnapshot(
    q,
    snap => {
      const rows: Enrollment[] = snap.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          studentId: data.studentId,
          studentName: data.studentName,
          subjectId: data.subjectId,
          teacherId: data.teacherId,
          enrolledAt: data.enrolledAt?.toDate?.() ?? null,
        };
      });
      onData(rows);
    },
    err => {
      if (onError) onError(err);
      else console.error('subscribeEnrollmentsForTeacher error', err);
    },
  );
}

/**
 * Create an enrollment (deterministic id) if missing.
 * Uses a batch so caller can also update related docs atomically if desired.
 */
export async function createEnrollmentAtomic(params: {
  studentId: string;
  studentName: string;
  subjectId: string;
  teacherId: string;
}) {
  const { studentId, studentName, subjectId, teacherId } = params;
  const id = enrollmentId(studentId, subjectId);
  const ref = doc(db, COLLECTION, id);
  const existing = await getDoc(ref);
  if (existing.exists()) return { created: false as const, id };

  const batch = writeBatch(db);
  batch.set(ref, {
    studentId,
    studentName,
    subjectId,
    teacherId,
    enrolledAt: serverTimestamp(),
  });
  await batch.commit();
  return { created: true as const, id };
}
