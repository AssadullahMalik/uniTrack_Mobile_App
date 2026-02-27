import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Question } from '@/context/AppContext';
import * as Haptics from 'expo-haptics';

function generateId() { return Date.now().toString() + Math.random().toString(36).substr(2, 6); }

export default function TeacherTests() {
  const { currentUser, subjects, tests, testResults, users, presentations, addTest, addPresentation, addPresentationMark } = useApp();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'tests' | 'presentations'>('tests');
  const [showCreateTest, setShowCreateTest] = useState(false);
  const [showCreatePres, setShowCreatePres] = useState(false);
  const [showGradePres, setShowGradePres] = useState<string | null>(null);
  const [showResults, setShowResults] = useState<string | null>(null);

  // Test creation
  const [testTitle, setTestTitle] = useState('');
  const [testSubjectId, setTestSubjectId] = useState('');
  const [testDuration, setTestDuration] = useState('30');
  const [testScheduled, setTestScheduled] = useState('');
  const [questions, setQuestions] = useState<Question[]>([{ id: generateId(), text: '', options: ['', '', '', ''], correctIndex: 0 }]);
  const [creatingTest, setCreatingTest] = useState(false);

  // Presentation creation
  const [presTitle, setPresTitle] = useState('');
  const [presSubjectId, setPresSubjectId] = useState('');
  const [presVenue, setPresVenue] = useState('');
  const [presScheduled, setPresScheduled] = useState('');
  const [presDuration, setPresDuration] = useState('15');
  const [creatingPres, setCreatingPres] = useState(false);

  // Grading
  const [gradeStudentId, setGradeStudentId] = useState('');
  const [gradeMarks, setGradeMarks] = useState('');
  const [gradeTotal, setGradeTotal] = useState('20');
  const [gradingPres, setGradingPres] = useState(false);

  const webTop = Platform.OS === 'web' ? 67 : 0;
  const mySubjects = subjects.filter(s => s.teacherId === currentUser?.id);
  const myTests = tests.filter(t => t.teacherId === currentUser?.id);
  const myPresentations = presentations.filter(p => p.teacherId === currentUser?.id);

  const handleCreateTest = async () => {
    if (!currentUser || !testTitle.trim() || !testSubjectId) return;
    const validQs = questions.filter(q => q.text.trim() && q.options.every(o => o.trim()));
    if (validQs.length === 0) return;
    setCreatingTest(true);
    const sub = mySubjects.find(s => s.id === testSubjectId);
    await addTest({
      subjectId: testSubjectId,
      subjectName: sub?.name ?? '',
      teacherId: currentUser.id,
      title: testTitle.trim(),
      duration: parseInt(testDuration) || 30,
      totalMarks: validQs.length * 5,
      questions: validQs,
      scheduledAt: testScheduled ? new Date(testScheduled).toISOString() : new Date().toISOString(),
    });
    setCreatingTest(false);
    setShowCreateTest(false);
    setTestTitle(''); setTestSubjectId(''); setTestDuration('30');
    setQuestions([{ id: generateId(), text: '', options: ['', '', '', ''], correctIndex: 0 }]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCreatePresentation = async () => {
    if (!currentUser || !presTitle.trim() || !presSubjectId) return;
    setCreatingPres(true);
    const sub = mySubjects.find(s => s.id === presSubjectId);
    await addPresentation({
      subjectId: presSubjectId,
      subjectName: sub?.name ?? '',
      teacherId: currentUser.id,
      title: presTitle.trim(),
      scheduledAt: presScheduled ? new Date(presScheduled).toISOString() : new Date().toISOString(),
      duration: parseInt(presDuration) || 15,
      venue: presVenue.trim() || 'TBD',
    });
    setCreatingPres(false);
    setShowCreatePres(false);
    setPresTitle(''); setPresSubjectId(''); setPresVenue(''); setPresScheduled('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleGradePresentation = async () => {
    if (!showGradePres || !gradeStudentId || !gradeMarks) return;
    setGradingPres(true);
    await addPresentationMark({
      presentationId: showGradePres,
      studentId: gradeStudentId,
      marks: parseInt(gradeMarks),
      totalMarks: parseInt(gradeTotal) || 20,
    });
    setGradingPres(false);
    setShowGradePres(null);
    setGradeStudentId(''); setGradeMarks('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const updateQuestion = (idx: number, field: keyof Question | `option_${number}`, value: string | number) => {
    const updated = [...questions];
    if (typeof field === 'string' && field.startsWith('option_')) {
      const optIdx = parseInt(field.split('_')[1]);
      updated[idx] = { ...updated[idx], options: updated[idx].options.map((o, i) => i === optIdx ? value as string : o) };
    } else {
      (updated[idx] as any)[field] = value;
    }
    setQuestions(updated);
  };

  const selectedPres = showGradePres ? presentations.find(p => p.id === showGradePres) : null;
  const presSubject = selectedPres ? subjects.find(s => s.id === selectedPres.subjectId) : null;
  const eligibleStudents = presSubject ? users.filter(u => presSubject.enrolledStudents.includes(u.id)) : [];

  const resultsTest = showResults ? tests.find(t => t.id === showResults) : null;
  const resultsData = showResults ? testResults.filter(r => r.testId === showResults) : [];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + webTop + 16 }]}>
        <Text style={styles.headerTitle}>Tests & Presentations</Text>
        <Pressable style={styles.createBtn} onPress={() => activeTab === 'tests' ? setShowCreateTest(true) : setShowCreatePres(true)}>
          <Feather name="plus" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        {(['tests', 'presentations'] as const).map(tab => (
          <Pressable key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab === 'tests' ? 'Tests' : 'Presentations'}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        {activeTab === 'tests' && (
          myTests.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Feather name="edit-3" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No Tests Created</Text>
              <Text style={styles.emptyText}>Create your first MCQ test</Text>
              <Button label="Create Test" onPress={() => setShowCreateTest(true)} />
            </Card>
          ) : myTests.map(t => {
            const results = testResults.filter(r => r.testId === t.id);
            const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
            return (
              <Card key={t.id} style={styles.testCard}>
                <View style={styles.testHeader}>
                  <View style={styles.testIcon}><Feather name="edit-3" size={18} color={Colors.teacher} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.testTitle}>{t.title}</Text>
                    <Text style={styles.testSub}>{t.subjectName}</Text>
                  </View>
                  <Pressable onPress={() => setShowResults(t.id)} style={styles.resultsBtn}>
                    <Feather name="bar-chart-2" size={18} color={Colors.teacher} />
                  </Pressable>
                </View>
                <View style={styles.testMeta}>
                  <View style={styles.metaItem}><Feather name="clock" size={12} color={Colors.textMuted} /><Text style={styles.metaText}>{t.duration} min</Text></View>
                  <View style={styles.metaItem}><Feather name="help-circle" size={12} color={Colors.textMuted} /><Text style={styles.metaText}>{t.questions.length} Qs</Text></View>
                  <View style={styles.metaItem}><Feather name="users" size={12} color={Colors.textMuted} /><Text style={styles.metaText}>{results.length} attempts</Text></View>
                  {results.length > 0 && <View style={styles.metaItem}><Feather name="trending-up" size={12} color={Colors.success} /><Text style={[styles.metaText, { color: Colors.success }]}>Avg: {avgScore}/{t.totalMarks}</Text></View>}
                </View>
              </Card>
            );
          })
        )}

        {activeTab === 'presentations' && (
          myPresentations.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Feather name="monitor" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No Presentations</Text>
              <Text style={styles.emptyText}>Schedule a presentation session</Text>
              <Button label="Schedule Presentation" onPress={() => setShowCreatePres(true)} />
            </Card>
          ) : myPresentations.map(p => (
            <Card key={p.id} style={styles.testCard}>
              <View style={styles.testHeader}>
                <View style={[styles.testIcon, { backgroundColor: Colors.success + '15' }]}><Feather name="monitor" size={18} color={Colors.success} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.testTitle}>{p.title}</Text>
                  <Text style={styles.testSub}>{p.subjectName} · {p.venue}</Text>
                </View>
                <Pressable style={[styles.resultsBtn, { backgroundColor: Colors.success + '15' }]} onPress={() => setShowGradePres(p.id)}>
                  <Feather name="edit-3" size={18} color={Colors.success} />
                </Pressable>
              </View>
              <View style={styles.testMeta}>
                <View style={styles.metaItem}><Feather name="calendar" size={12} color={Colors.textMuted} /><Text style={styles.metaText}>{new Date(p.scheduledAt).toLocaleDateString()}</Text></View>
                <View style={styles.metaItem}><Feather name="clock" size={12} color={Colors.textMuted} /><Text style={styles.metaText}>{p.duration} min per group</Text></View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Create Test Modal */}
      <Modal visible={showCreateTest} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: Colors.background }}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16 }]}>
            <Pressable style={styles.modalClose} onPress={() => setShowCreateTest(false)}>
              <Feather name="x" size={22} color={Colors.text} />
            </Pressable>
            <Text style={styles.modalTitle}>Create MCQ Test</Text>
            <Pressable style={styles.saveBtn} onPress={handleCreateTest}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>
            <Card style={styles.formCard}>
              <Text style={styles.label}>Subject *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {mySubjects.map(s => (
                    <Pressable key={s.id} style={[styles.chip, testSubjectId === s.id && styles.chipActive]} onPress={() => setTestSubjectId(s.id)}>
                      <Text style={[styles.chipText, testSubjectId === s.id && { color: '#FFFFFF' }]}>{s.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <Text style={styles.label}>Title *</Text>
              <TextInput style={[styles.input, { marginBottom: 12 }]} placeholder="Test title" placeholderTextColor={Colors.textMuted} value={testTitle} onChangeText={setTestTitle} />
              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Duration (min)</Text>
                  <TextInput style={styles.input} placeholder="30" placeholderTextColor={Colors.textMuted} value={testDuration} onChangeText={setTestDuration} keyboardType="number-pad" />
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={styles.label}>Scheduled Date</Text>
                  <TextInput style={styles.input} placeholder="2026-03-15" placeholderTextColor={Colors.textMuted} value={testScheduled} onChangeText={setTestScheduled} />
                </View>
              </View>
            </Card>

            <View style={styles.questionsHeader}>
              <Text style={styles.sectionLabel}>Questions ({questions.length})</Text>
              <Pressable style={styles.addQBtn} onPress={() => setQuestions(q => [...q, { id: generateId(), text: '', options: ['', '', '', ''], correctIndex: 0 }])}>
                <Feather name="plus" size={16} color={Colors.teacher} />
                <Text style={styles.addQText}>Add Question</Text>
              </Pressable>
            </View>

            {questions.map((q, idx) => (
              <Card key={q.id} style={styles.questionCard}>
                <View style={styles.questionHeader}>
                  <Text style={styles.questionNum}>Q{idx + 1}</Text>
                  {questions.length > 1 && (
                    <Pressable onPress={() => setQuestions(qs => qs.filter((_, i) => i !== idx))}>
                      <Feather name="trash-2" size={16} color={Colors.error} />
                    </Pressable>
                  )}
                </View>
                <TextInput
                  style={[styles.input, { height: 64, marginBottom: 10 }]}
                  placeholder="Question text..."
                  placeholderTextColor={Colors.textMuted}
                  value={q.text}
                  onChangeText={v => updateQuestion(idx, 'text', v)}
                  multiline
                  textAlignVertical="top"
                />
                {q.options.map((opt, optIdx) => (
                  <View key={optIdx} style={styles.optionRow}>
                    <Pressable
                      style={[styles.correctCircle, q.correctIndex === optIdx && styles.correctCircleActive]}
                      onPress={() => updateQuestion(idx, 'correctIndex', optIdx)}
                    >
                      {q.correctIndex === optIdx && <View style={styles.correctDot} />}
                    </Pressable>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                      placeholderTextColor={Colors.textMuted}
                      value={opt}
                      onChangeText={v => updateQuestion(idx, `option_${optIdx}` as any, v)}
                    />
                  </View>
                ))}
                <Text style={styles.correctHint}>Tap circle to mark correct answer</Text>
              </Card>
            ))}

            {creatingTest && <Button label="Creating..." onPress={() => {}} loading fullWidth />}
            {!creatingTest && <Button label="Create Test" onPress={handleCreateTest} fullWidth />}
          </ScrollView>
        </View>
      </Modal>

      {/* Create Presentation Modal */}
      <Modal visible={showCreatePres} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowCreatePres(false)}>
          <View style={[styles.createSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Schedule Presentation</Text>
            <Text style={styles.label}>Subject *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {mySubjects.map(s => (
                  <Pressable key={s.id} style={[styles.chip, presSubjectId === s.id && styles.chipActive]} onPress={() => setPresSubjectId(s.id)}>
                    <Text style={[styles.chipText, presSubjectId === s.id && { color: '#FFFFFF' }]}>{s.name}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Text style={styles.label}>Title *</Text>
            <TextInput style={[styles.input, { marginBottom: 12 }]} placeholder="Presentation session title" placeholderTextColor={Colors.textMuted} value={presTitle} onChangeText={setPresTitle} />
            <View style={styles.rowInputs}>
              <View style={{ flex: 2 }}>
                <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                <TextInput style={styles.input} placeholder="2026-03-20" placeholderTextColor={Colors.textMuted} value={presScheduled} onChangeText={setPresScheduled} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Duration (min)</Text>
                <TextInput style={styles.input} placeholder="15" placeholderTextColor={Colors.textMuted} value={presDuration} onChangeText={setPresDuration} keyboardType="number-pad" />
              </View>
            </View>
            <Text style={styles.label}>Venue</Text>
            <TextInput style={[styles.input, { marginBottom: 12 }]} placeholder="CS Lab 1" placeholderTextColor={Colors.textMuted} value={presVenue} onChangeText={setPresVenue} />
            <Button label="Schedule" onPress={handleCreatePresentation} loading={creatingPres} fullWidth variant="secondary" />
          </View>
        </Pressable>
      </Modal>

      {/* Grade Presentation Modal */}
      <Modal visible={!!showGradePres} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowGradePres(null)}>
          <View style={[styles.createSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Grade Presentation</Text>
            <Text style={styles.presNameLabel}>{selectedPres?.title}</Text>
            <Text style={styles.label}>Student</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {eligibleStudents.map(s => (
                  <Pressable key={s.id} style={[styles.chip, gradeStudentId === s.id && styles.chipActive]} onPress={() => setGradeStudentId(s.id)}>
                    <Text style={[styles.chipText, gradeStudentId === s.id && { color: '#FFFFFF' }]}>{s.name}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Marks Obtained</Text>
                <TextInput style={styles.input} placeholder="17" placeholderTextColor={Colors.textMuted} value={gradeMarks} onChangeText={setGradeMarks} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Out Of</Text>
                <TextInput style={styles.input} placeholder="20" placeholderTextColor={Colors.textMuted} value={gradeTotal} onChangeText={setGradeTotal} keyboardType="number-pad" />
              </View>
            </View>
            <Button label="Save Mark" onPress={handleGradePresentation} loading={gradingPres} fullWidth variant="secondary" />
          </View>
        </Pressable>
      </Modal>

      {/* Test Results Modal */}
      <Modal visible={!!showResults} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowResults(null)}>
          <View style={[styles.resultsSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{resultsTest?.title} – Results</Text>
            {resultsData.length === 0 ? (
              <Text style={styles.noResults}>No students have taken this test yet.</Text>
            ) : resultsData.map(r => {
              const student = users.find(u => u.id === r.studentId);
              const pct = Math.round((r.score / r.totalMarks) * 100);
              return (
                <View key={r.id} style={styles.resultRow}>
                  <View style={styles.resultAvatar}><Text style={styles.resultAvatarText}>{student?.name?.charAt(0)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName}>{student?.name ?? 'Unknown'}</Text>
                    <Text style={styles.resultDate}>{new Date(r.submittedAt).toLocaleDateString()}</Text>
                  </View>
                  <Badge label={`${r.score}/${r.totalMarks} (${pct}%)`} variant={pct >= 60 ? 'success' : 'error'} />
                </View>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.success, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  createBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.accent },
  tabText: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: Colors.textSecondary },
  tabTextActive: { color: Colors.text, fontFamily: 'Poppins_700Bold' },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  testCard: { marginBottom: 12 },
  testHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  testIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.teacher + '15', alignItems: 'center', justifyContent: 'center' },
  testTitle: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  testSub: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  resultsBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.teacher + '15', alignItems: 'center', justifyContent: 'center' },
  testMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 16, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: Colors.text },
  emptyText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: Colors.text },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.teacher },
  saveBtnText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  formCard: { marginBottom: 16 },
  questionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionLabel: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: Colors.text },
  addQBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addQText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.teacher },
  questionCard: { marginBottom: 12 },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  questionNum: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: Colors.teacher },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  correctCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  correctCircleActive: { borderColor: Colors.success },
  correctDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success },
  correctHint: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textMuted, marginTop: 4 },
  label: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.text, marginBottom: 6 },
  input: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, height: 48, fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.text },
  rowInputs: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { borderColor: Colors.teacher, backgroundColor: Colors.teacher },
  chipText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.textSecondary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  createSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 8 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: Colors.text, marginBottom: 4 },
  presNameLabel: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, marginBottom: 12 },
  resultsSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.teacher, alignItems: 'center', justifyContent: 'center' },
  resultAvatarText: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  resultName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  resultDate: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textMuted },
  noResults: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, textAlign: 'center', paddingVertical: 20 },
});
