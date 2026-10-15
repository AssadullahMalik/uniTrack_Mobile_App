import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  serverTimestamp,
  type FirestoreError,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export type TeacherRequestStatus = 'pending' | 'approved' | 'rejected';

export interface TeacherRequest {
  id: string;
  teacherId: string;
  name: string;
  email: string;
  status: TeacherRequestStatus;
  type: 'teacher';
  requestedAt: Date | null;
  decidedAt: Date | null;
}

const COLLECTION = 'teacherRequests';

/**
 * Create or update a teacher registration request for a given teacherId.
 * Uses teacherId as the document id to prevent duplicates.
 */
export async function createTeacherRequest(params: {
  teacherId: string;
  name: string;
  email: string;
}) {
  const { teacherId, name, email } = params;
  const ref = doc(db, COLLECTION, teacherId);
  const snap = await getDoc(ref);

  // If a request already exists and is still pending, do nothing
  if (snap.exists()) {
    const data = snap.data() as { status?: TeacherRequestStatus };
    if (data.status === 'pending') {
      return;
    }
  }

  await setDoc(ref, {
    teacherId,
    name,
    email,
    status: 'pending' as TeacherRequestStatus,
    type: 'teacher' as const,
    requestedAt: serverTimestamp(),
    decidedAt: null,
  });
}

/**
 * Subscribe to all teacher registration requests with status == "pending" (admin view).
 */
export function subscribeToPendingTeacherRequests(
  onData: (requests: TeacherRequest[]) => void,
  onError?: (error: FirestoreError) => void,
) {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'pending'),
  );

  return onSnapshot(
    q,
    (snap) => {
      const requests: TeacherRequest[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          teacherId: data.teacherId,
          name: data.name,
          email: data.email,
          status: data.status as TeacherRequestStatus,
          type: 'teacher',
          requestedAt: data.requestedAt?.toDate?.() ?? null,
          decidedAt: data.decidedAt?.toDate?.() ?? null,
        };
      });
      onData(requests);
    },
    (err) => {
      if (onError) onError(err);
      else console.error('subscribeToPendingTeacherRequests error', err);
    },
  );
}

/**
 * Admin approves teacher registration:
 * - sets teacherRequests/{id}.status = 'approved', decidedAt
 * - sets users/{teacherId}.isApproved = true
 */
export async function approveTeacherRequest(requestId: string) {
  const reqRef = doc(db, COLLECTION, requestId);
  const snap = await getDoc(reqRef);
  if (!snap.exists()) throw new Error('Teacher request not found.');

  const data = snap.data() as { status?: TeacherRequestStatus; teacherId?: string };
  if (data.status !== 'pending') {
    throw new Error('This request has already been processed.');
  }
  if (!data.teacherId) throw new Error('Invalid teacher request: missing teacherId.');

  await updateDoc(reqRef, {
    status: 'approved' as TeacherRequestStatus,
    decidedAt: serverTimestamp(),
  });

  // Mark corresponding user as approved
  await updateDoc(doc(db, 'users', data.teacherId), {
    isApproved: true,
  });
}

/**
 * Admin rejects teacher registration:
 * - sets teacherRequests/{id}.status = 'rejected', decidedAt
 * (user document remains unapproved)
 */
export async function rejectTeacherRequest(requestId: string) {
  const reqRef = doc(db, COLLECTION, requestId);
  const snap = await getDoc(reqRef);
  if (!snap.exists()) throw new Error('Teacher request not found.');

  const data = snap.data() as { status?: TeacherRequestStatus };
  if (data.status !== 'pending') {
    throw new Error('This request has already been processed.');
  }

  await updateDoc(reqRef, {
    status: 'rejected' as TeacherRequestStatus,
    decidedAt: serverTimestamp(),
  });
}
