import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import * as Haptics from 'expo-haptics';
import { subscribeEnrollmentsForTeacher, type Enrollment } from '@/src/services/enrollments';

const DEPARTMENTS = ['Computer Science', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Software Engineering'];

export default function TeacherSubjects() {
  const { currentUser, subjects, users, addSubject, getStudentMarks } = useApp();
  const insets = useSafeAreaInsets();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const department = DEPARTMENTS[0];
  const [semester, setSemester] = useState('6');
  const [credits, setCredits] = useState('3');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const webTop = Platform.OS === 'web' ? 67 : 0;

  const mySubjects = subjects.filter(s => s.teacherId === currentUser?.id);
  const selected = selectedSubject ? subjects.find(s => s.id === selectedSubject) : null;

  const [myEnrollments, setMyEnrollments] = useState<Enrollment[]>([]);
  const currentUserId = currentUser?.id;
  useEffect(() => {
    if (!currentUserId) return;
    const unsub = subscribeEnrollmentsForTeacher(
      currentUserId,
      rows => setMyEnrollments(rows),
      err => console.error('enrollments teacher snapshot error', err),
    );
    return () => unsub();
  }, [currentUserId]);

  const countBySubjectId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of myEnrollments) {
      map[e.subjectId] = (map[e.subjectId] ?? 0) + 1;
    }
    return map;
  }, [myEnrollments]);

  const handleCreate = async () => {
    if (!currentUser || !name.trim() || !code.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      await addSubject({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        department,
        semester,
        teacherId: currentUser.id,
        teacherName: currentUser.name,
        creditHours: parseInt(credits) || 3,
        enrolledStudents: [],
      });
      setShowCreate(false);
      setName(''); setCode(''); setCredits('3');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create subject. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + webTop + 16 }]}>
        <Text style={styles.headerTitle}>My Subjects</Text>
        <Pressable style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <Feather name="plus" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        {mySubjects.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Feather name="book-open" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Subjects Yet</Text>
            <Text style={styles.emptyText}>Tap + to create your first subject</Text>
            <Button label="Create Subject" onPress={() => setShowCreate(true)} />
          </Card>
        ) : mySubjects.map(sub => (
          <Pressable key={sub.id} onPress={() => setSelectedSubject(sub.id)}>
            <Card style={styles.subjectCard}>
              <View style={styles.subjectHeader}>
                <View style={styles.subjectIcon}><Feather name="book" size={20} color={Colors.teacher} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectName}>{sub.name}</Text>
                  <Text style={styles.subjectCode}>{sub.code}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={Colors.textMuted} />
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}><Feather name="users" size={13} color={Colors.textMuted} /><Text style={styles.metaText}>{countBySubjectId[sub.id] ?? 0} students</Text></View>
                <View style={styles.metaItem}><Feather name="layers" size={13} color={Colors.textMuted} /><Text style={styles.metaText}>Sem {sub.semester}</Text></View>
                <View style={styles.metaItem}><Feather name="book" size={13} color={Colors.textMuted} /><Text style={styles.metaText}>{sub.creditHours} credits</Text></View>
              </View>
            </Card>
          </Pressable>
        ))}
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
            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>
              <Card style={styles.detailCard}>
                <Text style={styles.detailLabel}>Subject Details</Text>
                <View style={styles.detailRow}><Feather name="hash" size={14} color={Colors.textSecondary} /><Text style={styles.detailVal}>{selected.code}</Text></View>
                <View style={styles.detailRow}><Feather name="layers" size={14} color={Colors.textSecondary} /><Text style={styles.detailVal}>Semester {selected.semester} · {selected.department}</Text></View>
                <View style={styles.detailRow}><Feather name="book" size={14} color={Colors.textSecondary} /><Text style={styles.detailVal}>{selected.creditHours} Credit Hours</Text></View>
                <View style={styles.detailRow}><Feather name="users" size={14} color={Colors.textSecondary} /><Text style={styles.detailVal}>{countBySubjectId[selected.id] ?? 0} Enrolled Students</Text></View>
              </Card>

              {(countBySubjectId[selected.id] ?? 0) > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { marginBottom: 12 }]}>Enrolled Students</Text>
                  {myEnrollments.filter(e => e.subjectId === selected.id).map(e => {
                    const sid = e.studentId;
                    const student = users.find(u => u.id === sid);
                    if (!student) return null;
                    const marks = getStudentMarks(sid, selected.id);
                    const pct = marks.total > 0 ? Math.round((marks.obtained / marks.total) * 100) : 0;
                    return (
                      <Card key={e.id} style={styles.studentCard}>
                        <View style={styles.studentRow}>
                          <View style={styles.studentAvatar}>
                            <Text style={styles.studentAvatarText}>{student.name.charAt(0)}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.studentName}>{student.name}</Text>
                            {student.rollNumber && <Text style={styles.studentRoll}>{student.rollNumber}</Text>}
                          </View>
                          <View style={styles.marksRight}>
                            <Text style={styles.marksNum}>{marks.obtained}/{marks.total}</Text>
                            <Text style={styles.marksPct}>{pct}%</Text>
                          </View>
                        </View>
                      </Card>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Create Subject Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowCreate(false)}>
          <View style={[styles.createSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Create Subject</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Subject Name *</Text>
              <TextInput style={styles.input} placeholder="e.g. Software Engineering" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Subject Code *</Text>
              <TextInput style={styles.input} placeholder="e.g. SE-401" placeholderTextColor={Colors.textMuted} value={code} onChangeText={setCode} autoCapitalize="characters" />
            </View>
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Semester</Text>
                <TextInput style={styles.input} placeholder="6" placeholderTextColor={Colors.textMuted} value={semester} onChangeText={setSemester} keyboardType="number-pad" maxLength={1} />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Credits</Text>
                <TextInput style={styles.input} placeholder="3" placeholderTextColor={Colors.textMuted} value={credits} onChangeText={setCredits} keyboardType="number-pad" maxLength={1} />
              </View>
            </View>
            <Button label="Create Subject" onPress={handleCreate} loading={creating} fullWidth />
            {createError ? <Text style={styles.createErrorText}>{createError}</Text> : null}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.teacher, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  createBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  subjectCard: { marginBottom: 12 },
  subjectHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  subjectIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.teacher + '15', alignItems: 'center', justifyContent: 'center' },
  subjectName: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  subjectCode: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 16, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: Colors.text },
  emptyText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: Colors.text },
  detailCard: { marginBottom: 16, gap: 10 },
  detailLabel: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailVal: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.text },
  sectionLabel: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: Colors.text },
  studentCard: { marginBottom: 8 },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  studentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.student, alignItems: 'center', justifyContent: 'center' },
  studentAvatarText: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  studentName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  studentRoll: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  marksRight: { alignItems: 'flex-end' },
  marksNum: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: Colors.accent },
  marksPct: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  createSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: Colors.text, marginBottom: 4 },
  inputGroup: { marginBottom: 4 },
  label: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.text, marginBottom: 6 },
  input: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, height: 48, fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.text },
  rowInputs: { flexDirection: 'row', gap: 12 },
  createErrorText: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.error, textAlign: 'center' },
});
