import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  getPendingRequestsForTeacher,
  approveEnrollmentRequest,
  rejectEnrollmentRequest,
  type EnrollmentRequest,
} from '@/src/services/enrollment';

export default function TeacherEnrollmentRequests() {
  const { currentUser, subjects } = useApp();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [error, setError] = useState('');
  const webTop = Platform.OS === 'web' ? 67 : 0;

  useEffect(() => {
    if (!currentUser) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const load = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError('');
      const data = await getPendingRequestsForTeacher(currentUser.id);
      setRequests(data);
    } catch {
      setError('Failed to load enrollment requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (req: EnrollmentRequest) => {
    if (!currentUser) return;
    setProcessingId(req.id);
    setError('');
    try {
      await approveEnrollmentRequest(req.id);
      setRequests(prev => prev.filter(r => r.id !== req.id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setError('Failed to approve request. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: EnrollmentRequest) => {
    setProcessingId(req.id);
    setError('');
    try {
      await rejectEnrollmentRequest(req.id);
      setRequests(prev => prev.filter(r => r.id !== req.id));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      setError('Failed to reject request. Please try again.');
    } finally {
      setProcessingId(null);
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
        <Text style={styles.headerTitle}>Enrollment Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {requests.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Feather name="users" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Pending Requests</Text>
            <Text style={styles.emptyText}>Students will appear here when they request to join your subjects.</Text>
          </Card>
        ) : (
          requests.map(req => {
            const subject = subjects.find(s => s.id === req.subjectId);
            return (
              <Card key={req.id} style={styles.requestCard}>
                <View style={styles.requestRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{req.studentName.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentName}>{req.studentName}</Text>
                    <Text style={styles.subjectText}>
                      {subject?.name ?? 'Subject'} {subject?.code ? `· ${subject.code}` : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.actionsRow}>
                  <Button
                    label="Reject"
                    onPress={() => handleReject(req)}
                    loading={processingId === req.id && false}
                    style={styles.rejectBtn}
                  />
                  <Button
                    label="Accept"
                    onPress={() => handleApprove(req)}
                    loading={processingId === req.id}
                    style={styles.acceptBtn}
                  />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.teacher,
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  errorText: {
    paddingHorizontal: 16,
    paddingTop: 8,
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.error,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  requestCard: {
    marginBottom: 12,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.teacher,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  studentName: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.text,
  },
  subjectText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.error + '30',
  },
  acceptBtn: {
    flex: 1,
  },
});
