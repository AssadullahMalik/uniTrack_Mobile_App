import { doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, collection, onSnapshot, query, where, serverTimestamp, arrayRemove, arrayUnion, writeBatch, type Query } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/firebaseConfig";
import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'student' | 'teacher' | 'cr' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  rollNumber?: string;
  semester?: string;
  phone?: string;
  bio?: string;
  photoURL?: string;
  isApproved?: boolean;
  createdAt: string;
}


export interface Subject {
  id: string;
  name: string;
  code: string;
  department: string;
  semester: string;
  teacherId: string;
  teacherName: string;
  status?: 'active' | 'inactive';
  courseOutlineUrl?: string;
  creditHours: number;
  enrolledStudents: string[];
  createdAt: string;
}

export interface Assignment {
  id: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  title: string;
  description: string;
  deadline: string;
  totalMarks: number;
  createdAt: string;
}

export interface Submission {
  id: string;
  /** Set for assignment file submissions. */
  assignmentId?: string;
  /** Set for test submissions (mirrored into submissions/ with a deterministic id). */
  testId?: string;
  studentId: string;
  studentName: string;
  subjectId?: string;
  rollNumber?: string;
  content?: string;
  fileName?: string;
  fileUrl?: string;
  answers?: number[];
  score?: number;
  totalMarks?: number;
  submittedAt: string;
  /** Manual, teacher-owned grade; absent until graded. */
  marks?: number;
  feedback?: string;
  gradedAt?: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface Test {
  id: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  title: string;
  duration: number;
  totalMarks: number;
  questions: Question[];
  scheduledAt: string;
  createdAt: string;
}

export interface TestResult {
  id: string;
  testId: string;
  studentId: string;
  answers: number[];
  score: number;
  totalMarks: number;
  submittedAt: string;
}

export interface Presentation {
  id: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  title: string;
  scheduledAt: string;
  duration: number;
  venue: string;
  createdAt: string;
}

export interface PresentationMark {
  id: string;
  presentationId: string;
  studentId: string;
  marks: number;
  totalMarks: number;
  feedback?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'assignment' | 'test' | 'presentation' | 'marks' | 'announcement' | 'general';
  read: boolean;
  createdAt: string;
}

export interface Announcement {
  id: string;
  crId: string;
  crName: string;
  subjectId?: string;
  title: string;
  body: string;
  createdAt: string;
}

interface AppContextValue {
  currentUser: User | null;
  users: User[];
  subjects: Subject[];
  assignments: Assignment[];
  submissions: Submission[];
  tests: Test[];
  testResults: TestResult[];
  presentations: Presentation[];
  presentationMarks: PresentationMark[];
  notifications: Notification[];
  announcements: Announcement[];
  isLoading: boolean;

  /** Fetch user profile from Firestore by Firebase Auth uid. Call after signInWithEmailVerification. */
  getProfileByUid: (uid: string) => Promise<User | null>;
  /** Create Firestore profile only (no password). Call after createUserWithEmailAndPassword; pass uid. */
  registerProfile: (profile: Omit<User, 'id' | 'createdAt' | 'password'>, uid: string) => Promise<void>;
  logout: () => Promise<void>;

  addSubject: (subject: Omit<Subject, 'id' | 'createdAt'>) => Promise<void>;
  enrollInSubject: (subjectId: string, studentId: string) => Promise<void>;
  unenrollFromSubject: (subjectId: string, studentId: string) => Promise<void>;

  addAssignment: (assignment: Omit<Assignment, 'id' | 'createdAt'>) => Promise<void>;
  submitAssignment: (submission: Omit<Submission, 'id' | 'submittedAt'>) => Promise<void>;
  gradeSubmission: (submissionId: string, marks: number, feedback: string) => Promise<void>;

  addTest: (test: Omit<Test, 'id' | 'createdAt'>) => Promise<void>;
  submitTest: (result: Omit<TestResult, 'id' | 'submittedAt'>) => Promise<void>;

  addPresentation: (presentation: Omit<Presentation, 'id' | 'createdAt'>) => Promise<void>;
  addPresentationMark: (mark: Omit<PresentationMark, 'id'>) => Promise<void>;

  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'createdAt'>) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => Promise<void>;

  approveUser: (userId: string) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;

  getStudentMarks: (studentId: string, subjectId: string) => {
    assignmentTotal: number;
    assignmentObtained: number;
    testTotal: number;
    testObtained: number;
    presentationTotal: number;
    presentationObtained: number;
    total: number;
    obtained: number;
  };
  getUnreadCount: (userId: string) => number;
}
const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEYS = {
  USERS: 'ut_users',
  CURRENT_USER: 'ut_current_user',
  SUBJECTS: 'ut_subjects',
  ASSIGNMENTS: 'ut_assignments',
  SUBMISSIONS: 'ut_submissions',
  TESTS: 'ut_tests',
  TEST_RESULTS: 'ut_test_results',
  PRESENTATIONS: 'ut_presentations',
  PRESENTATION_MARKS: 'ut_presentation_marks',
  NOTIFICATIONS: 'ut_notifications',
  ANNOUNCEMENTS: 'ut_announcements',
};

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

/** Convert a Firestore Timestamp | ISO string | null into an ISO string. */
function toIsoString(value: unknown): string {
  if (typeof value === 'string' && value.length > 0) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      /* fall through */
    }
  }
  return new Date().toISOString();
}

/** Parse a users/{id} document; strips any legacy password field defensively. */
function parseUserDoc(id: string, data: Record<string, unknown>): User {
  const { password: _p, ...rest } = data;
  return { ...rest, id, createdAt: toIsoString(data.createdAt) } as User;
}

/** Parse a submissions/{id} document (assignment file or test submission). */
function parseSubmissionDoc(id: string, data: Record<string, unknown>): Submission {
  return {
    id,
    assignmentId: (data.assignmentId as string) || undefined,
    testId: (data.testId as string) || undefined,
    studentId: (data.studentId as string) ?? '',
    studentName: (data.studentName as string) ?? '',
    subjectId: (data.subjectId as string) || undefined,
    rollNumber: (data.rollNumber as string) || undefined,
    content: (data.content as string) ?? '',
    fileName: (data.fileName as string) || undefined,
    fileUrl: (data.fileUrl as string) || undefined,
    answers: Array.isArray(data.answers) ? (data.answers as number[]) : undefined,
    score: typeof data.score === 'number' ? data.score : undefined,
    totalMarks: typeof data.totalMarks === 'number' ? data.totalMarks : undefined,
    submittedAt: toIsoString(data.submittedAt),
    marks: typeof data.marks === 'number' ? data.marks : undefined,
    feedback: typeof data.feedback === 'string' ? data.feedback : undefined,
    gradedAt: data.gradedAt ? toIsoString(data.gradedAt) : undefined,
  };
}

/** Parse a presentationMarks/{id} document. */
function parsePresentationMarkDoc(id: string, data: Record<string, unknown>): PresentationMark {
  return {
    id,
    presentationId: (data.presentationId as string) ?? '',
    studentId: (data.studentId as string) ?? '',
    marks: typeof data.marks === 'number' ? data.marks : 0,
    totalMarks: typeof data.totalMarks === 'number' ? data.totalMarks : 0,
    feedback: (data.feedback as string) || undefined,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [presentationMarks, setPresentationMarks] = useState<PresentationMark[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentUserRef = useRef<User | null>(null);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Submissions and presentation marks arrive through several role-scoped
  // Firestore queries; each query owns a "source" entry so removals stay consistent.
  const submissionSourcesRef = useRef(new Map<string, Submission[]>());
  const presentationMarkSourcesRef = useRef(new Map<string, PresentationMark[]>());
  const teacherScopedSubsRef = useRef(new Map<string, () => void>());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const entries = await AsyncStorage.multiGet(Object.values(STORAGE_KEYS));
      const cache = new Map(entries);
      const readJson = <T,>(key: string, fallback: T): T => {
        const raw = cache.get(key);
        if (!raw) return fallback;
        try {
          return JSON.parse(raw) as T;
        } catch {
          return fallback;
        }
      };
      setUsers(readJson<User[]>(STORAGE_KEYS.USERS, []));
      setSubjects(readJson<Subject[]>(STORAGE_KEYS.SUBJECTS, []));
      setAssignments(readJson<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, []));
      setSubmissions(readJson<Submission[]>(STORAGE_KEYS.SUBMISSIONS, []));
      setTests(readJson<Test[]>(STORAGE_KEYS.TESTS, []));
      setPresentations(readJson<Presentation[]>(STORAGE_KEYS.PRESENTATIONS, []));
      setPresentationMarks(readJson<PresentationMark[]>(STORAGE_KEYS.PRESENTATION_MARKS, []));
      setNotifications(readJson<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []));
      setAnnouncements(readJson<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, []));
      setCurrentUser(readJson<User | null>(STORAGE_KEYS.CURRENT_USER, null));
    } catch (e) {
      console.error('Failed to hydrate cached data', e);
    } finally {
      setIsLoading(false);
    }
  }

  // Keep the app session in sync with Firebase Auth (persisted across restarts).
  // Read-only: profile creation is owned by the register/login flows.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async fbUser => {
      if (!fbUser) {
        setCurrentUser(null);
        AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER).catch(() => {});
        return;
      }
      if (currentUserRef.current?.id === fbUser.uid) return;
      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid));
        if (snap.exists()) {
          const user = parseUserDoc(snap.id, snap.data() as Record<string, unknown>);
          setCurrentUser(user);
          await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        }
      } catch (e) {
        console.warn('[auth] profile bootstrap read failed', e);
      }
    });
    return () => unsub();
  }, []);

  // Live Firestore subscriptions, shaped to match firestore.rules:
  //   - collections every verified user can list: subjects(active)/assignments/tests/presentations/announcements
  //   - users: teachers/admins list all; students/CRs may read only their own profile
  //   - notifications: own inbox only
  //   - submissions/presentationMarks: students list their own; teachers per owned item
  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.id;
    const role = currentUser.role;
    const unsubs: Array<() => void> = [];

    unsubs.push(onSnapshot(
      query(collection(db, 'subjects'), where('status', '==', 'active')),
      snap => {
        const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Subject[];
        setSubjects(rows);
        persist(STORAGE_KEYS.SUBJECTS, rows).catch(() => {});
      },
      err => console.error('[subjects] snapshot error', err),
    ));

    unsubs.push(onSnapshot(
      collection(db, 'assignments'),
      snap => {
        const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Assignment[];
        setAssignments(rows);
        persist(STORAGE_KEYS.ASSIGNMENTS, rows).catch(() => {});
      },
      err => console.error('[assignments] snapshot error', err),
    ));

    unsubs.push(onSnapshot(
      collection(db, 'tests'),
      snap => {
        const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Test[];
        setTests(rows);
        persist(STORAGE_KEYS.TESTS, rows).catch(() => {});
      },
      err => console.error('[tests] snapshot error', err),
    ));

    unsubs.push(onSnapshot(
      collection(db, 'presentations'),
      snap => {
        const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Presentation[];
        setPresentations(rows);
        persist(STORAGE_KEYS.PRESENTATIONS, rows).catch(() => {});
      },
      err => console.error('[presentations] snapshot error', err),
    ));

    unsubs.push(onSnapshot(
      collection(db, 'announcements'),
      snap => {
        const rows = snap.docs.map(d => {
          const data = d.data() as Record<string, unknown>;
          return { id: d.id, ...data, createdAt: toIsoString(data.createdAt) } as Announcement;
        });
        setAnnouncements(rows);
        persist(STORAGE_KEYS.ANNOUNCEMENTS, rows).catch(() => {});
      },
      err => console.error('[announcements] snapshot error', err),
    ));

    unsubs.push(onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', uid)),
      snap => {
        const rows = snap.docs.map(d => {
          const data = d.data() as Record<string, unknown>;
          return { id: d.id, ...data, createdAt: toIsoString(data.createdAt) } as Notification;
        });
        rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(rows);
        persist(STORAGE_KEYS.NOTIFICATIONS, rows).catch(() => {});
      },
      err => console.error('[notifications] snapshot error', err),
    ));

    if (role === 'teacher' || role === 'admin') {
      unsubs.push(onSnapshot(
        collection(db, 'users'),
        snap => {
          const rows = snap.docs.map(d => parseUserDoc(d.id, d.data() as Record<string, unknown>));
          setUsers(rows);
          persist(STORAGE_KEYS.USERS, rows).catch(() => {});
        },
        err => console.error('[users] snapshot error', err),
      ));
    } else {
      unsubs.push(onSnapshot(
        doc(db, 'users', uid),
        snap => {
          if (!snap.exists()) return;
          const user = parseUserDoc(snap.id, snap.data() as Record<string, unknown>);
          setUsers([user]);
          if (currentUserRef.current?.id === user.id) {
            setCurrentUser(user);
            AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user)).catch(() => {});
          }
        },
        err => console.error('[users] snapshot error', err),
      ));
    }

    if (role === 'student' || role === 'cr') {
      unsubs.push(subscribeSubmissionSource(
        `self:${uid}`,
        query(collection(db, 'submissions'), where('studentId', '==', uid)),
      ));
      unsubs.push(subscribePresentationMarkSource(
        `self:${uid}`,
        query(collection(db, 'presentationMarks'), where('studentId', '==', uid)),
      ));
    }

    return () => {
      unsubs.forEach(u => u());
      teacherScopedSubsRef.current.forEach(u => u());
      teacherScopedSubsRef.current.clear();
      submissionSourcesRef.current.clear();
      presentationMarkSourcesRef.current.clear();
    };
  }, [currentUser?.id, currentUser?.role]);

  // Identifiers of the items owned by the signed-in teacher. Teachers can list
  // submissions/marks only for the assignments/tests/presentations they own.
  const teacherOwnedIds = useMemo(() => {
    if (currentUser?.role !== 'teacher') {
      return { assignmentIds: [] as string[], testIds: [] as string[], presentationIds: [] as string[] };
    }
    const uid = currentUser.id;
    return {
      assignmentIds: assignments.filter(a => a.teacherId === uid).map(a => a.id),
      testIds: tests.filter(t => t.teacherId === uid).map(t => t.id),
      presentationIds: presentations.filter(p => p.teacherId === uid).map(p => p.id),
    };
  }, [currentUser?.id, currentUser?.role, assignments, tests, presentations]);

  const teacherOwnedKey = `${teacherOwnedIds.assignmentIds.join(',')}|${teacherOwnedIds.testIds.join(',')}|${teacherOwnedIds.presentationIds.join(',')}`;

  useEffect(() => {
    if (currentUser?.role !== 'teacher') return;
    const subs = teacherScopedSubsRef.current;
    const wanted = new Set<string>();

    for (const id of teacherOwnedIds.assignmentIds) {
      const key = `a:${id}`;
      wanted.add(key);
      if (!subs.has(key)) {
        subs.set(key, subscribeSubmissionSource(key, query(collection(db, 'submissions'), where('assignmentId', '==', id))));
      }
    }
    for (const id of teacherOwnedIds.testIds) {
      const key = `t:${id}`;
      wanted.add(key);
      if (!subs.has(key)) {
        subs.set(key, subscribeSubmissionSource(key, query(collection(db, 'submissions'), where('testId', '==', id))));
      }
    }
    for (const id of teacherOwnedIds.presentationIds) {
      const key = `p:${id}`;
      wanted.add(key);
      if (!subs.has(key)) {
        subs.set(key, subscribePresentationMarkSource(key, query(collection(db, 'presentationMarks'), where('presentationId', '==', id))));
      }
    }

    for (const [key, unsub] of Array.from(subs.entries())) {
      if (!wanted.has(key)) {
        unsub();
        subs.delete(key);
        submissionSourcesRef.current.delete(key);
        presentationMarkSourcesRef.current.delete(key);
      }
    }
    recomputeSubmissions();
    recomputePresentationMarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherOwnedKey, currentUser?.id, currentUser?.role]);

  // Test results are derived from the test submissions mirrored into `submissions`.
  const testResults: TestResult[] = useMemo(
    () =>
      submissions
        .filter(s => !!s.testId)
        .map(s => ({
          id: s.id,
          testId: s.testId as string,
          studentId: s.studentId,
          answers: s.answers ?? [],
          score: s.score ?? 0,
          totalMarks: s.totalMarks ?? 0,
          submittedAt: s.submittedAt,
        })),
    [submissions],
  );

  async function persist<T>(key: string, data: T[]) {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  }

  function recomputeSubmissions() {
    const merged = new Map<string, Submission>();
    const sources = Array.from(submissionSourcesRef.current.entries());
    // Local optimistic entries first, so confirmed server data always wins.
    for (const [key, rows] of sources) {
      if (!key.startsWith('local:')) continue;
      for (const row of rows) merged.set(row.id, row);
    }
    for (const [key, rows] of sources) {
      if (key.startsWith('local:')) continue;
      for (const row of rows) merged.set(row.id, row);
    }
    const all = Array.from(merged.values()).sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
    setSubmissions(all);
    persist(STORAGE_KEYS.SUBMISSIONS, all).catch(() => {});
  }

  function subscribeSubmissionSource(key: string, q: Query): () => void {
    return onSnapshot(
      q,
      snap => {
        submissionSourcesRef.current.set(
          key,
          snap.docs.map(d => parseSubmissionDoc(d.id, d.data() as Record<string, unknown>)),
        );
        recomputeSubmissions();
      },
      err => console.error(`[submissions:${key}] snapshot error`, err),
    );
  }

  function recomputePresentationMarks() {
    const merged = new Map<string, PresentationMark>();
    for (const rows of presentationMarkSourcesRef.current.values()) {
      for (const row of rows) merged.set(row.id, row);
    }
    const all = Array.from(merged.values());
    setPresentationMarks(all);
    persist(STORAGE_KEYS.PRESENTATION_MARKS, all).catch(() => {});
  }

  function subscribePresentationMarkSource(key: string, q: Query): () => void {
    return onSnapshot(
      q,
      snap => {
        presentationMarkSourcesRef.current.set(
          key,
          snap.docs.map(d => parsePresentationMarkDoc(d.id, d.data() as Record<string, unknown>)),
        );
        recomputePresentationMarks();
      },
      err => console.error(`[presentationMarks:${key}] snapshot error`, err),
    );
  }

  /**
   * Fetch profile from Firestore by uid. Self-healing: if doc is missing, create it from Auth user and retry.
   * Never block login just because profile is missing.
   */
  async function getProfileByUid(uid: string): Promise<User | null> {
    let snap = await getDoc(doc(db, 'users', uid));

    if (!snap.exists()) {
      const fbUser = auth.currentUser;
      if (fbUser?.uid === uid) {
        try {
          await setDoc(doc(db, 'users', uid), {
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            email: fbUser.email ?? '',
            role: 'student',
            isApproved: true,
            createdAt: serverTimestamp(),
          });
          snap = await getDoc(doc(db, 'users', uid));
        } catch (e) {
          console.error('Self-heal: failed to create user doc', e);
          return null;
        }
      } else {
        return null;
      }
    }

    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    const user = parseUserDoc(snap.id, data);
    setCurrentUser(user);
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return user;
  }

  /** Create Firestore user profile only (no password). Used after createUserWithEmailAndPassword. */
  async function registerProfile(profile: Omit<User, 'id' | 'createdAt' | 'password'>, uid: string): Promise<void> {
    const profileData = {
      name: profile.name,
      email: profile.email,
      role: profile.role,
      department: profile.department ?? null,
      rollNumber: profile.rollNumber ?? null,
      semester: profile.semester ?? null,
      isApproved: profile.isApproved ?? false,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', uid), profileData);
  }

  async function logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Failed to sign out of Firebase Auth', e);
    }
    setCurrentUser(null);
    setUsers([]);
    setSubmissions([]);
    setPresentationMarks([]);
    setNotifications([]);
    teacherScopedSubsRef.current.forEach(u => u());
    teacherScopedSubsRef.current.clear();
    submissionSourcesRef.current.clear();
    presentationMarkSourcesRef.current.clear();
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (e) {
      console.error('Failed to clear cached data on logout', e);
    }
  }

  async function addSubject(subject: Omit<Subject, 'id' | 'createdAt'>): Promise<void> {
    const newSubject: Subject = { ...subject, id: generateId(), createdAt: new Date().toISOString() };
    // Firestore is the source of truth; the active-subjects snapshot refreshes the UI.
    await setDoc(doc(db, 'subjects', newSubject.id), {
      ...newSubject,
      subjectId: newSubject.id,
      subjectName: newSubject.name,
      status: 'active' as const,
    });
  }

  /** Legacy helper kept for API compatibility; enrollments flow through src/services/enrollment.ts. */
  async function enrollInSubject(subjectId: string, studentId: string): Promise<void> {
    const student = users.find(u => u.id === studentId) ?? currentUser;
    const subject = subjects.find(s => s.id === subjectId);
    const batch = writeBatch(db);
    batch.set(doc(db, 'enrollments', `${studentId}_${subjectId}`), {
      studentId,
      studentName: student?.name ?? '',
      subjectId,
      teacherId: subject?.teacherId ?? '',
      enrolledAt: serverTimestamp(),
    });
    batch.update(doc(db, 'subjects', subjectId), { enrolledStudents: arrayUnion(studentId) });
    await batch.commit();
  }

  async function unenrollFromSubject(subjectId: string, studentId: string): Promise<void> {
    // Optimistic local removal; the subjects snapshot reconciles after the server writes.
    setSubjects(prev => prev.map(s => s.id === subjectId
      ? { ...s, enrolledStudents: s.enrolledStudents.filter(id => id !== studentId) }
      : s));
    try {
      await deleteDoc(doc(db, 'enrollments', `${studentId}_${subjectId}`));
    } catch (e) {
      console.error('Failed to delete enrollment doc', e);
    }
    try {
      await updateDoc(doc(db, 'subjects', subjectId), { enrolledStudents: arrayRemove(studentId) });
    } catch (e) {
      console.error('Failed to update subject enrollment mirror', e);
    }
  }

  /** Notify every enrolled student of a subject (teacher-authored events). */
  async function fanOutNotifications(params: {
    subjectId: string;
    title: string;
    body: string;
    type: Notification['type'];
  }): Promise<void> {
    try {
      const uid = currentUser?.id ?? '';
      const snap = await getDocs(query(
        collection(db, 'enrollments'),
        where('subjectId', '==', params.subjectId),
        where('teacherId', '==', uid),
      ));
      const seen = new Set<string>();
      const senders = snap.docs.map(d => {
        const studentId = (d.data() as { studentId?: string }).studentId;
        if (!studentId || studentId === uid || seen.has(studentId)) return Promise.resolve();
        seen.add(studentId);
        return setDoc(doc(db, 'notifications', generateId()), {
          userId: studentId,
          title: params.title,
          body: params.body,
          type: params.type,
          read: false,
          createdAt: serverTimestamp(),
        }).catch(e => console.error('Failed to notify student', studentId, e));
      });
      await Promise.all(senders);
    } catch (e) {
      console.error('Failed to load subject enrollments for notifications', e);
    }
  }

  async function addAssignment(assignment: Omit<Assignment, 'id' | 'createdAt'>): Promise<void> {
    const newAssignment: Assignment = { ...assignment, id: generateId(), createdAt: new Date().toISOString() };
    await setDoc(doc(db, 'assignments', newAssignment.id), newAssignment);
    await fanOutNotifications({
      subjectId: assignment.subjectId,
      title: 'New Assignment Posted',
      body: `${assignment.title} has been posted in ${assignment.subjectName}.`,
      type: 'assignment',
    });
  }

  /**
   * The assignment file upload already persisted the Firestore doc (deterministic id);
   * this mirrors it into local state so the UI updates immediately.
   */
  async function submitAssignment(submission: Omit<Submission, 'id' | 'submittedAt'>): Promise<void> {
    const id = `assignment_${submission.assignmentId}_${submission.studentId}`;
    const newSub: Submission = { ...submission, id, submittedAt: new Date().toISOString() };
    submissionSourcesRef.current.set(`local:${id}`, [newSub]);
    recomputeSubmissions();
  }

  async function gradeSubmission(submissionId: string, marks: number, feedback: string): Promise<void> {
    const before = submissions;
    const gradedAt = new Date().toISOString();
    setSubmissions(prev => prev.map(s =>
      s.id === submissionId ? { ...s, marks, feedback, gradedAt } : s,
    ));
    try {
      await updateDoc(doc(db, 'submissions', submissionId), {
        marks,
        feedback,
        gradedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('Failed to save grade to Firestore', e);
      setSubmissions(before);
    }
  }

  async function addTest(test: Omit<Test, 'id' | 'createdAt'>): Promise<void> {
    const newTest: Test = { ...test, id: generateId(), createdAt: new Date().toISOString() };
    await setDoc(doc(db, 'tests', newTest.id), newTest);
    await fanOutNotifications({
      subjectId: test.subjectId,
      title: 'New Test Scheduled',
      body: `${test.title} is scheduled in ${test.subjectName}.`,
      type: 'test',
    });
  }

  async function submitTest(result: Omit<TestResult, 'id' | 'submittedAt'>): Promise<void> {
    if (testResults.some(r => r.testId === result.testId && r.studentId === result.studentId)) {
      console.warn('Test already submitted; ignoring duplicate submission.');
      return;
    }
    // Deterministic id so resubmission attempts become updates, which students
    // are not allowed to perform under the security rules.
    const id = `test_${result.testId}_${result.studentId}`;
    const payload = {
      testId: result.testId,
      studentId: result.studentId,
      studentName: currentUser?.name ?? '',
      rollNumber: currentUser?.rollNumber ?? null,
      subjectId: tests.find(t => t.id === result.testId)?.subjectId ?? null,
      answers: result.answers,
      score: result.score,
      totalMarks: result.totalMarks,
      submittedAt: serverTimestamp(),
      marks: null,
      feedback: null,
    };
    try {
      await setDoc(doc(db, 'submissions', id), payload);
    } catch (e) {
      console.error('Failed to submit test to Firestore', e);
      return;
    }
    const local: Submission = {
      id,
      testId: result.testId,
      studentId: result.studentId,
      studentName: currentUser?.name ?? '',
      rollNumber: currentUser?.rollNumber ?? undefined,
      subjectId: tests.find(t => t.id === result.testId)?.subjectId ?? undefined,
      answers: result.answers,
      score: result.score,
      totalMarks: result.totalMarks,
      submittedAt: new Date().toISOString(),
      content: '',
    };
    submissionSourcesRef.current.set(`local:${id}`, [local]);
    recomputeSubmissions();
  }

  async function addPresentation(presentation: Omit<Presentation, 'id' | 'createdAt'>): Promise<void> {
    const newPres: Presentation = { ...presentation, id: generateId(), createdAt: new Date().toISOString() };
    await setDoc(doc(db, 'presentations', newPres.id), newPres);
  }

  async function addPresentationMark(mark: Omit<PresentationMark, 'id'>): Promise<void> {
    const id = `${mark.presentationId}_${mark.studentId}`;
    await setDoc(doc(db, 'presentationMarks', id), {
      presentationId: mark.presentationId,
      studentId: mark.studentId,
      marks: mark.marks,
      totalMarks: mark.totalMarks,
      feedback: mark.feedback ?? null,
    });
  }

  async function addAnnouncement(announcement: Omit<Announcement, 'id' | 'createdAt'>): Promise<void> {
    const newAnn: Announcement = { ...announcement, id: generateId(), createdAt: new Date().toISOString() };
    await setDoc(doc(db, 'announcements', newAnn.id), newAnn);
  }

  async function markNotificationRead(notificationId: string): Promise<void> {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (e) {
      console.error('Failed to mark notification read', e);
    }
  }

  async function addNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<void> {
    await setDoc(doc(db, 'notifications', generateId()), {
      ...notification,
      createdAt: new Date().toISOString(),
    });
  }

  async function approveUser(userId: string): Promise<void> {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isApproved: true } : u));
    await updateDoc(doc(db, 'users', userId), { isApproved: true });
  }

  async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
    const before = users;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));

    const { password: _p, ...safeUpdates } = updates as Partial<User> & { password?: string };
    // Firestore does not allow `undefined` values in updateDoc payloads.
    const sanitized: Record<string, unknown> = { ...safeUpdates };
    Object.keys(sanitized).forEach(k => {
      if (sanitized[k] === undefined) delete sanitized[k];
    });
    try {
      await updateDoc(doc(db, 'users', userId), sanitized);
    } catch (e) {
      console.error('Failed to update user in Firestore', e);
      setUsers(before);
      throw e;
    }

    if (currentUserRef.current?.id === userId) {
      setCurrentUser(prev => {
        const updatedUser = { ...(prev as User), ...updates };
        AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser)).catch(() => {});
        return updatedUser;
      });
    }
  }

  async function deleteUser(userId: string): Promise<void> {
    const before = users;
    setUsers(prev => prev.filter(u => u.id !== userId));
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (e) {
      console.error('Failed to delete user in Firestore', e);
      setUsers(before);
      throw e;
    }
  }

  function getStudentMarks(studentId: string, subjectId: string) {
    const subjectAssignments = assignments.filter(a => a.subjectId === subjectId);
    const studentSubmissions = submissions.filter(s =>
      s.studentId === studentId && subjectAssignments.find(a => a.id === s.assignmentId)
    );
    const assignmentTotal = subjectAssignments.reduce((sum, a) => sum + a.totalMarks, 0);
    const assignmentObtained = studentSubmissions.reduce((sum, s) => sum + (s.marks ?? 0), 0);

    const subjectTests = tests.filter(t => t.subjectId === subjectId);
    const studentTestResults = testResults.filter(r =>
      r.studentId === studentId && subjectTests.find(t => t.id === r.testId)
    );
    const testTotal = subjectTests.reduce((sum, t) => sum + t.totalMarks, 0);
    const testObtained = studentTestResults.reduce((sum, r) => sum + r.score, 0);

    const subjectPresentations = presentations.filter(p => p.subjectId === subjectId);
    const studentPresentationMarks = presentationMarks.filter(m =>
      m.studentId === studentId && subjectPresentations.find(p => p.id === m.presentationId)
    );
    const presentationTotal = studentPresentationMarks.reduce((sum, m) => sum + m.totalMarks, 0);
    const presentationObtained = studentPresentationMarks.reduce((sum, m) => sum + m.marks, 0);

    return {
      assignmentTotal,
      assignmentObtained,
      testTotal,
      testObtained,
      presentationTotal,
      presentationObtained,
      total: assignmentTotal + testTotal + presentationTotal,
      obtained: assignmentObtained + testObtained + presentationObtained,
    };
  }

  function getUnreadCount(userId: string): number {
    return notifications.filter(n => n.userId === userId && !n.read).length;
  }

  const value = useMemo(() => ({
    currentUser, users, subjects, assignments, submissions, tests, testResults,
    presentations, presentationMarks, notifications, announcements, isLoading,
    getProfileByUid, registerProfile, logout, addSubject, enrollInSubject, unenrollFromSubject,
    addAssignment, submitAssignment, gradeSubmission, addTest, submitTest,
    addPresentation, addPresentationMark, addAnnouncement, markNotificationRead,
    addNotification, approveUser, updateUser, deleteUser, getStudentMarks, getUnreadCount,
  }), [
    currentUser, users, subjects, assignments, submissions, tests, testResults,
    presentations, presentationMarks, notifications, announcements, isLoading,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
