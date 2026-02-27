import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import * as Haptics from 'expo-haptics';

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function StudentTests() {
  const { currentUser, subjects, tests, testResults, submitTest } = useApp();
  const insets = useSafeAreaInsets();
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const webTop = Platform.OS === 'web' ? 67 : 0;

  const mySubjects = subjects.filter(s => s.enrolledStudents.includes(currentUser?.id ?? ''));
  const myTests = tests.filter(t => mySubjects.find(s => s.id === t.subjectId));
  const upcomingTests = myTests.filter(t => new Date(t.scheduledAt) > new Date());
  const pastTests = myTests.filter(t => new Date(t.scheduledAt) <= new Date());

  const test = activeTest ? tests.find(t => t.id === activeTest) : null;

  useEffect(() => {
    if (test && activeTest) {
      setAnswers(new Array(test.questions.length).fill(-1));
      setCurrentQ(0);
      setTimeLeft(test.duration * 60);
    }
  }, [activeTest]);

  useEffect(() => {
    if (activeTest && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(p => {
          if (p <= 1) {
            clearInterval(timerRef.current!);
            handleSubmit(true);
            return 0;
          }
          return p - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeTest]);

  const handleSubmit = async (auto = false) => {
    if (!test || !currentUser) return;
    clearInterval(timerRef.current!);
    if (!auto) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const score = answers.reduce((sum, ans, i) => sum + (ans === test.questions[i].correctIndex ? (test.totalMarks / test.questions.length) : 0), 0);
    setSubmitting(true);
    await submitTest({
      testId: test.id,
      studentId: currentUser.id,
      answers,
      score: Math.round(score),
      totalMarks: test.totalMarks,
    });
    setSubmitting(false);
    setActiveTest(null);
  };

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  const isUrgent = timeLeft < 120;

  const getResult = (testId: string) => testResults.find(r => r.testId === testId && r.studentId === currentUser?.id);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + webTop + 16 }]}>
        <Text style={styles.headerTitle}>Sessional Tests</Text>
        <Text style={styles.headerSub}>{myTests.length} total tests</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        {upcomingTests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Tests</Text>
            {upcomingTests.map(t => {
              const result = getResult(t.id);
              return (
                <Card key={t.id} style={styles.testCard}>
                  <View style={styles.testHeader}>
                    <View style={styles.testIconBox}>
                      <Feather name="edit-3" size={20} color={Colors.teacher} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.testTitle}>{t.title}</Text>
                      <Text style={styles.testSub}>{t.subjectName}</Text>
                    </View>
                    {result
                      ? <Badge label={`${result.score}/${t.totalMarks}`} variant="success" />
                      : <Badge label="Take Test" variant="info" />
                    }
                  </View>
                  <View style={styles.testMeta}>
                    <View style={styles.metaItem}><Feather name="clock" size={13} color={Colors.textMuted} /><Text style={styles.metaText}>{t.duration} min</Text></View>
                    <View style={styles.metaItem}><Feather name="help-circle" size={13} color={Colors.textMuted} /><Text style={styles.metaText}>{t.questions.length} questions</Text></View>
                    <View style={styles.metaItem}><Feather name="award" size={13} color={Colors.textMuted} /><Text style={styles.metaText}>{t.totalMarks} marks</Text></View>
                    <View style={styles.metaItem}><Feather name="calendar" size={13} color={Colors.textMuted} /><Text style={styles.metaText}>{formatDateShort(t.scheduledAt)}</Text></View>
                  </View>
                  {!result && (
                    <Button label="Start Test" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setActiveTest(t.id); }} variant="primary" style={{ marginTop: 12 }} />
                  )}
                </Card>
              );
            })}
          </View>
        )}

        {pastTests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Past Tests</Text>
            {pastTests.map(t => {
              const result = getResult(t.id);
              const pct = result ? Math.round((result.score / result.totalMarks) * 100) : 0;
              return (
                <Card key={t.id} style={styles.testCard}>
                  <View style={styles.testHeader}>
                    <View style={[styles.testIconBox, { backgroundColor: Colors.textMuted + '15' }]}>
                      <Feather name="check-circle" size={20} color={Colors.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.testTitle}>{t.title}</Text>
                      <Text style={styles.testSub}>{t.subjectName}</Text>
                    </View>
                    {result
                      ? <Badge label={`${result.score}/${t.totalMarks}`} variant={pct >= 60 ? 'success' : 'error'} />
                      : <Badge label="Not Taken" variant="default" />
                    }
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {myTests.length === 0 && (
          <Card style={styles.emptyCard}>
            <Feather name="edit-3" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Tests Yet</Text>
            <Text style={styles.emptyText}>Tests will appear once your teachers schedule them</Text>
          </Card>
        )}
      </ScrollView>

      {/* Test Taking Modal */}
      <Modal visible={!!activeTest && !!test} animationType="slide" presentationStyle="fullScreen">
        {test && (
          <View style={{ flex: 1, backgroundColor: Colors.background }}>
            {/* Timer Header */}
            <View style={[styles.testModalHeader, { paddingTop: insets.top + 16, backgroundColor: isUrgent ? Colors.error : Colors.primary }]}>
              <View>
                <Text style={styles.testModalTitle}>{test.title}</Text>
                <Text style={styles.testModalSub}>{currentQ + 1} of {test.questions.length} questions</Text>
              </View>
              <View style={[styles.timerBox, { backgroundColor: isUrgent ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)' }]}>
                <Feather name="clock" size={14} color="#FFFFFF" />
                <Text style={styles.timerText}>{mins}:{secs}</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarOuter}>
              <View style={[styles.progressBarInner, { width: `${((currentQ + 1) / test.questions.length) * 100}%` as any }]} />
            </View>

            <ScrollView contentContainerStyle={styles.testContent} showsVerticalScrollIndicator={false}>
              <Card style={styles.questionCard}>
                <Text style={styles.questionNum}>Question {currentQ + 1}</Text>
                <Text style={styles.questionText}>{test.questions[currentQ].text}</Text>
              </Card>

              <View style={styles.optionsContainer}>
                {test.questions[currentQ].options.map((opt, idx) => {
                  const selected = answers[currentQ] === idx;
                  return (
                    <Pressable
                      key={idx}
                      style={[styles.optionBtn, selected && styles.optionSelected]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const newAnswers = [...answers];
                        newAnswers[currentQ] = idx;
                        setAnswers(newAnswers);
                      }}
                    >
                      <View style={[styles.optionCircle, selected && styles.optionCircleSelected]}>
                        <Text style={[styles.optionLetter, selected && { color: Colors.primary }]}>{String.fromCharCode(65 + idx)}</Text>
                      </View>
                      <Text style={[styles.optionText, selected && { color: Colors.primary, fontFamily: 'Poppins_600SemiBold' }]}>{opt}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.navRow}>
                {currentQ > 0 && (
                  <Pressable style={styles.navBtn} onPress={() => setCurrentQ(q => q - 1)}>
                    <Feather name="arrow-left" size={18} color={Colors.text} />
                    <Text style={styles.navBtnText}>Previous</Text>
                  </Pressable>
                )}
                <View style={{ flex: 1 }} />
                {currentQ < test.questions.length - 1 ? (
                  <Pressable style={[styles.navBtn, styles.navBtnPrimary]} onPress={() => setCurrentQ(q => q + 1)}>
                    <Text style={[styles.navBtnText, { color: '#FFFFFF' }]}>Next</Text>
                    <Feather name="arrow-right" size={18} color="#FFFFFF" />
                  </Pressable>
                ) : (
                  <Pressable style={[styles.navBtn, styles.navBtnSuccess]} onPress={() => handleSubmit(false)}>
                    <Text style={[styles.navBtnText, { color: '#FFFFFF' }]}>Submit</Text>
                    <Feather name="check" size={18} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingBottom: 20 },
  headerTitle: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  headerSub: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: Colors.text, marginBottom: 12 },
  testCard: { marginBottom: 12 },
  testHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  testIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.teacher + '15', alignItems: 'center', justifyContent: 'center' },
  testTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  testSub: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  testMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: Colors.text },
  emptyText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, textAlign: 'center' },
  testModalHeader: { paddingHorizontal: 24, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  testModalTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  testModalSub: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  timerBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  timerText: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  progressBarOuter: { height: 4, backgroundColor: Colors.border },
  progressBarInner: { height: 4, backgroundColor: Colors.accent },
  testContent: { padding: 16, paddingBottom: 40 },
  questionCard: { marginBottom: 20 },
  questionNum: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  questionText: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: Colors.text, lineHeight: 24 },
  optionsContainer: { gap: 10 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  optionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
  optionCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  optionCircleSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  optionLetter: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: Colors.textSecondary },
  optionText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.text, flex: 1 },
  navRow: { flexDirection: 'row', marginTop: 24, gap: 12 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border },
  navBtnPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  navBtnSuccess: { backgroundColor: Colors.success, borderColor: Colors.success },
  navBtnText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
});
