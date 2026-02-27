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

export default function AdminDashboard() {
  const { currentUser, users, subjects, assignments, tests, logout } = useApp();
  const insets = useSafeAreaInsets();
  const [showProfile, setShowProfile] = useState(false);
  const webTop = Platform.OS === 'web' ? 67 : 0;

  const pendingApprovals = users.filter(u => !u.isApproved);
  const students = users.filter(u => u.role === 'student');
  const teachers = users.filter(u => u.role === 'teacher');
  const crs = users.filter(u => u.role === 'cr');

  const handleLogout = async () => {
    await logout();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(auth)/login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient colors={[Colors.admin, '#B91C1C', '#991B1B']} style={[styles.header, { paddingTop: insets.top + webTop + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Admin Panel</Text>
            <Text style={styles.name}>{currentUser?.name}</Text>
          </View>
          <Pressable onPress={() => setShowProfile(true)}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{currentUser?.name?.charAt(0)}</Text></View>
          </Pressable>
        </View>
        <View style={styles.statsGrid}>
          {[
            { num: users.length, label: 'Total Users' },
            { num: students.length, label: 'Students' },
            { num: teachers.length, label: 'Teachers' },
            { num: subjects.length, label: 'Subjects' },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statNum}>{s.num}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        {pendingApprovals.length > 0 && (
          <Card style={styles.alertCard}>
            <View style={styles.alertRow}>
              <View style={styles.alertIcon}><Feather name="clock" size={20} color={Colors.warning} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>Pending Approvals</Text>
                <Text style={styles.alertBody}>{pendingApprovals.length} teacher account{pendingApprovals.length > 1 ? 's' : ''} awaiting approval</Text>
              </View>
              <Pressable onPress={() => router.push('/(admin)/users' as any)} style={styles.alertBtn}>
                <Text style={styles.alertBtnText}>Review</Text>
              </Pressable>
            </View>
          </Card>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Navigation</Text>
          <View style={styles.navGrid}>
            {[
              { icon: 'users', label: 'Manage Users', sub: `${users.length} accounts`, color: Colors.admin, route: '/(admin)/users' },
              { icon: 'book', label: 'Subjects', sub: `${subjects.length} total`, color: Colors.teacher, route: '/(admin)/departments' },
              { icon: 'file-text', label: 'Assignments', sub: `${assignments.length} active`, color: Colors.student, route: '/(admin)/departments' },
              { icon: 'edit-3', label: 'Tests', sub: `${tests.length} total`, color: Colors.cr, route: '/(admin)/departments' },
            ].map(item => (
              <Pressable key={item.label} style={styles.navCard} onPress={() => router.push(item.route as any)}>
                <View style={[styles.navIcon, { backgroundColor: item.color + '15' }]}>
                  <Feather name={item.icon as any} size={24} color={item.color} />
                </View>
                <Text style={styles.navLabel}>{item.label}</Text>
                <Text style={styles.navSub}>{item.sub}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Breakdown</Text>
          {[
            { role: 'Students', count: students.length, color: Colors.student, icon: 'user', variant: 'student' as const },
            { role: 'Teachers', count: teachers.length, color: Colors.teacher, icon: 'users', variant: 'teacher' as const },
            { role: 'Class Reps', count: crs.length, color: Colors.cr, icon: 'star', variant: 'cr' as const },
          ].map(item => (
            <Card key={item.role} style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <View style={[styles.breakdownIcon, { backgroundColor: item.color + '15' }]}>
                  <Feather name={item.icon as any} size={18} color={item.color} />
                </View>
                <Text style={styles.breakdownRole}>{item.role}</Text>
                <Badge label={`${item.count}`} variant={item.variant} />
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Subjects</Text>
          {subjects.slice(-3).map(sub => (
            <Card key={sub.id} style={styles.subCard}>
              <View style={styles.subRow}>
                <View style={styles.subIcon}><Feather name="book" size={16} color={Colors.teacher} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subName}>{sub.name}</Text>
                  <Text style={styles.subMeta}>{sub.code} · {sub.department}</Text>
                </View>
                <Text style={styles.subStudents}>{sub.enrolledStudents.length} students</Text>
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
              <View style={[styles.profileAvatar, { backgroundColor: Colors.admin }]}>
                <Text style={styles.profileAvatarText}>{currentUser?.name?.charAt(0)}</Text>
              </View>
              <Text style={styles.profileName}>{currentUser?.name}</Text>
              <Text style={styles.profileEmail}>{currentUser?.email}</Text>
              <Badge label="Administrator" variant="admin" />
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
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden' },
  statCard: { width: '50%', alignItems: 'center', paddingVertical: 14, borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)' },
  statNum: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  statLabel: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  alertCard: { marginBottom: 16, borderColor: Colors.warning + '40', borderWidth: 1.5 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.warning + '15', alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: Colors.text },
  alertBody: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  alertBtn: { backgroundColor: Colors.warning, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  alertBtnText: { fontSize: 12, fontFamily: 'Poppins_700Bold', color: Colors.primary },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: Colors.text, marginBottom: 12 },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  navCard: { width: '47%', backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.cardBorder },
  navIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  navLabel: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: Colors.text, marginBottom: 2 },
  navSub: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  breakdownCard: { marginBottom: 8 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  breakdownIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  breakdownRole: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.text, flex: 1 },
  subCard: { marginBottom: 8 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.teacher + '15', alignItems: 'center', justifyContent: 'center' },
  subName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  subMeta: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  subStudents: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: Colors.textSecondary },
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
