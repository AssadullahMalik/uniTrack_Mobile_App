import {
  loginWithEmailVerification,
  resetPassword,
  resendEmailVerification,
  logout as firebaseLogout,
} from '@/src/auth';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { getProfileByUid, logout } = useApp();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetVisible, setResetVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1) Sign in and enforce email verification (reload + check; signOut if not verified)
      await loginWithEmailVerification(email.trim().toLowerCase(), password);

      const uid = auth.currentUser?.uid;
      if (!uid) {
        setError('Session expired. Please try again.');
        setLoading(false);
        return;
      }

      // 2) Fetch Firestore profile by uid
      const appUser = await getProfileByUid(uid);

      if (!appUser) {
        await firebaseLogout();
        await logout();
        setError('Could not load your profile. Please try again or contact support.');
        setLoading(false);
        return;
      }

      if (!appUser.isApproved) {
        await firebaseLogout();
        await logout();
        setError('Your account is pending approval.');
        setLoading(false);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      switch (appUser.role) {
        case 'student': router.replace('/(student)'); break;
        case 'teacher': router.replace('/(teacher)'); break;
        case 'cr': router.replace('/(cr)'); break;
        case 'admin': router.replace('/(admin)'); break;
        default: setError('Unknown role.');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Enter email and password, then tap Resend.');
      return;
    }
    setResendLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await resendEmailVerification();
      await firebaseLogout();
      setError('A new verification email has been sent. Please check your inbox.');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to resend verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail.trim()) {
      setResetMessage('Please enter your email address.');
      return;
    }

    setResetLoading(true);
    setResetMessage(null);

    try {
      await resetPassword(resetEmail.trim().toLowerCase());
      setResetMessage('Password reset email sent. Please check your inbox.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      let msg = 'Something went wrong. Please try again.';
      switch (err?.code) {
        case 'auth/invalid-email':
          msg = 'Please enter a valid email address.';
          break;
        case 'auth/user-not-found':
          msg = 'No account found with this email.';
          break;
        case 'auth/network-request-failed':
          msg = 'Network error. Check your connection and try again.';
          break;
        case 'auth/too-many-requests':
          msg = 'Too many attempts. Please try again later.';
          break;
        default:
          break;
      }
      setResetMessage(msg);
    } finally {
      setResetLoading(false);
    }
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

            <Pressable
              style={{ alignSelf: 'flex-end', marginTop: 4 }}
              onPress={() => {
                setResetEmail(email);
                setResetMessage(null);
                setResetVisible(true);
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: 'Poppins_500Medium',
                  color: Colors.primary,
                }}
              >
                Forgot Password?
              </Text>
            </Pressable>

            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {error?.includes('Email not verified') ? (
              <Button
                label="Resend verification email"
                onPress={handleResendVerification}
                loading={resendLoading}
                fullWidth
                style={{ marginTop: 4 }}
              />
            ) : null}

            <Button label="Sign In" onPress={handleLogin} loading={loading} fullWidth style={{ marginTop: 8 }} />

            <Pressable style={styles.registerLink} onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerText}>Don&apos;t have an account? <Text style={styles.registerBold}>Register</Text></Text>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>

      {resetVisible && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'flex-end',
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setResetVisible(false)} />
          <View
            style={{
              backgroundColor: Colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: insets.bottom + 24,
              gap: 12,
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: Colors.border,
                alignSelf: 'center',
                marginBottom: 4,
              }}
            />
            <Text
              style={{
                fontSize: 18,
                fontFamily: 'Poppins_700Bold',
                color: Colors.text,
              }}
            >
              Reset Password
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: 'Poppins_400Regular',
                color: Colors.textSecondary,
              }}
            >
              Enter your registered email and we&apos;ll send you a reset link.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Feather name="mail" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your.email@muet.edu.pk"
                  placeholderTextColor={Colors.textMuted}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {resetMessage && (
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: 'Poppins_400Regular',
                  color: resetMessage.startsWith('Password reset') ? Colors.success : Colors.error,
                }}
              >
                {resetMessage}
              </Text>
            )}

            <Button
              label="Send Reset Link"
              onPress={handlePasswordReset}
              loading={resetLoading}
              fullWidth
            />
          </View>
        </View>
      )}
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
});
