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

export default function CRHome() {
  const { currentUser, subjects, assignments, tests, presentations, logout } = useApp();
  const insets = useSafeAreaInsets();
  const [showProfile, setShowProfile] = useState(false);
  const webTop = Platform.OS === 'web' ? 67 : 0;

  const mySubjects = subjects.filter(s => s.enrolledStudents.includes(currentUser?.id ?? ''));
  const myAssignments = assignments.filter(a => mySubjects.find(s => s.id === a.subjectId));
  const myTests = tests.filter(t => mySubjects.find(s => s.id === t.subjectId));
  const myPresentations = presentations.filter(p => mySubjects.find(s => s.id === p.subjectId));

  const upcomingTests = myTests.filter(t => new Date(t.scheduledAt) > new Date());
  const upcomingPresentations = myPresentations.filter(p => new Date(p.scheduledAt) > new Date());
  const pendingAssignments = myAssignments.filter(a => new Date(a.deadline) > new Date());

  const handleLogout = async () => {
    await logout();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(auth)/login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient colors={[Colors.cr, '#047857', '#065F46']} style={[styles.header, { paddingTop: insets.top + webTop + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>CR Panel</Text>
            <Text style={styles.name}>{currentUser?.name}</Text>
            <View style={styles.rolePill}>
              <Feather name="star" size={12} color={Colors.accent} />
              <Text style={styles.roleText}>Class Representative</Text>
            </View>
          </View>
          <Pressable onPress={() => setShowProfile(true)}>
            <View style={[styles.avatar, { backgroundColor: Colors.accent }]}>
              <Text style={styles.avatarText}>{currentUser?.name?.charAt(0)}</Text>
            </View>
          </Pressable>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statNum}>{mySubjects.length}</Text><Text style={styles.statLabel}>Subjects</Text></View>
          <View style={[styles.statCard, styles.statDiv]}><Text style={styles.statNum}>{pendingAssignments.length}</Text><Text style={styles.statLabel}>Assignments</Text></View>
          <View style={[styles.statCard, styles.statDiv]}><Text style={styles.statNum}>{upcomingTests.length}</Text><Text style={styles.statLabel}>Tests</Text></View>
          <View style={[styles.statCard, styles.statDiv]}><Text style={styles.statNum}>{upcomingPresentations.length}</Text><Text style={styles.statLabel}>Presentations</Text></View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CR Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { icon: 'megaphone', label: 'Announce', route: '/(cr)/announcements', color: Colors.cr },
              { icon: 'calendar', label: 'Schedule', route: '/(cr)/schedule', color: Colors.accent },
              { icon: 'bell', label: 'Notify Class', desc: 'Manage reminders', color: Colors.student },
            ].map(action => (
              <Pressable key={action.label} style={styles.actionCard} onPress={() => 'route' in action && router.push(action.route as any)}>
                <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                  <Feather name={action.icon as any} size={22} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {upcomingTests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Tests</Text>
            {upcomingTests.slice(0, 3).map(t => (
              <Card key={t.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <View style={[styles.itemIcon, { backgroundColor: Colors.teacher + '15' }]}><Feather name="edit-3" size={18} color={Colors.teacher} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{t.title}</Text>
                    <Text style={styles.itemSub}>{t.subjectName}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemDate}>{new Date(t.scheduledAt).toLocaleDateString()}</Text>
                    <Text style={styles.itemMeta}>{t.duration}m · {t.totalMarks} marks</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {upcomingPresentations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Presentations</Text>
            {upcomingPresentations.slice(0, 3).map(p => (
              <Card key={p.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <View style={[styles.itemIcon, { backgroundColor: Colors.success + '15' }]}><Feather name="monitor" size={18} color={Colors.success} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{p.title}</Text>
                    <Text style={styles.itemSub}>{p.subjectName}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemDate}>{new Date(p.scheduledAt).toLocaleDateString()}</Text>
                    <Text style={styles.itemMeta}>{p.venue}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {pendingAssignments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Assignments</Text>
            {pendingAssignments.slice(0, 3).map(a => (
              <Card key={a.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <View style={[styles.itemIcon, { backgroundColor: Colors.student + '15' }]}><Feather name="file-text" size={18} color={Colors.student} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{a.title}</Text>
                    <Text style={styles.itemSub}>{a.subjectName}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemDate}>Due: {new Date(a.deadline).toLocaleDateString()}</Text>
                    <Text style={styles.itemMeta}>{a.totalMarks} marks</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showProfile} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowProfile(false)}>
          <View style={[styles.profileSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.profileHeader}>
              <View style={[styles.profileAvatar, { backgroundColor: Colors.cr }]}>
                <Text style={styles.profileAvatarText}>{currentUser?.name?.charAt(0)}</Text>
              </View>
              <Text style={styles.profileName}>{currentUser?.name}</Text>
              <Text style={styles.profileEmail}>{currentUser?.email}</Text>
              <Badge label="Class Representative" variant="cr" />
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
  name: { fontSize: 22, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  roleText: { fontSize: 12, fontFamily: 'Poppins_500Medium', color: Colors.accent },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: Colors.primary },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statDiv: { borderLeftWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  statNum: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  statLabel: { fontSize: 10, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: Colors.text, marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', gap: 10 },
  actionCard: { flex: 1, alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.cardBorder },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: Colors.text, textAlign: 'center' },
  itemCard: { marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  itemSub: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  itemRight: { alignItems: 'flex-end' },
  itemDate: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: Colors.textSecondary },
  itemMeta: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textMuted },
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
