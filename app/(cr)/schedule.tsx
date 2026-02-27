import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';

function formatDateTime(d: string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CRSchedule() {
  const { currentUser, subjects, tests, presentations, assignments } = useApp();
  const insets = useSafeAreaInsets();
  const webTop = Platform.OS === 'web' ? 67 : 0;

  const mySubjects = subjects.filter(s => s.enrolledStudents.includes(currentUser?.id ?? ''));
  const myTests = tests.filter(t => mySubjects.find(s => s.id === t.subjectId) && new Date(t.scheduledAt) > new Date());
  const myPresentations = presentations.filter(p => mySubjects.find(s => s.id === p.subjectId) && new Date(p.scheduledAt) > new Date());
  const myAssignments = assignments.filter(a => mySubjects.find(s => s.id === a.subjectId) && new Date(a.deadline) > new Date());

  const allEvents = [
    ...myTests.map(t => ({ type: 'test' as const, date: t.scheduledAt, title: t.title, sub: t.subjectName, meta: `${t.duration}min · ${t.totalMarks} marks`, id: t.id })),
    ...myPresentations.map(p => ({ type: 'pres' as const, date: p.scheduledAt, title: p.title, sub: p.subjectName, meta: `${p.venue} · ${p.duration}min`, id: p.id })),
    ...myAssignments.map(a => ({ type: 'assign' as const, date: a.deadline, title: a.title, sub: a.subjectName, meta: `${a.totalMarks} marks`, id: a.id })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const typeConfig = {
    test: { icon: 'edit-3', color: Colors.teacher, label: 'Test' },
    pres: { icon: 'monitor', color: Colors.success, label: 'Presentation' },
    assign: { icon: 'file-text', color: Colors.student, label: 'Assignment Due' },
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + webTop + 16 }]}>
        <Text style={styles.headerTitle}>Class Schedule</Text>
        <Text style={styles.headerSub}>{allEvents.length} upcoming events</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 34 + 100 }]} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        {allEvents.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Feather name="calendar" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>All Clear!</Text>
            <Text style={styles.emptyText}>No upcoming events scheduled</Text>
          </Card>
        ) : allEvents.map(event => {
          const conf = typeConfig[event.type];
          return (
            <Card key={event.id + event.type} style={styles.eventCard}>
              <View style={styles.eventRow}>
                <View style={[styles.eventIcon, { backgroundColor: conf.color + '15' }]}>
                  <Feather name={conf.icon as any} size={20} color={conf.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.eventTopRow}>
                    <Text style={[styles.eventType, { color: conf.color }]}>{conf.label}</Text>
                  </View>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventSub}>{event.sub}</Text>
                  <Text style={styles.eventDate}>{formatDateTime(event.date)}</Text>
                  <Text style={styles.eventMeta}>{event.meta}</Text>
                </View>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.accent, paddingHorizontal: 24, paddingBottom: 20 },
  headerTitle: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: Colors.primary },
  headerSub: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.primary + 'AA', marginTop: 2 },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  eventCard: { marginBottom: 10 },
  eventRow: { flexDirection: 'row', gap: 12 },
  eventIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eventTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  eventType: { fontSize: 11, fontFamily: 'Poppins_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  eventTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: Colors.text, marginBottom: 2 },
  eventSub: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  eventDate: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: Colors.textSecondary, marginTop: 4 },
  eventMeta: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textMuted, marginTop: 2 },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: Colors.text },
  emptyText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
});
