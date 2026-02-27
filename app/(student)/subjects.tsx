import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import * as Haptics from 'expo-haptics';

function MarksBar({ obtained, total, color }: { obtained: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((obtained / total) * 100, 100) : 0;
  return (
    <View style={mbStyles.container}>
      <View style={mbStyles.track}>
        <View style={[mbStyles.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[mbStyles.label, { color }]}>{obtained}/{total}</Text>
    </View>
  );
}
const mbStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  fill: { height: 6, borderRadius: 3 },
  label: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', minWidth: 36 },
});

export default function StudentSubjects() {
  const { currentUser, subjects, assignments, submissions, getStudentMarks, enrollInSubject, unenrollFromSubject } = useApp();
  const insets = useSafeAreaInsets();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { submitAssignment } = useApp();

  const mySubjects = subjects.filter(s => s.enrolledStudents.includes(currentUser?.id ?? ''));
  const allOtherSubjects = subjects.filter(s => !s.enrolledStudents.includes(currentUser?.id ?? ''));
  const webTop = Platform.OS === 'web' ? 67 : 0;

  const handleEnroll = async (subjectId: string) => {
    if (!currentUser) return;
    await enrollInSubject(subjectId, currentUser.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleUnenroll = async (subjectId: string) => {
    if (!currentUser) return;
    await unenrollFromSubject(subjectId, currentUser.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSubmitAssignment = async () => {
    if (!currentUser || !selectedAssignment || !submissionText.trim()) return;
    setSubmitting(true);
    const asgn = assignments.find(a => a.id === selectedAssignment);
    await submitAssignment({
      assignmentId: selectedAssignment,
      studentId: currentUser.id,
      studentName: currentUser.name,
      content: submissionText.trim(),
    });
    setSubmitting(false);
    setSubmissionText('');
    setShowAssignModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const selected = selectedSubject ? subjects.find(s => s.id === selectedSubject) : null;
  const subjectAssignments = selectedSubject ? assignments.filter(a => a.subjectId === selectedSubject) : [];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + webTop + 16 }]}>
        <Text style={styles.headerTitle}>My Subjects</Text>
        <Text style={styles.headerSub}>{mySubjects.length} enrolled</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        {mySubjects.map(sub => {
          const marks = currentUser ? getStudentMarks(currentUser.id, sub.id) : null;
          const pct = marks && marks.total > 0 ? Math.round((marks.obtained / marks.total) * 100) : 0;
          return (
            <Pressable key={sub.id} onPress={() => setSelectedSubject(sub.id)}>
              <Card style={styles.subjectCard}>
                <View style={styles.subjectHeader}>
                  <View style={styles.subjectIcon}>
                    <Feather name="book" size={20} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectName}>{sub.name}</Text>
                    <Text style={styles.subjectCode}>{sub.code} · {sub.creditHours} credits</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={Colors.textMuted} />
                </View>
                <View style={styles.subjectTeacher}>
                  <Feather name="user" size={13} color={Colors.textMuted} />
                  <Text style={styles.teacherName}>{sub.teacherName}</Text>
                </View>
                {marks && marks.total > 0 && (
                  <View style={styles.marksPreview}>
                    <Text style={styles.marksPreviewLabel}>Sessional Progress</Text>
                    <View style={styles.progressRow}>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
                      </View>
                      <Text style={styles.progressPct}>{pct}%</Text>
                    </View>
                  </View>
                )}
              </Card>
            </Pressable>
          );
        })}

        {allOtherSubjects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Subjects</Text>
            {allOtherSubjects.map(sub => (
              <Card key={sub.id} style={styles.availableCard}>
                <View style={styles.availableRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectName}>{sub.name}</Text>
                    <Text style={styles.subjectCode}>{sub.code} · {sub.department}</Text>
                    <Text style={styles.teacherSmall}>{sub.teacherName}</Text>
                  </View>
                  <Pressable style={styles.enrollBtn} onPress={() => handleEnroll(sub.id)}>
                    <Text style={styles.enrollBtnText}>Enroll</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        )}

        {mySubjects.length === 0 && allOtherSubjects.length === 0 && (
          <Card style={styles.emptyCard}>
            <Feather name="book-open" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Subjects Available</Text>
            <Text style={styles.emptyText}>Subjects will appear once teachers create them</Text>
          </Card>
        )}
      </ScrollView>

      {/* Subject Detail Modal */}
      <Modal visible={!!selectedSubject} animationType="slide" presentationStyle="pageSheet">
        {selected && (
          <View style={{ flex: 1, backgroundColor: Colors.background }}>
            <View style={[styles.modalHeader, { paddingTop: insets.top + 16 }]}>
              <Pressable style={styles.modalClose} onPress={() => setSelectedSubject(null)}>
                <Feather name="x" size={22} color={Colors.text} />
              </Pressable>
              <Text style={styles.modalTitle}>{selected.name}</Text>
              <View style={{ width: 40 }} />
            </View>
            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
              <Card style={styles.detailCard}>
                <Text style={styles.detailLabel}>Course Info</Text>
                <View style={styles.detailRow}><Feather name="hash" size={14} color={Colors.textSecondary} /><Text style={styles.detailVal}>{selected.code}</Text></View>
                <View style={styles.detailRow}><Feather name="user" size={14} color={Colors.textSecondary} /><Text style={styles.detailVal}>{selected.teacherName}</Text></View>
                <View style={styles.detailRow}><Feather name="layers" size={14} color={Colors.textSecondary} /><Text style={styles.detailVal}>Semester {selected.semester}</Text></View>
                <View style={styles.detailRow}><Feather name="book" size={14} color={Colors.textSecondary} /><Text style={styles.detailVal}>{selected.creditHours} Credit Hours</Text></View>
                <View style={styles.detailRow}><Feather name="users" size={14} color={Colors.textSecondary} /><Text style={styles.detailVal}>{selected.enrolledStudents.length} Students</Text></View>
              </Card>

              {currentUser && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Marks Breakdown</Text>
                  {(() => {
                    const m = getStudentMarks(currentUser.id, selected.id);
                    return (
                      <View style={{ gap: 12 }}>
                        <View>
                          <Text style={styles.marksCategory}>Assignments</Text>
                          <MarksBar obtained={m.assignmentObtained} total={m.assignmentTotal} color={Colors.student} />
                        </View>
                        <View>
                          <Text style={styles.marksCategory}>Tests</Text>
                          <MarksBar obtained={m.testObtained} total={m.testTotal} color={Colors.teacher} />
                        </View>
                        <View>
                          <Text style={styles.marksCategory}>Presentations</Text>
                          <MarksBar obtained={m.presentationObtained} total={m.presentationTotal} color={Colors.cr} />
                        </View>
                        <View style={styles.totalMarks}>
                          <Text style={styles.totalLabel}>Total Sessional</Text>
                          <Text style={styles.totalValue}>{m.obtained}/{m.total} marks</Text>
                        </View>
                      </View>
                    );
                  })()}
                </Card>
              )}

              <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Assignments</Text>
              {subjectAssignments.length === 0 ? (
                <Card style={styles.emptySmall}><Text style={styles.emptySmallText}>No assignments yet</Text></Card>
              ) : subjectAssignments.map(a => {
                const mySubmission = submissions.find(s => s.assignmentId === a.id && s.studentId === currentUser?.id);
                return (
                  <Card key={a.id} style={styles.assignCard2}>
                    <View style={styles.assignHeader}>
                      <Text style={styles.assignTitle2}>{a.title}</Text>
                      {mySubmission ? (
                        mySubmission.marks !== undefined
                          ? <Badge label={`${mySubmission.marks}/${a.totalMarks}`} variant="success" />
                          : <Badge label="Submitted" variant="info" />
                      ) : <Badge label="Pending" variant="warning" />}
                    </View>
                    <Text style={styles.assignDesc}>{a.description}</Text>
                    <View style={styles.assignFooter}>
                      <Text style={styles.assignDeadline2}>Due: {new Date(a.deadline).toLocaleDateString()}</Text>
                      {!mySubmission && (
                        <Pressable style={styles.submitBtn} onPress={() => { setSelectedAssignment(a.id); setShowAssignModal(true); }}>
                          <Text style={styles.submitBtnText}>Submit</Text>
                        </Pressable>
                      )}
                      {mySubmission?.feedback && (
                        <Text style={styles.feedbackText}>Feedback: {mySubmission.feedback}</Text>
                      )}
                    </View>
                  </Card>
                );
              })}

              <Pressable style={styles.unenrollBtn} onPress={() => { handleUnenroll(selected.id); setSelectedSubject(null); }}>
                <Feather name="user-minus" size={16} color={Colors.error} />
                <Text style={styles.unenrollText}>Unenroll from Subject</Text>
              </Pressable>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Submit Assignment Modal */}
      <Modal visible={showAssignModal} transparent animationType="slide">
        <Pressable style={styles.sheetOverlay} onPress={() => setShowAssignModal(false)}>
          <View style={[styles.submitSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle2} />
            <Text style={styles.sheetTitle}>Submit Assignment</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={6}
              placeholder="Write your answer or paste your submission content here..."
              placeholderTextColor={Colors.textMuted}
              value={submissionText}
              onChangeText={setSubmissionText}
              textAlignVertical="top"
            />
            <Button label="Submit Assignment" onPress={handleSubmitAssignment} loading={submitting} fullWidth />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingBottom: 20 },
  headerTitle: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  headerSub: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  subjectCard: { marginBottom: 12 },
  subjectHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  subjectIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary + '12', alignItems: 'center', justifyContent: 'center' },
  subjectName: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  subjectCode: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, marginTop: 2 },
  subjectTeacher: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  teacherName: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  marksPreview: {},
  marksPreviewLabel: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', color: Colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  progressPct: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: Colors.accent, minWidth: 32 },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: Colors.text, marginBottom: 12 },
  availableCard: { marginBottom: 10 },
  availableRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  teacherSmall: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textMuted, marginTop: 2 },
  enrollBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  enrollBtnText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: Colors.text },
  emptyText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, textAlign: 'center' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: Colors.text },
  detailCard: { marginBottom: 16, gap: 10 },
  detailLabel: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailVal: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.text },
  marksCategory: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.textSecondary, marginBottom: 6 },
  totalMarks: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  totalLabel: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: Colors.text },
  totalValue: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: Colors.accent },
  assignCard2: { marginBottom: 10 },
  assignHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  assignTitle2: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.text, flex: 1, marginRight: 8 },
  assignDesc: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, lineHeight: 20, marginBottom: 10 },
  assignFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assignDeadline2: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textMuted },
  submitBtn: { backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  submitBtnText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  feedbackText: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.success, flex: 1, marginLeft: 8 },
  unenrollBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.error + '30', backgroundColor: Colors.error + '08', marginTop: 16 },
  unenrollText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.error },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  submitSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 },
  sheetHandle2: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: Colors.text },
  textArea: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, padding: 14, fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.text, minHeight: 120 },
  emptySmall: { alignItems: 'center', padding: 24 },
  emptySmallText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textMuted },
});
