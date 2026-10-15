import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { storage } from '@/firebaseConfig';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ProfileScreen() {
  const { currentUser, updateUser } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState<string>('');
  const [loading, setLoading] = useState(true); // screen load
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name ?? '');
    setPhone(currentUser.phone ?? '');
    setBio(currentUser.bio ?? '');
    setPhotoURL(currentUser.photoURL ?? '');
    setSelectedImage(null);
    setLoading(false);
  }, [currentUser]);

  const pickImage = async () => {
    setError('');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission required to access photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleUpload = async () => {
    if (!currentUser || !selectedImage) return;
    setError('');
    setSuccess('');
    try {
      setUploading(true);

      console.log('[profile] uploading image uri:', selectedImage);
      const response = await fetch(selectedImage);
      const blob = await response.blob();

      const storageRef = ref(storage, `profilePictures/${currentUser.id}.jpg`);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });

      const downloadURL = await getDownloadURL(storageRef);

      await updateUser(currentUser.id, { photoURL: downloadURL });
      setPhotoURL(downloadURL);
      setSelectedImage(null);

      setSuccess('Profile picture updated.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      const anyE = e as any;
      console.log('Upload error:', {
        code: anyE?.code,
        message: anyE?.message,
        serverResponse: anyE?.serverResponse,
        name: anyE?.name,
      });
      setError('Failed to upload profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await updateUser(currentUser.id, {
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        photoURL: photoURL ?? '',
      });
      setSuccess('Profile updated successfully.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('Failed to update profile', e);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  const topPad = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        style={[styles.header, { paddingTop: insets.top + topPad + 16 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <Pressable style={styles.avatarContainer} onPress={pickImage}>
            <View style={styles.avatar}>
              {selectedImage || photoURL ? (
                <Image
                  source={{ uri: selectedImage || photoURL }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>{currentUser.name?.charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <View style={styles.avatarOverlay}>
              <Feather name="camera" size={16} color="#FFFFFF" />
              <Text style={styles.avatarOverlayText}>Change Photo</Text>
            </View>
          </Pressable>

          {selectedImage ? (
            <Button
              label={uploading ? 'Updating...' : 'Update Profile Picture'}
              onPress={handleUpload}
              loading={uploading}
              fullWidth
              style={{ marginBottom: 14 }}
            />
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell something about yourself"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
          {success ? (
            <Text style={styles.successText}>{success}</Text>
          ) : null}

          <Button
            label={saving ? 'Saving...' : 'Save Changes'}
            onPress={handleSave}
            loading={saving}
            fullWidth
            style={{ marginTop: 8 }}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  card: { padding: 20 },
  avatarContainer: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 90, height: 90 },
  avatarText: { fontSize: 32, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  avatarOverlay: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  avatarOverlayText: { fontSize: 12, fontFamily: 'Poppins_500Medium', color: Colors.accent },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.text, marginBottom: 6 },
  input: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  textArea: { height: 100, paddingTop: 12 },
  errorText: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.error, marginTop: 4 },
  successText: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.success, marginTop: 4 },
});
