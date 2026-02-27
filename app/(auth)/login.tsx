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
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const { login } = useApp();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const DEMO_ACCOUNTS = [
    { role: 'Student', email: 'ali.hassan@muet.edu.pk', password: 'student123', color: Colors.student },
    { role: 'Teacher', email: 'ahmed.khan@muet.edu.pk', password: 'teacher123', color: Colors.teacher },
    { role: 'CR', email: 'sara.malik@muet.edu.pk', password: 'cr123', color: Colors.cr },
    { role: 'Admin', email: 'admin@muet.edu.pk', password: 'admin123', color: Colors.admin },
  ];

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }
    setLoading(true);
    setError('');
    const user = await login(email.trim(), password);
    setLoading(false);
    if (!user) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Invalid email or password');
      return;
    }
    if (!user.isApproved) {
      setError('Your account is pending approval');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    switch (user.role) {
      case 'student': router.replace('/(student)'); break;
      case 'teacher': router.replace('/(teacher)'); break;
      case 'cr': router.replace('/(cr)'); break;
      case 'admin': router.replace('/(admin)'); break;
    }
  };

  const fillDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[Colors.primary, Colors.primaryLight, '#2A3F6B']} style={styles.gradient}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoInner}>
                <Feather name="book-open" size={32} color={Colors.accent} />
              </View>
            </View>
            <Text style={styles.appName}>UniTrack</Text>
            <Text style={styles.tagline}>Mehran University · Sessional Management</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Feather name="mail" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your.email@muet.edu.pk"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Feather name="lock" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={Colors.textMuted} />
                </Pressable>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button label="Sign In" onPress={handleLogin} loading={loading} fullWidth style={{ marginTop: 8 }} />

            <Pressable style={styles.registerLink} onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerText}>Don't have an account? <Text style={styles.registerBold}>Register</Text></Text>
            </Pressable>
          </View>

          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>Quick Demo Access</Text>
            <View style={styles.demoGrid}>
              {DEMO_ACCOUNTS.map(acc => (
                <Pressable key={acc.role} style={[styles.demoBtn, { borderColor: acc.color + '40', backgroundColor: acc.color + '15' }]} onPress={() => fillDemo(acc)}>
                  <View style={[styles.demoDot, { backgroundColor: acc.color }]} />
                  <Text style={[styles.demoBtnText, { color: acc.color }]}>{acc.role}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoContainer: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: Colors.accent + '40',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  logoInner: { alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: 32, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', letterSpacing: 1 },
  tagline: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)', marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: Colors.surface, borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 8,
  },
  title: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.text, marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Poppins_400Regular', color: Colors.text },
  eyeBtn: { padding: 4 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, marginBottom: 8 },
  errorText: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.error },
  registerLink: { alignItems: 'center', marginTop: 16 },
  registerText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary },
  registerBold: { fontFamily: 'Poppins_600SemiBold', color: Colors.primary },
  demoSection: { marginTop: 24 },
  demoTitle: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 12 },
  demoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  demoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  demoDot: { width: 8, height: 8, borderRadius: 4 },
  demoBtnText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
});
