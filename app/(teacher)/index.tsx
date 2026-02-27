import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import * as Haptics from 'expo-haptics';

export default function TeacherDashboard() {
  const { currentUser, subjects, assignments, submissions, tests, presentations, users, logout } = useApp();
  const insets = useSafeAreaInsets();
  const [showProfile, setShowProfile] = useState(false);
  const webTop = Platform.OS === 'web' ? 67 : 0;

  const mySubjects = subjects.filter(s => s.teacherId === currentUser?.id);
  const myAssignments = assignments.filter(a => a.teacherId === currentUser?.id);
  const myTests = tests.filter(t => t.teacherId === currentUser?.id);
  const myPresentations = presentations.filter(p => p.teacherId === currentUser?.id);
  const pendingGrading = submissions.filter(s =>
    myAssignments.find(a => a.id === s.assignmentId) && s.marks === undefined
  );

  const totalStudents = new Set(mySubjects.flatMap(s => s.enrolledStudents)).size;

  const handleLogout = async () => {
    await logout();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(auth)/login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient colors={[Colors.teacher, '#9333EA', '#7C3AED']} style={[styles.header, { paddingTop: insets.top + webTop + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Teacher Panel</Text>
            <Text style={styles.name}>{currentUser?.name}</Text>
          </View>
          <Pressable onPress={() => setShowProfile(true)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{currentUser?.name?.charAt(0)}</Text>
            </View>
          </Pressable>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statNum}>{mySubjects.length}</Text><Text style={styles.statLabel}>Subjects</Text></View>
          <View style={[styles.statCard, styles.statDiv]}><Text style={styles.statNum}>{totalStudents}</Text><Text style={styles.statLabel}>Students</Text></View>
          <View style={[styles.statCard, styles.statDiv]}><Text style={styles.statNum}>{pendingGrading.length}</Text><Text style={styles.statLabel}>To Grade</Text></View>
          <View style={[styles.statCard, styles.statDiv]}><Text style={styles.statNum}>{myTests.length}</Text><Text style={styles.statLabel}>Tests</Text></View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { icon: 'book', label: 'Subjects', route: '/(teacher)/subjects', color: Colors.teacher },
              { icon: 'file-text', label: 'Assignments', route: '/(teacher)/assignments', color: Colors.student },
              { icon: 'edit-3', label: 'Tests', route: '/(teacher)/tests', color: Colors.success },
              { icon: 'monitor', label: 'Presentations', route: '/(teacher)/tests', color: Colors.accent },
            ].map(action => (
              <Pressable key={action.label} style={styles.actionCard} onPress={() => router.push(action.route as any)}>
                <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                  <Feather name={action.icon as any} size={22} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {pendingGrading.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Grading</Text>
              <Badge label={`${pendingGrading.length}`} variant="warning" />
            </View>
            {pendingGrading.slice(0, 3).map(sub => {
              const asgn = myAssignments.find(a => a.id === sub.assignmentId);
              return (
                <Card key={sub.id} style={styles.gradingCard}>
                  <View style={styles.gradingRow}>
                    <View style={styles.gradingIcon}>
                      <Feather name="user" size={16} color={Colors.teacher} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gradingStudent}>{sub.studentName}</Text>
                      <Text style={styles.gradingAssign}>{asgn?.title}</Text>
                    </View>
                    <Pressable style={styles.gradeBtn} onPress={() => router.push('/(teacher)/assignments' as any)}>
                      <Text style={styles.gradeBtnText}>Grade</Text>
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Subjects</Text>
          {mySubjects.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Feather name="book-open" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No subjects yet. Create your first subject!</Text>
            </Card>
          ) : mySubjects.slice(0, 3).map(sub => (
            <Card key={sub.id} style={styles.subCard}>
              <View style={styles.subRow}>
                <View style={styles.subIcon}><Feather name="book" size={18} color={Colors.teacher} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subName}>{sub.name}</Text>
                  <Text style={styles.subMeta}>{sub.code} · {sub.enrolledStudents.length} students</Text>
                </View>
                <Badge label={`Sem ${sub.semester}`} variant="teacher" />
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Presentations</Text>
          {myPresentations.filter(p => new Date(p.scheduledAt) > new Date()).length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No upcoming presentations</Text>
            </Card>
          ) : myPresentations.filter(p => new Date(p.scheduledAt) > new Date()).slice(0, 2).map(p => (
            <Card key={p.id} style={styles.presCard}>
              <View style={styles.presRow}>
                <View style={styles.presIcon}><Feather name="monitor" size={18} color={Colors.success} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.presTitle}>{p.title}</Text>
                  <Text style={styles.presMeta}>{p.subjectName} · {p.venue}</Text>
                  <Text style={styles.presDate}>{new Date(p.scheduledAt).toLocaleDateString()}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>

      <Modal visible={showProfile} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowProfile(false)}>
          <View style={[styles.profileSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.profileHeader}>
              <View style={[styles.profileAvatar, { backgroundColor: Colors.teacher }]}>
                <Text style={styles.profileAvatarText}>{currentUser?.name?.charAt(0)}</Text>
              </View>
              <Text style={styles.profileName}>{currentUser?.name}</Text>
              <Text style={styles.profileEmail}>{currentUser?.email}</Text>
              <Badge label="Teacher" variant="teacher" />
            </View>
            <Pressable style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={18} color={Colors.error} />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.7)' },
  name: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statDiv: { borderLeftWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  statNum: { fontSize: 22, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  statLabel: { fontSize: 10, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  quickActions: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: Colors.text, marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', gap: 10 },
  actionCard: { flex: 1, alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.cardBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: Colors.text, textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  gradingCard: { marginBottom: 8 },
  gradingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gradingIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.teacher + '15', alignItems: 'center', justifyContent: 'center' },
  gradingStudent: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  gradingAssign: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, marginTop: 2 },
  gradeBtn: { backgroundColor: Colors.teacher, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  gradeBtnText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  subCard: { marginBottom: 8 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.teacher + '15', alignItems: 'center', justifyContent: 'center' },
  subName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  subMeta: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, marginTop: 2 },
  presCard: { marginBottom: 8 },
  presRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  presIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.success + '15', alignItems: 'center', justifyContent: 'center' },
  presTitle: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  presMeta: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  presDate: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textMuted, marginTop: 2 },
  emptyCard: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  profileSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20 },
  profileHeader: { alignItems: 'center', gap: 8, marginBottom: 24 },
  profileAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 28, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  profileName: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: Colors.text },
  profileEmail: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.error + '30', backgroundColor: Colors.error + '08' },
  logoutText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: Colors.error },
});
