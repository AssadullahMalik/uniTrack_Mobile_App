import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import * as Haptics from 'expo-haptics';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Due Today';
  if (diff === 1) return 'Due Tomorrow';
  return `${diff} days left`;
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function StudentHome() {
  const { currentUser, subjects, assignments, tests, presentations, submissions, logout } = useApp();
  const insets = useSafeAreaInsets();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const mySubjects = subjects.filter(s => s.enrolledStudents.includes(currentUser?.id ?? ''));
  const myAssignments = assignments.filter(a => mySubjects.find(s => s.id === a.subjectId));
  const myTests = tests.filter(t => mySubjects.find(s => s.id === t.subjectId));
  const myPresentations = presentations.filter(p => mySubjects.find(s => s.id === p.subjectId));

  const pendingAssignments = myAssignments.filter(a => {
    const submitted = submissions.find(s => s.assignmentId === a.id && s.studentId === currentUser?.id);
    return !submitted && new Date(a.deadline) > new Date();
  });
  const upcomingTests = myTests.filter(t => new Date(t.scheduledAt) > new Date()).slice(0, 3);
  const upcomingPresentations = myPresentations.filter(p => new Date(p.scheduledAt) > new Date()).slice(0, 3);

  const handleLogout = async () => {
    await logout();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(auth)/login');
  };

  const webTopPad = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={[styles.header, { paddingTop: insets.top + webTopPad + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Good Day,</Text>
            <Text style={styles.userName}>{currentUser?.name?.split(' ')[0]} 👋</Text>
          </View>
          <Pressable style={styles.avatarBtn} onPress={() => setShowProfileModal(true)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{currentUser?.name?.charAt(0).toUpperCase()}</Text>
            </View>
          </Pressable>
        </View>
        <View style={styles.infoRow}>
          {currentUser?.rollNumber && <View style={styles.infoPill}><Feather name="hash" size={12} color="rgba(255,255,255,0.8)" /><Text style={styles.infoPillText}>{currentUser.rollNumber}</Text></View>}
          {currentUser?.semester && <View style={styles.infoPill}><Feather name="layers" size={12} color="rgba(255,255,255,0.8)" /><Text style={styles.infoPillText}>Semester {currentUser.semester}</Text></View>}
          {currentUser?.department && <View style={styles.infoPill}><Feather name="cpu" size={12} color="rgba(255,255,255,0.8)" /><Text style={styles.infoPillText}>{currentUser.department}</Text></View>}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{mySubjects.length}</Text>
            <Text style={styles.statLabel}>Subjects</Text>
          </View>
          <View style={[styles.statCard, styles.statDivider]}>
            <Text style={styles.statNum}>{pendingAssignments.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{upcomingTests.length}</Text>
            <Text style={styles.statLabel}>Tests</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {pendingAssignments.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Assignments</Text>
              <Pressable onPress={() => router.push('/(student)/subjects')}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {pendingAssignments.slice(0, 3).map(a => {
              const diffMs = new Date(a.deadline).getTime() - Date.now();
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              const isUrgent = diffDays <= 1;
              return (
                <Card key={a.id} style={styles.assignCard}>
                  <View style={styles.assignRow}>
                    <View style={[styles.assignDot, { backgroundColor: isUrgent ? Colors.error : Colors.accent }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.assignTitle}>{a.title}</Text>
                      <Text style={styles.assignSub}>{a.subjectName}</Text>
                    </View>
                    <View style={styles.assignRight}>
                      <Text style={[styles.assignDeadline, { color: isUrgent ? Colors.error : Colors.textSecondary }]}>{formatDate(a.deadline)}</Text>
                      <Text style={styles.assignMarks}>{a.totalMarks} marks</Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {upcomingTests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Tests</Text>
              <Pressable onPress={() => router.push('/(student)/tests')}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {upcomingTests.map(t => (
              <Card key={t.id} style={styles.testCard}>
                <View style={styles.testRow}>
                  <View style={styles.testIconBox}>
                    <Feather name="edit-3" size={20} color={Colors.teacher} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.testTitle}>{t.title}</Text>
                    <Text style={styles.testSub}>{t.subjectName}</Text>
                    <Text style={styles.testTime}>{formatDateShort(t.scheduledAt)}</Text>
                  </View>
                  <View>
                    <Text style={styles.testDuration}>{t.duration}m</Text>
                    <Text style={styles.testMarks}>{t.totalMarks} marks</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {upcomingPresentations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Presentations</Text>
            {upcomingPresentations.map(p => (
              <Card key={p.id} style={styles.presCard}>
                <View style={styles.presRow}>
                  <View style={styles.presIconBox}>
                    <Feather name="monitor" size={20} color={Colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.presTitle}>{p.title}</Text>
                    <Text style={styles.presSub}>{p.subjectName}</Text>
                    <View style={styles.presDetails}>
                      <Feather name="map-pin" size={12} color={Colors.textMuted} />
                      <Text style={styles.presVenue}>{p.venue}</Text>
                      <Feather name="clock" size={12} color={Colors.textMuted} />
                      <Text style={styles.presVenue}>{formatDateShort(p.scheduledAt)}</Text>
                    </View>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {mySubjects.length === 0 && (
          <Card style={styles.emptyCard}>
            <Feather name="book-open" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Subjects Yet</Text>
            <Text style={styles.emptyText}>Go to Subjects tab to enroll in courses</Text>
          </Card>
        )}
      </ScrollView>

      <Modal visible={showProfileModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowProfileModal(false)}>
          <View style={[styles.profileSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>{currentUser?.name?.charAt(0)}</Text>
              </View>
              <Text style={styles.profileName}>{currentUser?.name}</Text>
              <Text style={styles.profileEmail}>{currentUser?.email}</Text>
              <Badge label="Student" variant="student" />
            </View>
            <View style={styles.profileInfo}>
              {currentUser?.department && <View style={styles.profileRow}><Feather name="cpu" size={16} color={Colors.textSecondary} /><Text style={styles.profileRowText}>{currentUser.department}</Text></View>}
              {currentUser?.rollNumber && <View style={styles.profileRow}><Feather name="hash" size={16} color={Colors.textSecondary} /><Text style={styles.profileRowText}>Roll No: {currentUser.rollNumber}</Text></View>}
              {currentUser?.semester && <View style={styles.profileRow}><Feather name="layers" size={16} color={Colors.textSecondary} /><Text style={styles.profileRowText}>Semester {currentUser.semester}</Text></View>}
            </View>
            <Pressable style={styles.logoutBtn} onPress={() => { setShowProfileModal(false); router.push('/profile'); }}>
              <Feather name="user" size={18} color={Colors.student} />
              <Text style={styles.logoutText}>Edit Profile</Text>
            </Pressable>
            <Pressable style={[styles.logoutBtn, { marginTop: 8 }]} onPress={handleLogout}>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  greeting: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.7)' },
  userName: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', marginTop: 2 },
  avatarBtn: {},
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  infoPillText: { fontSize: 11, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.85)' },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden' },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statDivider: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  statNum: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: Colors.accent },
  statLabel: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: Colors.text, marginBottom: 12 },
  seeAll: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.accent },
  assignCard: { marginBottom: 8 },
  assignRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  assignDot: { width: 4, height: 40, borderRadius: 2 },
  assignTitle: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  assignSub: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, marginTop: 2 },
  assignRight: { alignItems: 'flex-end' },
  assignDeadline: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  assignMarks: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textMuted, marginTop: 2 },
  testCard: { marginBottom: 8 },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  testIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.teacher + '15', alignItems: 'center', justifyContent: 'center' },
  testTitle: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  testSub: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  testTime: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textMuted, marginTop: 2 },
  testDuration: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: Colors.teacher, textAlign: 'right' },
  testMarks: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textMuted, textAlign: 'right' },
  presCard: { marginBottom: 8 },
  presRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  presIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.success + '15', alignItems: 'center', justifyContent: 'center' },
  presTitle: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  presSub: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  presDetails: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  presVenue: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textMuted },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: Colors.text },
  emptyText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  profileSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 24, gap: 8 },
  profileAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.student, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 28, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  profileName: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: Colors.text },
  profileEmail: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  profileInfo: { gap: 12, marginBottom: 24 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileRowText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.text },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.error + '30', backgroundColor: Colors.error + '08' },
  logoutText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: Colors.error },
});
