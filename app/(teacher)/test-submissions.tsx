import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import * as Haptics from 'expo-haptics';
import {
  subscribeTestSubmissionsForTest,
  gradeTestSubmission,
  type TestSubmission,
} from '@/src/services/testSubmissions';
import { TextInput } from 'react-native-gesture-handler';

export default function TeacherTestSubmissionsScreen() {
  const { users, tests } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ testId?: string }>();

  const [submissions, setSubmissions] = useState<TestSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSub, setSelectedSub] = useState<TestSubmission | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [marksInput, setMarksInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  const testId = params.testId as string | undefined;
  const test = tests.find(t => t.id === testId);
  const webTop = Platform.OS === 'web' ? 67 : 0;

  useEffect(() => {
    if (!testId) {
      setError('No test selected.');
      setLoading(false);
      return;
    }
    const unsub = subscribeTestSubmissionsForTest(
      testId,
      subs => {
        setSubmissions(subs);
        setError('');
        setLoading(false);
      },
      err => {
        console.error('Failed to load submissions', err);
        setError('Failed to load submissions.');
        setLoading(false);
      },
    );
    return unsub;
  }, [testId]);

  const getRollNumber = (studentId: string, fallback?: string | null) => {
    const u = users.find(u => u.id === studentId);
    return u?.rollNumber ?? fallback ?? 'N/A';
  };

  const handleOpenAnswers = (sub: TestSubmission) => {
    setSelectedSub(sub);
    setShowAnswers(true);
  };

  const handleOpenGrade = (sub: TestSubmission) => {
    setSelectedSub(sub);
    setMarksInput(sub.marks != null ? String(sub.marks) : '');
    setFeedbackInput(sub.feedback ?? '');
    setShowGradeModal(true);
  };

  const handleSaveGrade = async () => {
    if (!selectedSub) return;
    const parsed = parseInt(marksInput, 10);
    if (Number.isNaN(parsed)) {
      setError('Please enter valid marks.');
      return;
    }
    setSavingGrade(true);
    setError('');
    try {
      await gradeTestSubmission(selectedSub.id, parsed, feedbackInput.trim() || undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowGradeModal(false);
    } catch (e) {
      console.error('Failed to save grade', e);
      setError('Failed to save grade. Please try again.');
    } finally {
      setSavingGrade(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.teacher} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + webTop + 16 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>{test?.title ?? 'Test Submissions'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={submissions}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        ListEmptyComponent={() => (
          <Card style={styles.emptyCard}>
            <Feather name="users" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No submissions yet</Text>
            <Text style={styles.emptySub}>Students who attempt this test will appear here.</Text>
          </Card>
        )}
        renderItem={({ item }) => {
          const roll = getRollNumber(item.studentId, item.rollNumber);
          const marksLabel = item.marks != null ? `${item.marks}` : 'Pending';
          return (
            <Card style={styles.rowCard}>
              <View style={styles.rowHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.studentName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.studentName}</Text>
                  <Text style={styles.meta}>Roll: {roll}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.marksLabel}>{marksLabel}</Text>
                  <Text style={styles.dateLabel}>{item.submittedAt.toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.actionsRow}>
                <Button
                  label="View Answers"
                  onPress={() => handleOpenAnswers(item)}
                  variant="secondary"
                  style={{ flex: 1 }}
                />
                <Button
                  label="Grade"
                  onPress={() => handleOpenGrade(item)}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          );
        }}
      />

      {/* Answers modal */}
      <Modal visible={showAnswers} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowAnswers(false)}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Answers – {selectedSub?.studentName}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <Text style={styles.answersText}>
                {selectedSub ? JSON.stringify(selectedSub.answers, null, 2) : ''}
              </Text>
            </ScrollView>
            <Button label="Close" onPress={() => setShowAnswers(false)} fullWidth style={{ marginTop: 8 }} />
          </View>
        </Pressable>
      </Modal>

      {/* Grade modal */}
      <Modal visible={showGradeModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowGradeModal(false)}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Grade – {selectedSub?.studentName}</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Marks</Text>
              <TextInput
                style={styles.input}
                value={marksInput}
                onChangeText={setMarksInput}
                keyboardType="number-pad"
                placeholder="e.g. 18"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Feedback (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={feedbackInput}
                onChangeText={setFeedbackInput}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder="Feedback for the student"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button
              label={savingGrade ? 'Saving...' : 'Save Grade'}
              onPress={handleSaveGrade}
              loading={savingGrade}
              fullWidth
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.success, paddingHorizontal: 24, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  errorText: { paddingHorizontal: 16, paddingTop: 8, color: Colors.error, fontFamily: 'Poppins_400Regular', fontSize: 13 },
  rowCard: { marginBottom: 10 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.teacher, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  name: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  meta: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  marksLabel: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: Colors.teacher },
  dateLabel: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textMuted, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  emptyCard: { alignItems: 'center', paddingVertical: 32, marginTop: 20, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: Colors.text },
  emptySub: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: Colors.text, marginBottom: 8 },
  answersText: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.text },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.text, marginBottom: 6 },
  input: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: Colors.text,
  },
  textArea: { height: 100, paddingTop: 10 },
});
