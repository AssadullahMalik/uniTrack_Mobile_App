import {
  collection,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { db, storage } from '@/firebaseConfig';

interface UploadAssignmentParams {
  studentId: string;
  studentName: string;
  subjectId: string;
  assignmentId: string;
  fileUri: string;
  fileName: string;
  mimeType: string | null;
}

// Handles uploading an assignment file to Firebase Storage
// and saving its metadata in the "submissions" collection.
export async function uploadAssignmentFile(params: UploadAssignmentParams) {
  const {
    studentId,
    studentName,
    subjectId,
    assignmentId,
    fileUri,
    fileName,
    mimeType,
  } = params;

  // Prevent duplicate submissions for the same assignment + student
  const existingQ = query(
    collection(db, 'submissions'),
    where('assignmentId', '==', assignmentId),
    where('studentId', '==', studentId),
  );
  const existingSnap = await getDocs(existingQ);
  if (!existingSnap.empty) {
    throw new Error('You have already submitted this assignment.');
  }

  // Fetch the local/Drive file as a blob
  const response = await fetch(fileUri);
  const blob = await response.blob();

  // Enforce 10MB max file size
  if (blob.size > 10 * 1024 * 1024) {
    throw new Error('File size must be below 10MB.');
  }

  const storageRef = ref(
    storage,
    `assignments/${subjectId}/${assignmentId}/${studentId}-${Date.now()}-${fileName}`,
  );

  await uploadBytesResumable(
    storageRef,
    blob,
    mimeType ? { contentType: mimeType } : undefined,
  );

  const fileUrl = await getDownloadURL(storageRef);

  // Deterministic id: one submission per (assignment, student). Combined with the
  // security rules this makes a second submission an update, which students may
  // not perform — resubmission is rejected server-side even if the pre-check races.
  await setDoc(doc(db, 'submissions', `assignment_${assignmentId}_${studentId}`), {
    studentId,
    studentName,
    subjectId,
    assignmentId,
    fileUrl,
    fileName,
    submittedAt: serverTimestamp(),
  });

  return fileUrl;
}
