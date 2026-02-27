import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import * as Haptics from 'expo-haptics';

type FilterRole = 'all' | 'student' | 'teacher' | 'cr';

export default function AdminUsers() {
  const { users, approveUser, deleteUser } = useApp();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterRole>('all');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const webTop = Platform.OS === 'web' ? 67 : 0;

  const filtered = filter === 'all' ? users.filter(u => u.role !== 'admin') : users.filter(u => u.role === filter);
  const selected = selectedUser ? users.find(u => u.id === selectedUser) : null;

  const handleApprove = async (uid: string) => {
    await approveUser(uid);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = async (uid: string) => {
    await deleteUser(uid);
    setSelectedUser(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const FILTERS: { key: FilterRole; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'student', label: 'Students' },
    { key: 'teacher', label: 'Teachers' },
    { key: 'cr', label: 'Class Reps' },
  ];

  const roleVariant = (role: string) => {
    if (role === 'student') return 'student';
    if (role === 'teacher') return 'teacher';
    if (role === 'cr') return 'cr';
    return 'default';
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + webTop + 16 }]}>
        <Text style={styles.headerTitle}>Users</Text>
        <Text style={styles.headerSub}>{filtered.length} of {users.length - 1} users</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <Pressable key={f.key} style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]} onPress={() => setFilter(f.key)}>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <Card style={styles.emptyCard}>
            <Feather name="users" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Users</Text>
          </Card>
        )}
        renderItem={({ item }) => (
          <Pressable onPress={() => setSelectedUser(item.id)}>
            <Card style={[styles.userCard, !item.isApproved && styles.pendingCard]}>
              {!item.isApproved && <View style={styles.pendingIndicator} />}
              <View style={styles.userRow}>
                <View style={[styles.userAvatar, { backgroundColor: Colors[item.role as keyof typeof Colors] as string || Colors.textMuted }]}>
                  <Text style={styles.userAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                  {item.rollNumber && <Text style={styles.userMeta}>Roll: {item.rollNumber}</Text>}
                  {item.department && <Text style={styles.userMeta}>{item.department}</Text>}
                </View>
                <View style={styles.userRight}>
                  <Badge label={item.role.toUpperCase()} variant={roleVariant(item.role) as any} />
                  {!item.isApproved && <Badge label="Pending" variant="warning" />}
                </View>
              </View>
              {!item.isApproved && (
                <Pressable style={styles.approveBtn} onPress={() => handleApprove(item.id)}>
                  <Feather name="check" size={15} color="#FFFFFF" />
                  <Text style={styles.approveBtnText}>Approve Account</Text>
                </Pressable>
              )}
            </Card>
          </Pressable>
        )}
      />

      <Modal visible={!!selectedUser} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setSelectedUser(null)}>
          {selected && (
            <View style={[styles.userSheet, { paddingBottom: insets.bottom + 24 }]}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetUserHeader}>
                <View style={[styles.sheetAvatar, { backgroundColor: Colors[selected.role as keyof typeof Colors] as string || Colors.textMuted }]}>
                  <Text style={styles.sheetAvatarText}>{selected.name.charAt(0)}</Text>
                </View>
                <Text style={styles.sheetName}>{selected.name}</Text>
                <Text style={styles.sheetEmail}>{selected.email}</Text>
                <View style={styles.badgeRow}>
                  <Badge label={selected.role.toUpperCase()} variant={roleVariant(selected.role) as any} />
                  {!selected.isApproved && <Badge label="Pending" variant="warning" />}
                </View>
              </View>
              <View style={styles.detailsSection}>
                {selected.department && <View style={styles.detailRow}><Feather name="cpu" size={14} color={Colors.textSecondary} /><Text style={styles.detailText}>{selected.department}</Text></View>}
                {selected.rollNumber && <View style={styles.detailRow}><Feather name="hash" size={14} color={Colors.textSecondary} /><Text style={styles.detailText}>{selected.rollNumber}</Text></View>}
                {selected.semester && <View style={styles.detailRow}><Feather name="layers" size={14} color={Colors.textSecondary} /><Text style={styles.detailText}>Semester {selected.semester}</Text></View>}
              </View>
              {!selected.isApproved && (
                <Button label="Approve Account" onPress={() => { handleApprove(selected.id); setSelectedUser(null); }} variant="secondary" fullWidth style={{ marginBottom: 10 }} />
              )}
              <Button label="Remove User" onPress={() => handleDelete(selected.id)} variant="danger" fullWidth />
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.admin, paddingHorizontal: 24, paddingBottom: 20 },
  headerTitle: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  headerSub: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border },
  filterBtnActive: { borderColor: Colors.admin, backgroundColor: Colors.admin },
  filterText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.textSecondary },
  filterTextActive: { color: '#FFFFFF' },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  userCard: { marginBottom: 10, position: 'relative', overflow: 'hidden' },
  pendingCard: { borderColor: Colors.warning + '40' },
  pendingIndicator: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: Colors.warning, borderRadius: 2 },
  userRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  userName: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: Colors.text },
  userEmail: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, marginTop: 2 },
  userMeta: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textMuted, marginTop: 1 },
  userRight: { gap: 4, alignItems: 'flex-end' },
  approveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.success, borderRadius: 8, padding: 8, marginTop: 10 },
  approveBtnText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  emptyCard: { alignItems: 'center', paddingVertical: 40, marginTop: 20 },
  emptyTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: Colors.text, marginTop: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  userSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 12 },
  sheetUserHeader: { alignItems: 'center', gap: 6, marginBottom: 12 },
  sheetAvatar: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  sheetAvatarText: { fontSize: 26, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  sheetName: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: Colors.text },
  sheetEmail: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  badgeRow: { flexDirection: 'row', gap: 6 },
  detailsSection: { gap: 8, marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.text },
});
