import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import * as Haptics from 'expo-haptics';

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CRAnnouncements() {
  const { currentUser, announcements, addAnnouncement, addNotification, subjects } = useApp();
  const insets = useSafeAreaInsets();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [creating, setCreating] = useState(false);
  const webTop = Platform.OS === 'web' ? 67 : 0;

  const myAnnouncements = announcements
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const mySubjects = subjects.filter(s => s.enrolledStudents.includes(currentUser?.id ?? ''));

  const handleCreate = async () => {
    if (!currentUser || !title.trim() || !body.trim()) return;
    setCreating(true);
    await addAnnouncement({
      crId: currentUser.id,
      crName: currentUser.name,
      title: title.trim(),
      body: body.trim(),
    });
    // Notify enrolled students
    const studentIds = [...new Set(mySubjects.flatMap(s => s.enrolledStudents))].filter(id => id !== currentUser.id);
    for (const sid of studentIds) {
      await addNotification({
        userId: sid,
        title: `CR Announcement: ${title.trim()}`,
        body: body.trim(),
        type: 'announcement',
        read: false,
      });
    }
    setCreating(false);
    setShowCreate(false);
    setTitle(''); setBody('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + webTop + 16 }]}>
        <Text style={styles.headerTitle}>Announcements</Text>
        <Pressable style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <Feather name="plus" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <FlatList
        data={myAnnouncements}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <Card style={styles.emptyCard}>
            <Feather name="bell" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Announcements</Text>
            <Text style={styles.emptyText}>Post your first class announcement</Text>
            <Button label="Post Announcement" onPress={() => setShowCreate(true)} variant="secondary" />
          </Card>
        )}
        renderItem={({ item }) => (
          <Card style={styles.annCard}>
            <View style={styles.annHeader}>
              <View style={styles.crIcon}><Feather name="bell" size={16} color={Colors.cr} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.annTitle}>{item.title}</Text>
                <Text style={styles.annMeta}>by {item.crName} · {timeAgo(item.createdAt)}</Text>
              </View>
            </View>
            <Text style={styles.annBody}>{item.body}</Text>
          </Card>
        )}
      />

      <Modal visible={showCreate} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowCreate(false)}>
          <View style={[styles.createSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New Announcement</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput style={styles.input} placeholder="Announcement title" placeholderTextColor={Colors.textMuted} value={title} onChangeText={setTitle} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Message *</Text>
              <TextInput style={[styles.input, { height: 100 }]} placeholder="Write your class announcement here..." placeholderTextColor={Colors.textMuted} value={body} onChangeText={setBody} multiline textAlignVertical="top" />
            </View>
            <Button label="Post Announcement" onPress={handleCreate} loading={creating} fullWidth variant="secondary" />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.cr, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  createBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 16 },
  annCard: { marginBottom: 10 },
  annHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  crIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.cr + '15', alignItems: 'center', justifyContent: 'center' },
  annTitle: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: Colors.text },
  annMeta: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textMuted, marginTop: 2 },
  annBody: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, lineHeight: 20 },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 16, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: Colors.text },
  emptyText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  createSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: Colors.text },
  inputGroup: {},
  label: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.text, marginBottom: 6 },
  input: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, height: 48, fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.text },
});
