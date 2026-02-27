import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'student' | 'teacher' | 'cr' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string;
  rollNumber?: string;
  semester?: string;
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
  assignmentId: string;
  studentId: string;
  studentName: string;
  content: string;
  fileName?: string;
  submittedAt: string;
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

  login: (email: string, password: string) => Promise<User | null>;
  register: (user: Omit<User, 'id' | 'createdAt'>) => Promise<boolean>;
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

const SEED_USERS: User[] = [
  {
    id: 'admin1',
    name: 'Admin User',
    email: 'admin@muet.edu.pk',
    password: 'admin123',
    role: 'admin',
    department: 'Administration',
    isApproved: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'teacher1',
    name: 'Dr. Ahmed Khan',
    email: 'ahmed.khan@muet.edu.pk',
    password: 'teacher123',
    role: 'teacher',
    department: 'Computer Science',
    isApproved: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student1',
    name: 'Ali Hassan',
    email: 'ali.hassan@muet.edu.pk',
    password: 'student123',
    role: 'student',
    department: 'Computer Science',
    rollNumber: '19SW01',
    semester: '6',
    isApproved: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cr1',
    name: 'Sara Malik',
    email: 'sara.malik@muet.edu.pk',
    password: 'cr123',
    role: 'cr',
    department: 'Computer Science',
    rollNumber: '19SW02',
    semester: '6',
    isApproved: true,
    createdAt: new Date().toISOString(),
  },
];

const SEED_SUBJECTS: Subject[] = [
  {
    id: 'sub1',
    name: 'Software Engineering',
    code: 'SE-401',
    department: 'Computer Science',
    semester: '6',
    teacherId: 'teacher1',
    teacherName: 'Dr. Ahmed Khan',
    creditHours: 3,
    enrolledStudents: ['student1', 'cr1'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sub2',
    name: 'Database Systems',
    code: 'DB-302',
    department: 'Computer Science',
    semester: '6',
    teacherId: 'teacher1',
    teacherName: 'Dr. Ahmed Khan',
    creditHours: 3,
    enrolledStudents: ['student1', 'cr1'],
    createdAt: new Date().toISOString(),
  },
];

const SEED_ASSIGNMENTS: Assignment[] = [
  {
    id: 'asgn1',
    subjectId: 'sub1',
    subjectName: 'Software Engineering',
    teacherId: 'teacher1',
    title: 'UML Diagrams Assignment',
    description: 'Create use case, class, and sequence diagrams for an e-commerce system.',
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    totalMarks: 20,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'asgn2',
    subjectId: 'sub2',
    subjectName: 'Database Systems',
    teacherId: 'teacher1',
    title: 'ER Diagram & Normalization',
    description: 'Design an ER diagram for a university management system and normalize to 3NF.',
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    totalMarks: 25,
    createdAt: new Date().toISOString(),
  },
];

const SEED_TESTS: Test[] = [
  {
    id: 'test1',
    subjectId: 'sub1',
    subjectName: 'Software Engineering',
    teacherId: 'teacher1',
    title: 'Sessional Test 1 – SDLC',
    duration: 30,
    totalMarks: 20,
    scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    questions: [
      { id: 'q1', text: 'Which SDLC model is best for well-defined requirements?', options: ['Agile', 'Waterfall', 'Spiral', 'Prototype'], correctIndex: 1 },
      { id: 'q2', text: 'What does UML stand for?', options: ['Universal Modeling Language', 'Unified Modeling Language', 'Unique Markup Language', 'None'], correctIndex: 1 },
      { id: 'q3', text: 'Which diagram shows system behavior over time?', options: ['Class Diagram', 'ER Diagram', 'Sequence Diagram', 'Use Case'], correctIndex: 2 },
      { id: 'q4', text: 'Agile methodology is based on:', options: ['Documentation', 'Iteration', 'Planning only', 'Code review'], correctIndex: 1 },
    ],
    createdAt: new Date().toISOString(),
  },
];

const SEED_PRESENTATIONS: Presentation[] = [
  {
    id: 'pres1',
    subjectId: 'sub1',
    subjectName: 'Software Engineering',
    teacherId: 'teacher1',
    title: 'Final Project Presentation',
    scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 15,
    venue: 'CS Lab 1',
    createdAt: new Date().toISOString(),
  },
];

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif1',
    userId: 'student1',
    title: 'New Assignment Posted',
    body: 'UML Diagrams Assignment has been posted in Software Engineering.',
    type: 'assignment',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif2',
    userId: 'student1',
    title: 'Sessional Test Scheduled',
    body: 'SDLC Test is scheduled in 2 days. Be prepared!',
    type: 'test',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif3',
    userId: 'cr1',
    title: 'New Assignment Posted',
    body: 'UML Diagrams Assignment has been posted in Software Engineering.',
    type: 'assignment',
    read: false,
    createdAt: new Date().toISOString(),
  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [presentationMarks, setPresentationMarks] = useState<PresentationMark[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [
        usersData, currentUserData, subjectsData, assignmentsData,
        submissionsData, testsData, testResultsData, presentationsData,
        presentationMarksData, notificationsData, announcementsData,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USERS),
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER),
        AsyncStorage.getItem(STORAGE_KEYS.SUBJECTS),
        AsyncStorage.getItem(STORAGE_KEYS.ASSIGNMENTS),
        AsyncStorage.getItem(STORAGE_KEYS.SUBMISSIONS),
        AsyncStorage.getItem(STORAGE_KEYS.TESTS),
        AsyncStorage.getItem(STORAGE_KEYS.TEST_RESULTS),
        AsyncStorage.getItem(STORAGE_KEYS.PRESENTATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.PRESENTATION_MARKS),
        AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS),
      ]);

      const loadedUsers = usersData ? JSON.parse(usersData) : SEED_USERS;
      if (!usersData) {
        await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
      }
      const loadedSubjects = subjectsData ? JSON.parse(subjectsData) : SEED_SUBJECTS;
      if (!subjectsData) {
        await AsyncStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(SEED_SUBJECTS));
      }
      const loadedAssignments = assignmentsData ? JSON.parse(assignmentsData) : SEED_ASSIGNMENTS;
      if (!assignmentsData) {
        await AsyncStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(SEED_ASSIGNMENTS));
      }
      const loadedTests = testsData ? JSON.parse(testsData) : SEED_TESTS;
      if (!testsData) {
        await AsyncStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(SEED_TESTS));
      }
      const loadedPresentations = presentationsData ? JSON.parse(presentationsData) : SEED_PRESENTATIONS;
      if (!presentationsData) {
        await AsyncStorage.setItem(STORAGE_KEYS.PRESENTATIONS, JSON.stringify(SEED_PRESENTATIONS));
      }
      const loadedNotifications = notificationsData ? JSON.parse(notificationsData) : SEED_NOTIFICATIONS;
      if (!notificationsData) {
        await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
      }

      setUsers(loadedUsers);
      setSubjects(loadedSubjects);
      setAssignments(loadedAssignments);
      setSubmissions(submissionsData ? JSON.parse(submissionsData) : []);
      setTests(loadedTests);
      setTestResults(testResultsData ? JSON.parse(testResultsData) : []);
      setPresentations(loadedPresentations);
      setPresentationMarks(presentationMarksData ? JSON.parse(presentationMarksData) : []);
      setNotifications(loadedNotifications);
      setAnnouncements(announcementsData ? JSON.parse(announcementsData) : []);
      if (currentUserData) {
        setCurrentUser(JSON.parse(currentUserData));
      }
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setIsLoading(false);
    }
  }

  async function persist<T>(key: string, data: T[]) {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  }

  async function login(email: string, password: string): Promise<User | null> {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (user) {
      setCurrentUser(user);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }
    return null;
  }

  async function register(userData: Omit<User, 'id' | 'createdAt'>): Promise<boolean> {
    if (users.find(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
      return false;
    }
    const newUser: User = { ...userData, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [...users, newUser];
    setUsers(updated);
    await persist(STORAGE_KEYS.USERS, updated);
    return true;
  }

  async function logout(): Promise<void> {
    setCurrentUser(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  async function addSubject(subject: Omit<Subject, 'id' | 'createdAt'>): Promise<void> {
    const newSubject: Subject = { ...subject, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [...subjects, newSubject];
    setSubjects(updated);
    await persist(STORAGE_KEYS.SUBJECTS, updated);
  }

  async function enrollInSubject(subjectId: string, studentId: string): Promise<void> {
    const updated = subjects.map(s =>
      s.id === subjectId && !s.enrolledStudents.includes(studentId)
        ? { ...s, enrolledStudents: [...s.enrolledStudents, studentId] }
        : s
    );
    setSubjects(updated);
    await persist(STORAGE_KEYS.SUBJECTS, updated);
  }

  async function unenrollFromSubject(subjectId: string, studentId: string): Promise<void> {
    const updated = subjects.map(s =>
      s.id === subjectId
        ? { ...s, enrolledStudents: s.enrolledStudents.filter(id => id !== studentId) }
        : s
    );
    setSubjects(updated);
    await persist(STORAGE_KEYS.SUBJECTS, updated);
  }

  async function addAssignment(assignment: Omit<Assignment, 'id' | 'createdAt'>): Promise<void> {
    const newAssignment: Assignment = { ...assignment, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [...assignments, newAssignment];
    setAssignments(updated);
    await persist(STORAGE_KEYS.ASSIGNMENTS, updated);
    const subject = subjects.find(s => s.id === assignment.subjectId);
    if (subject) {
      const newNotifs: Notification[] = subject.enrolledStudents.map(sid => ({
        id: generateId(),
        userId: sid,
        title: 'New Assignment Posted',
        body: `${assignment.title} has been posted in ${assignment.subjectName}.`,
        type: 'assignment' as const,
        read: false,
        createdAt: new Date().toISOString(),
      }));
      const updatedNotifs = [...notifications, ...newNotifs];
      setNotifications(updatedNotifs);
      await persist(STORAGE_KEYS.NOTIFICATIONS, updatedNotifs);
    }
  }

  async function submitAssignment(submission: Omit<Submission, 'id' | 'submittedAt'>): Promise<void> {
    const newSub: Submission = { ...submission, id: generateId(), submittedAt: new Date().toISOString() };
    const updated = [...submissions, newSub];
    setSubmissions(updated);
    await persist(STORAGE_KEYS.SUBMISSIONS, updated);
  }

  async function gradeSubmission(submissionId: string, marks: number, feedback: string): Promise<void> {
    const updated = submissions.map(s =>
      s.id === submissionId ? { ...s, marks, feedback, gradedAt: new Date().toISOString() } : s
    );
    setSubmissions(updated);
    await persist(STORAGE_KEYS.SUBMISSIONS, updated);
  }

  async function addTest(test: Omit<Test, 'id' | 'createdAt'>): Promise<void> {
    const newTest: Test = { ...test, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [...tests, newTest];
    setTests(updated);
    await persist(STORAGE_KEYS.TESTS, updated);
    const subject = subjects.find(s => s.id === test.subjectId);
    if (subject) {
      const newNotifs: Notification[] = subject.enrolledStudents.map(sid => ({
        id: generateId(),
        userId: sid,
        title: 'New Test Scheduled',
        body: `${test.title} is scheduled in ${test.subjectName}.`,
        type: 'test' as const,
        read: false,
        createdAt: new Date().toISOString(),
      }));
      const updatedNotifs = [...notifications, ...newNotifs];
      setNotifications(updatedNotifs);
      await persist(STORAGE_KEYS.NOTIFICATIONS, updatedNotifs);
    }
  }

  async function submitTest(result: Omit<TestResult, 'id' | 'submittedAt'>): Promise<void> {
    const newResult: TestResult = { ...result, id: generateId(), submittedAt: new Date().toISOString() };
    const updated = [...testResults, newResult];
    setTestResults(updated);
    await persist(STORAGE_KEYS.TEST_RESULTS, updated);
  }

  async function addPresentation(presentation: Omit<Presentation, 'id' | 'createdAt'>): Promise<void> {
    const newPres: Presentation = { ...presentation, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [...presentations, newPres];
    setPresentations(updated);
    await persist(STORAGE_KEYS.PRESENTATIONS, updated);
  }

  async function addPresentationMark(mark: Omit<PresentationMark, 'id'>): Promise<void> {
    const existing = presentationMarks.find(m => m.presentationId === mark.presentationId && m.studentId === mark.studentId);
    let updated: PresentationMark[];
    if (existing) {
      updated = presentationMarks.map(m => m.id === existing.id ? { ...m, ...mark } : m);
    } else {
      updated = [...presentationMarks, { ...mark, id: generateId() }];
    }
    setPresentationMarks(updated);
    await persist(STORAGE_KEYS.PRESENTATION_MARKS, updated);
  }

  async function addAnnouncement(announcement: Omit<Announcement, 'id' | 'createdAt'>): Promise<void> {
    const newAnn: Announcement = { ...announcement, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [...announcements, newAnn];
    setAnnouncements(updated);
    await persist(STORAGE_KEYS.ANNOUNCEMENTS, updated);
  }

  async function markNotificationRead(notificationId: string): Promise<void> {
    const updated = notifications.map(n => n.id === notificationId ? { ...n, read: true } : n);
    setNotifications(updated);
    await persist(STORAGE_KEYS.NOTIFICATIONS, updated);
  }

  async function addNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<void> {
    const newNotif: Notification = { ...notification, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [...notifications, newNotif];
    setNotifications(updated);
    await persist(STORAGE_KEYS.NOTIFICATIONS, updated);
  }

  async function approveUser(userId: string): Promise<void> {
    const updated = users.map(u => u.id === userId ? { ...u, isApproved: true } : u);
    setUsers(updated);
    await persist(STORAGE_KEYS.USERS, updated);
  }

  async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
    const updated = users.map(u => u.id === userId ? { ...u, ...updates } : u);
    setUsers(updated);
    await persist(STORAGE_KEYS.USERS, updated);
    if (currentUser?.id === userId) {
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
    }
  }

  async function deleteUser(userId: string): Promise<void> {
    const updated = users.filter(u => u.id !== userId);
    setUsers(updated);
    await persist(STORAGE_KEYS.USERS, updated);
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
    login, register, logout, addSubject, enrollInSubject, unenrollFromSubject,
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
