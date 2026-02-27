import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';

const DEPARTMENTS = [
  { name: 'Computer Science', icon: 'cpu', color: Colors.student },
  { name: 'Software Engineering', icon: 'code', color: Colors.teacher },
  { name: 'Electrical Engineering', icon: 'zap', color: Colors.accent },
  { name: 'Mechanical Engineering', icon: 'settings', color: Colors.cr },
  { name: 'Civil Engineering', icon: 'home', color: Colors.admin },
];

export default function AdminDepartments() {
  const { users, subjects, assignments, tests } = useApp();
  const insets = useSafeAreaInsets();
  const webTop = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + webTop + 16 }]}>
        <Text style={styles.headerTitle}>Departments</Text>
        <Text style={styles.headerSub}>System Overview</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Analytics</Text>
          <View style={styles.analyticsGrid}>
            {[
              { label: 'Total Users', value: users.length, icon: 'users', color: Colors.admin },
              { label: 'Subjects', value: subjects.length, icon: 'book', color: Colors.teacher },
              { label: 'Assignments', value: assignments.length, icon: 'file-text', color: Colors.student },
              { label: 'Tests', value: tests.length, icon: 'edit-3', color: Colors.cr },
              { label: 'Teachers', value: users.filter(u => u.role === 'teacher').length, icon: 'user', color: Colors.teacher },
              { label: 'Students', value: users.filter(u => u.role === 'student').length, icon: 'user-check', color: Colors.student },
            ].map(item => (
              <Card key={item.label} style={styles.analyticsCard}>
                <View style={[styles.analyticsIcon, { backgroundColor: item.color + '15' }]}>
                  <Feather name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={styles.analyticsValue}>{item.value}</Text>
                <Text style={styles.analyticsLabel}>{item.label}</Text>
              </Card>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Departments</Text>
          {DEPARTMENTS.map(dept => {
            const deptSubjects = subjects.filter(s => s.department === dept.name);
            const deptStudents = users.filter(u => u.department === dept.name && u.role === 'student');
            const deptTeachers = users.filter(u => u.department === dept.name && u.role === 'teacher');
            return (
              <Card key={dept.name} style={styles.deptCard}>
                <View style={styles.deptHeader}>
                  <View style={[styles.deptIcon, { backgroundColor: dept.color + '15' }]}>
                    <Feather name={dept.icon as any} size={22} color={dept.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deptName}>{dept.name}</Text>
                    <View style={styles.deptMeta}>
                      <Text style={styles.deptMetaText}>{deptTeachers.length} teachers</Text>
                      <Text style={styles.deptMetaText}>·</Text>
                      <Text style={styles.deptMetaText}>{deptStudents.length} students</Text>
                      <Text style={styles.deptMetaText}>·</Text>
                      <Text style={styles.deptMetaText}>{deptSubjects.length} subjects</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.deptProgressRow}>
                  <View style={styles.deptProgressTrack}>
                    <View style={[styles.deptProgressFill, { backgroundColor: dept.color, width: `${Math.min((deptStudents.length / Math.max(users.filter(u => u.role === 'student').length, 1)) * 100, 100)}%` as any }]} />
                  </View>
                  <Text style={[styles.deptPct, { color: dept.color }]}>{deptStudents.length} students</Text>
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>
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
  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  analyticsCard: { width: '30.5%', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8 },
  analyticsIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  analyticsValue: { fontSize: 22, fontFamily: 'Poppins_700Bold', color: Colors.text },
  analyticsLabel: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },
  deptCard: { marginBottom: 10 },
  deptHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  deptIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  deptName: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: Colors.text },
  deptMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  deptMetaText: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  deptProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deptProgressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  deptProgressFill: { height: 6, borderRadius: 3 },
  deptPct: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', minWidth: 56, textAlign: 'right' },
});
