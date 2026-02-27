import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'student' | 'teacher' | 'cr' | 'admin';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: Colors.surfaceAlt, text: Colors.textSecondary },
  success: { bg: '#D1FAE5', text: '#065F46' },
  warning: { bg: '#FEF3C7', text: '#92400E' },
  error: { bg: '#FEE2E2', text: '#991B1B' },
  info: { bg: '#DBEAFE', text: '#1E40AF' },
  student: { bg: '#DBEAFE', text: '#1E40AF' },
  teacher: { bg: '#EDE9FE', text: '#5B21B6' },
  cr: { bg: '#D1FAE5', text: '#065F46' },
  admin: { bg: '#FEE2E2', text: '#991B1B' },
};

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const colors = variantColors[variant];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
