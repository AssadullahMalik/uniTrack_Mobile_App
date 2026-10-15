import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  type FirestoreError,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export interface TestSubmission {
  id: string;
  testId: string;
  studentId: string;
  studentName: string;
  rollNumber?: string | null;
  answers: any;
  submittedAt: Date;
  marks?: number | null;
  feedback?: string | null;
}

const COLLECTION = 'submissions';

export function subscribeTestSubmissionsForTest(
  testId: string,
  onData: (subs: TestSubmission[]) => void,
  onError?: (err: FirestoreError) => void,
) {
  const q = query(collection(db, COLLECTION), where('testId', '==', testId));

  return onSnapshot(
    q,
    snap => {
      const subs: TestSubmission[] = snap.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          testId: data.testId,
          studentId: data.studentId,
          studentName: data.studentName,
          rollNumber: data.rollNumber ?? null,
          answers: data.answers,
          submittedAt: data.submittedAt?.toDate?.() ?? new Date(),
          marks: data.marks ?? null,
          feedback: data.feedback ?? null,
        };
      });
      onData(subs);
    },
    err => {
      if (onError) onError(err);
      else console.error('subscribeTestSubmissionsForTest error', err);
    },
  );
}

export async function gradeTestSubmission(
  submissionId: string,
  marks: number,
  feedback?: string,
) {
  await updateDoc(doc(db, COLLECTION, submissionId), {
    marks,
    feedback: feedback ?? null,
  });
}
