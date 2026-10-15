import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import * as Haptics from 'expo-haptics';
import type { Notification } from '@/context/AppContext';

const TYPE_ICONS: Record<Notification['type'], { name: string; color: string; bg: string }> = {
  assignment: { name: 'file-text', color: Colors.student, bg: Colors.student + '15' },
  test: { name: 'edit-3', color: Colors.teacher, bg: Colors.teacher + '15' },
  presentation: { name: 'monitor', color: Colors.success, bg: Colors.success + '15' },
  marks: { name: 'award', color: Colors.accent, bg: Colors.accent + '15' },
  announcement: { name: 'megaphone', color: Colors.cr, bg: Colors.cr + '15' },
  general: { name: 'bell', color: Colors.textSecondary, bg: Colors.surfaceAlt },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function StudentNotifications() {
  const { currentUser, notifications, markNotificationRead } = useApp();
  const insets = useSafeAreaInsets();
  const webTop = Platform.OS === 'web' ? 67 : 0;

  const myNotifs = notifications
    .filter(n => n.userId === currentUser?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = myNotifs.filter(n => !n.read).length;

  const handlePress = async (notif: Notification) => {
    if (!notif.read) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await markNotificationRead(notif.id);
    }
  };

  const markAllRead = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    for (const n of myNotifs.filter(n => !n.read)) {
      await markNotificationRead(n.id);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + webTop + 16 }]}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && <Text style={styles.headerSub}>{unreadCount} unread</Text>}
        </View>
        {unreadCount > 0 && (
          <Pressable style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={myNotifs}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <Card style={styles.emptyCard}>
            <Feather name="bell-off" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>You&apos;re all caught up!</Text>
          </Card>
        )}
        renderItem={({ item }) => {
          const icon = TYPE_ICONS[item.type];
          return (
            <Pressable onPress={() => handlePress(item)}>
              <Card style={[styles.notifCard, !item.read && styles.unread]}>
                {!item.read && <View style={styles.unreadDot} />}
                <View style={[styles.iconBox, { backgroundColor: icon.bg }]}>
                  <Feather name={icon.name as any} size={20} color={icon.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.notifTitle, !item.read && { fontFamily: 'Poppins_600SemiBold' }]}>{item.title}</Text>
                  <Text style={styles.notifBody}>{item.body}</Text>
                  <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  headerSub: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  markAllBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)' },
  markAllText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  list: { paddingHorizontal: 16, paddingTop: 16 },
  notifCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8, position: 'relative' },
  unread: { borderColor: Colors.accent + '40', backgroundColor: Colors.accent + '04' },
  unreadDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifTitle: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: Colors.text, marginBottom: 3 },
  notifBody: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, lineHeight: 18 },
  notifTime: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textMuted, marginTop: 4 },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: Colors.text },
  emptyText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
});
