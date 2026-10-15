import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  type FirestoreError,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { enrollmentId } from '@/src/services/enrollments';

export type EnrollmentRequestStatus = 'pending' | 'approved' | 'rejected';

export interface EnrollmentRequest {
  id: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  teacherId: string;
  status: EnrollmentRequestStatus;
  type?: 'student' | 'cr';
  requestedAt: Date | null;
  decidedAt: Date | null;
}

const COLLECTION = 'enrollmentRequests';

// Deterministic ID prevents duplicate requests per (student, subject)
function enrollmentRequestId(studentId: string, subjectId: string) {
  return `${studentId}_${subjectId}`;
}

export async function createEnrollmentRequest(params: {
  studentId: string;
  studentName: string;
  subjectId: string;
  teacherId: string;
  type?: 'student' | 'cr';
}) {
  const { studentId, studentName, subjectId, teacherId, type = 'student' } = params;
  const id = enrollmentRequestId(studentId, subjectId);
  const ref = doc(db, COLLECTION, id);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    const data = existing.data() as { status?: EnrollmentRequestStatus };
    if (data.status === 'pending') {
      throw new Error('You already have a pending request for this subject.');
    }
  }

  await setDoc(ref, {
    studentId,
    studentName,
    subjectId,
    teacherId,
    type,
    status: 'pending' as EnrollmentRequestStatus,
    requestedAt: serverTimestamp(),
    decidedAt: null,
  });
}

export async function getPendingRequestsForTeacher(teacherId: string) {
  const q = query(
    collection(db, COLLECTION),
    where('teacherId', '==', teacherId),
    where('status', '==', 'pending'),
  );
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      studentId: data.studentId,
      studentName: data.studentName,
      subjectId: data.subjectId,
      teacherId: data.teacherId,
      status: data.status as EnrollmentRequestStatus,
      requestedAt: data.requestedAt?.toDate?.() ?? null,
      decidedAt: data.decidedAt?.toDate?.() ?? null,
    } as EnrollmentRequest;
  });
}

/**
 * Subscribe to all enrollment requests with status == "pending" (admin view).
 * Uses onSnapshot for real-time updates. Returns an unsubscribe function.
 */
export function subscribeToPendingEnrollmentRequests(
  onData: (requests: EnrollmentRequest[]) => void,
  onError?: (error: FirestoreError) => void,
) {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'pending'),
  );

  return onSnapshot(
    q,
    (snap) => {
      const requests: EnrollmentRequest[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          studentId: data.studentId,
          studentName: data.studentName,
          subjectId: data.subjectId,
          teacherId: data.teacherId,
          status: data.status as EnrollmentRequestStatus,
          requestedAt: data.requestedAt?.toDate?.() ?? null,
          decidedAt: data.decidedAt?.toDate?.() ?? null,
        };
      });
      onData(requests);
    },
    (err) => {
      if (onError) onError(err);
      else console.error('subscribeToPendingEnrollmentRequests error', err);
    },
  );
}

export async function approveEnrollmentRequest(requestId: string) {
  const ref = doc(db, COLLECTION, requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Enrollment request not found.');
  }

  const data = snap.data() as any;
  if (data.status !== 'pending') {
    throw new Error('This request has already been processed.');
  }

  const studentId = data.studentId as string;
  const studentName = data.studentName as string;
  const subjectId = data.subjectId as string;
  const teacherId = data.teacherId as string;

  // Prevent duplicates using deterministic enrollments/{studentId_subjectId}
  const enrollmentRef = doc(db, 'enrollments', enrollmentId(studentId, subjectId));
  const existingEnrollment = await getDoc(enrollmentRef);

  const batch = writeBatch(db);

  // Step 1: approve request
  batch.update(ref, {
    status: 'approved' as EnrollmentRequestStatus,
    decidedAt: serverTimestamp(),
  });

  // Step 2: create enrollment if missing
  if (!existingEnrollment.exists()) {
    batch.set(enrollmentRef, {
      studentId,
      studentName,
      subjectId,
      teacherId,
      enrolledAt: serverTimestamp(),
    });
  }

  // Compatibility: also persist membership to subject doc for existing UI logic
  const subjectRef = doc(db, 'subjects', subjectId);
  batch.update(subjectRef, {
    enrolledStudents: arrayUnion(studentId),
  });

  await batch.commit();
}

export async function rejectEnrollmentRequest(requestId: string) {
  const ref = doc(db, COLLECTION, requestId);
  await updateDoc(ref, {
    status: 'rejected' as EnrollmentRequestStatus,
    decidedAt: serverTimestamp(),
  });
}
