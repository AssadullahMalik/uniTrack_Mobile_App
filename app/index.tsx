import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/colors';

export default function IndexScreen() {
  const { currentUser, isLoading } = useApp();

  useEffect(() => {
    if (!isLoading) {
      if (!currentUser) {
        router.replace('/(auth)/login');
      } else {
        switch (currentUser.role) {
          case 'student':
            router.replace('/(student)');
            break;
          case 'teacher':
            router.replace('/(teacher)');
            break;
          case 'cr':
            router.replace('/(cr)');
            break;
          case 'admin':
            router.replace('/(admin)');
            break;
        }
      }
    }
  }, [currentUser, isLoading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
