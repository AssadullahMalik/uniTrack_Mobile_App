import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import type { UserRole } from '@/context/AppContext';
import * as Haptics from 'expo-haptics';

const ROLES: { value: UserRole; label: string; desc: string; color: string }[] = [
  { value: 'student', label: 'Student', desc: 'View courses, submit work, take tests', color: Colors.student },
  { value: 'teacher', label: 'Teacher', desc: 'Create subjects, assign marks', color: Colors.teacher },
  { value: 'cr', label: 'Class Rep', desc: 'Manage class announcements', color: Colors.cr },
];

const DEPARTMENTS = ['Computer Science', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Software Engineering'];

export default function RegisterScreen() {
  const { register } = useApp();
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [rollNumber, setRollNumber] = useState('');
  const [semester, setSemester] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeptPicker, setShowDeptPicker] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill all required fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    const success = await register({
      name: name.trim(),
      email: email.trim(),
      password,
      role: selectedRole,
      department,
      rollNumber: rollNumber.trim(),
      semester: semester.trim(),
      isApproved: selectedRole === 'student' || selectedRole === 'cr',
    });
    setLoading(false);
    if (!success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Email already registered');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (selectedRole === 'teacher') {
      setError('');
      router.replace('/(auth)/login');
    } else {
      router.replace('/(auth)/login');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[Colors.primary, Colors.primaryLight, '#2A3F6B']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.topTitle}>Create Account</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>I am a...</Text>
            <View style={styles.roleRow}>
              {ROLES.map(r => (
                <Pressable
                  key={r.value}
                  style={[styles.roleBtn, selectedRole === r.value && { borderColor: r.color, backgroundColor: r.color + '10' }]}
                  onPress={() => { setSelectedRole(r.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <View style={[styles.roleDot, { backgroundColor: selectedRole === r.value ? r.color : Colors.border }]} />
                  <Text style={[styles.roleBtnText, selectedRole === r.value && { color: r.color, fontFamily: 'Poppins_600SemiBold' }]}>{r.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <View style={styles.inputContainer}>
                <Feather name="user" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Your full name" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address *</Text>
              <View style={styles.inputContainer}>
                <Feather name="mail" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="your.email@muet.edu.pk" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
              <View style={styles.inputContainer}>
                <Feather name="lock" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Min. 6 characters" placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Department</Text>
              <Pressable style={styles.inputContainer} onPress={() => setShowDeptPicker(!showDeptPicker)}>
                <Feather name="layers" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <Text style={[styles.input, { color: Colors.text, lineHeight: 20 }]}>{department}</Text>
                <Feather name={showDeptPicker ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
              </Pressable>
              {showDeptPicker && (
                <View style={styles.picker}>
                  {DEPARTMENTS.map(d => (
                    <Pressable key={d} style={[styles.pickerItem, department === d && styles.pickerItemSelected]} onPress={() => { setDepartment(d); setShowDeptPicker(false); }}>
                      <Text style={[styles.pickerItemText, department === d && { color: Colors.primary, fontFamily: 'Poppins_600SemiBold' }]}>{d}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {(selectedRole === 'student' || selectedRole === 'cr') && (
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Roll Number</Text>
                  <View style={styles.inputContainer}>
                    <TextInput style={styles.input} placeholder="19SW01" placeholderTextColor={Colors.textMuted} value={rollNumber} onChangeText={setRollNumber} />
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Semester</Text>
                  <View style={styles.inputContainer}>
                    <TextInput style={styles.input} placeholder="6" placeholderTextColor={Colors.textMuted} value={semester} onChangeText={setSemester} keyboardType="number-pad" maxLength={1} />
                  </View>
                </View>
              </View>
            )}

            {selectedRole === 'teacher' && (
              <View style={styles.infoBox}>
                <Feather name="info" size={14} color={Colors.info} />
                <Text style={styles.infoText}>Teacher accounts require admin approval before login.</Text>
              </View>
            )}

            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button label="Create Account" onPress={handleRegister} loading={loading} fullWidth style={{ marginTop: 8 }} />

            <Pressable style={styles.loginLink} onPress={() => router.back()}>
              <Text style={styles.loginText}>Already have an account? <Text style={styles.loginBold}>Sign In</Text></Text>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  card: { backgroundColor: Colors.surface, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 },
  sectionLabel: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.text, marginBottom: 12 },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  roleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border },
  roleDot: { width: 8, height: 8, borderRadius: 4 },
  roleBtnText: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: Colors.textSecondary },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.text, marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Poppins_400Regular', color: Colors.text },
  rowInputs: { flexDirection: 'row', gap: 12 },
  picker: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginTop: 4, overflow: 'hidden' },
  pickerItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerItemSelected: { backgroundColor: Colors.primary + '08' },
  pickerItemText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#DBEAFE', borderRadius: 8, padding: 10, marginBottom: 8 },
  infoText: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.info, flex: 1 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, marginBottom: 8 },
  errorText: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.error },
  loginLink: { alignItems: 'center', marginTop: 16 },
  loginText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  loginBold: { fontFamily: 'Poppins_600SemiBold', color: Colors.primary },
});
