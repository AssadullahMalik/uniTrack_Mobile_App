import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import * as Haptics from 'expo-haptics';

export default function TeacherAssignments() {
  const { currentUser, subjects, assignments, submissions, addAssignment, gradeSubmission } = useApp();
  const insets = useSafeAreaInsets();
  const [showCreate, setShowCreate] = useState(false);
  const [showGrade, setShowGrade] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [totalMarks, setTotalMarks] = useState('20');
  const [subjectId, setSubjectId] = useState('');
  const [gradeMarks, setGradeMarks] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [creating, setCreating] = useState(false);
  const [grading, setGrading] = useState(false);
  const [createError, setCreateError] = useState('');
  const webTop = Platform.OS === 'web' ? 67 : 0;

  const mySubjects = subjects.filter(s => s.teacherId === currentUser?.id);
  const myAssignments = assignments.filter(a => a.teacherId === currentUser?.id);

  const handleCreate = async () => {
    if (!currentUser) return;
    setCreateError('');
    if (mySubjects.length === 0) {
      setCreateError('Create a subject first from the Subjects tab.');
      return;
    }
    if (!title.trim() || !subjectId || !deadline.trim()) {
      setCreateError('Please fill title, subject, and deadline.');
      return;
    }
    setCreating(true);
    try {
      const sub = mySubjects.find(s => s.id === subjectId);
      await addAssignment({
        subjectId,
        subjectName: sub?.name ?? '',
        teacherId: currentUser.id,
        title: title.trim(),
        description: description.trim(),
        deadline: new Date(deadline).toISOString(),
        totalMarks: parseInt(totalMarks) || 20,
      });
      setShowCreate(false);
      setTitle(''); setDescription(''); setDeadline(''); setTotalMarks('20'); setSubjectId('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create assignment. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleGrade = async () => {
    if (!showGrade || !gradeMarks.trim()) return;
    setGrading(true);
    await gradeSubmission(showGrade, parseInt(gradeMarks), gradeFeedback);
    setGrading(false);
    setShowGrade(null);
    setGradeMarks(''); setGradeFeedback('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const selectedSub = showGrade ? submissions.find(s => s.id === showGrade) : null;
  const selectedAsgn = selectedAssignment ? assignments.find(a => a.id === selectedAssignment) : null;
  const asgnSubmissions = selectedAssignment ? submissions.filter(s => s.assignmentId === selectedAssignment) : [];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + webTop + 16 }]}>
        <Text style={styles.headerTitle}>Assignments</Text>
        <Pressable style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <Feather name="plus" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        {myAssignments.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Feather name="file-text" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Assignments</Text>
            <Text style={styles.emptyText}>Create your first assignment</Text>
            <Button label="Create Assignment" onPress={() => setShowCreate(true)} />
          </Card>
        ) : myAssignments.map(a => {
          const subs = submissions.filter(s => s.assignmentId === a.id);
          const graded = subs.filter(s => s.marks !== undefined).length;
          return (
            <Pressable key={a.id} onPress={() => setSelectedAssignment(a.id)}>
              <Card style={styles.assignCard}>
                <View style={styles.assignHeader}>
                  <View style={styles.assignIcon}><Feather name="file-text" size={18} color={Colors.student} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.assignTitle}>{a.title}</Text>
                    <Text style={styles.assignSub}>{a.subjectName}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={Colors.textMuted} />
                </View>
                <View style={styles.assignMeta}>
                  <View style={styles.metaItem}><Feather name="calendar" size={12} color={Colors.textMuted} /><Text style={styles.metaText}>Due: {new Date(a.deadline).toLocaleDateString()}</Text></View>
                  <View style={styles.metaItem}><Feather name="award" size={12} color={Colors.textMuted} /><Text style={styles.metaText}>{a.totalMarks} marks</Text></View>
                  <View style={styles.metaItem}><Feather name="users" size={12} color={Colors.textMuted} /><Text style={styles.metaText}>{subs.length} submitted · {graded} graded</Text></View>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Assignment Detail Modal */}
      <Modal visible={!!selectedAssignment} animationType="slide" presentationStyle="pageSheet">
        {selectedAsgn && (
          <View style={{ flex: 1, backgroundColor: Colors.background }}>
            <View style={[styles.modalHeader, { paddingTop: insets.top + 16 }]}>
              <Pressable style={styles.modalClose} onPress={() => setSelectedAssignment(null)}>
                <Feather name="x" size={22} color={Colors.text} />
              </Pressable>
              <Text style={styles.modalTitle}>Submissions</Text>
              <View style={{ width: 40 }} />
            </View>
            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>
              <Card style={styles.detailInfo}>
                <Text style={styles.detailTitle}>{selectedAsgn.title}</Text>
                <Text style={styles.detailDesc}>{selectedAsgn.description}</Text>
                <View style={styles.detailMetaRow}>
                  <Text style={styles.detailMeta}>Due: {new Date(selectedAsgn.deadline).toLocaleDateString()}</Text>
                  <Text style={styles.detailMeta}>Total: {selectedAsgn.totalMarks} marks</Text>
                </View>
              </Card>
              <Text style={[styles.sectionLabel, { marginBottom: 12 }]}>Student Submissions ({asgnSubmissions.length})</Text>
              {asgnSubmissions.length === 0 ? (
                <Card style={styles.emptySmall}><Text style={styles.emptySmallText}>No submissions yet</Text></Card>
              ) : asgnSubmissions.map(sub => (
                <Card key={sub.id} style={styles.submissionCard}>
                  <View style={styles.submissionHeader}>
                    <View style={styles.subAvatar}><Text style={styles.subAvatarText}>{sub.studentName.charAt(0)}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subName}>{sub.studentName}</Text>
                      <Text style={styles.subTime}>Submitted: {new Date(sub.submittedAt).toLocaleString()}</Text>
                    </View>
                    {sub.marks !== undefined
                      ? <Badge label={`${sub.marks}/${selectedAsgn.totalMarks}`} variant="success" />
                      : <Badge label="Ungraded" variant="warning" />}
                  </View>
                  <Text style={styles.subContent}>{sub.content}</Text>
                  {sub.feedback && <Text style={styles.subFeedback}>Feedback: {sub.feedback}</Text>}
                  {sub.marks === undefined && (
                    <Pressable style={styles.gradeBtn} onPress={() => setShowGrade(sub.id)}>
                      <Feather name="check-circle" size={15} color="#FFFFFF" />
                      <Text style={styles.gradeBtnText}>Grade</Text>
                    </Pressable>
                  )}
                </Card>
              ))}
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Create Assignment Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => { setShowCreate(false); setCreateError(''); }}>
          <View style={[styles.createSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Create Assignment</Text>
            {createError ? (
              <View style={styles.createErrorBox}>
                <Text style={styles.createErrorText}>{createError}</Text>
              </View>
            ) : null}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Subject *</Text>
              {mySubjects.length === 0 ? (
                <Text style={styles.noSubjectsHint}>Create a subject first from the Subjects tab.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 0 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {mySubjects.map(s => (
                      <Pressable key={s.id} style={[styles.subjectChip, subjectId === s.id && styles.subjectChipActive]} onPress={() => setSubjectId(s.id)}>
                        <Text style={[styles.subjectChipText, subjectId === s.id && { color: '#FFFFFF' }]}>{s.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput style={styles.input} placeholder="Assignment title" placeholderTextColor={Colors.textMuted} value={title} onChangeText={setTitle} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, { height: 80 }]} placeholder="Instructions..." placeholderTextColor={Colors.textMuted} value={description} onChangeText={setDescription} multiline textAlignVertical="top" />
            </View>
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.label}>Deadline (YYYY-MM-DD) *</Text>
                <TextInput style={styles.input} placeholder="2026-03-15" placeholderTextColor={Colors.textMuted} value={deadline} onChangeText={setDeadline} />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Marks</Text>
                <TextInput style={styles.input} placeholder="20" placeholderTextColor={Colors.textMuted} value={totalMarks} onChangeText={setTotalMarks} keyboardType="number-pad" />
              </View>
            </View>
            <Button
              label="Create Assignment"
              onPress={handleCreate}
              loading={creating}
              fullWidth
              disabled={mySubjects.length === 0}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Grade Modal */}
      <Modal visible={!!showGrade} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowGrade(null)}>
          <View style={[styles.createSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Grade Submission</Text>
            <Text style={styles.gradeName}>{selectedSub?.studentName}</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Marks</Text>
              <TextInput style={styles.input} placeholder="e.g. 18" placeholderTextColor={Colors.textMuted} value={gradeMarks} onChangeText={setGradeMarks} keyboardType="number-pad" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Feedback (optional)</Text>
              <TextInput style={[styles.input, { height: 70 }]} placeholder="Your feedback..." placeholderTextColor={Colors.textMuted} value={gradeFeedback} onChangeText={setGradeFeedback} multiline textAlignVertical="top" />
            </View>
            <Button label="Save Grade" onPress={handleGrade} loading={grading} fullWidth variant="secondary" />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.student, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  createBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  assignCard: { marginBottom: 12 },
  assignHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  assignIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.student + '15', alignItems: 'center', justifyContent: 'center' },
  assignTitle: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  assignSub: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  assignMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 16, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: Colors.text },
  emptyText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: Colors.text },
  detailInfo: { marginBottom: 16 },
  detailTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: Colors.text, marginBottom: 8 },
  detailDesc: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, lineHeight: 20, marginBottom: 10 },
  detailMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailMeta: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: Colors.textSecondary },
  sectionLabel: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: Colors.text },
  submissionCard: { marginBottom: 10 },
  submissionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  subAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.student, alignItems: 'center', justifyContent: 'center' },
  subAvatarText: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  subName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  subTime: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textMuted },
  subContent: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, lineHeight: 20, marginBottom: 10 },
  subFeedback: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.success, marginBottom: 8 },
  gradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.success, borderRadius: 8, padding: 10 },
  gradeBtnText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  createSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 10 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: Colors.text },
  gradeName: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: Colors.textSecondary },
  inputGroup: { },
  label: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.text, marginBottom: 6 },
  input: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, height: 48, fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.text },
  rowInputs: { flexDirection: 'row', gap: 12 },
  subjectChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  subjectChipActive: { borderColor: Colors.student, backgroundColor: Colors.student },
  subjectChipText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.textSecondary },
  emptySmall: { alignItems: 'center', padding: 24 },
  emptySmallText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textMuted },
  createErrorBox: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, marginBottom: 8 },
  createErrorText: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.error },
  noSubjectsHint: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.textMuted, marginBottom: 8 },
});
