import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image, ScrollView,
  KeyboardAvoidingView, Platform, useWindowDimensions,
} from 'react-native';
import { supabase } from '../api/supabaseClient';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ForceResetPasswordScreen({ navigation }: any) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please enter and confirm your new password');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        Alert.alert('Update Failed', error.message || 'Unable to update password');
      } else {
        Alert.alert('Success', 'Your password has been securely updated!', [
          { text: 'Continue', onPress: () => navigation.replace('MainApp') }
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // ── Shared form elements ────────────────────────────────────────────────────

  const renderFormContent = (compact = false) => (
    <>
      <Text style={[styles.title, compact && styles.titleCompact]}>Set New Password</Text>
      <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
        Welcome! For your security, please change your default password before continuing.
      </Text>

      <View style={[styles.inputContainer, compact && styles.inputContainerCompact]}>
        <Text style={styles.label}>NEW PASSWORD <Text style={styles.asterisk}>*</Text></Text>
        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholderTextColor="#94a3b8"
            placeholder="At least 6 characters"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.showText}>{showPassword ? 'HIDE' : 'SHOW'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.inputContainer, compact && styles.inputContainerCompact]}>
        <Text style={styles.label}>CONFIRM PASSWORD <Text style={styles.asterisk}>*</Text></Text>
        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.passwordInput}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            placeholderTextColor="#94a3b8"
            placeholder="Re-type new password"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleUpdatePassword}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Save & Continue</Text>}
      </TouchableOpacity>
    </>
  );

  // ── LANDSCAPE layout ─────────────────────────────────────────────────────────

  if (isLandscape) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[styles.landscapeRoot, { paddingLeft: insets.left, paddingRight: insets.right }]}>
          <LinearGradient
            colors={['#8b2219', '#4c110d']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.leftPanel, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
          >
            <View style={styles.leftContent}>
              <Image
                source={require('../../assets/omnis-logo-white.png')}
                style={styles.landscapeLogo}
                resizeMode="contain"
              />
              <Text style={styles.leftTagline}>Unified Intelligence</Text>
            </View>
            <Image
              source={require('../../assets/IEG_logo.png')}
              style={styles.iegLogoLandscape}
              resizeMode="contain"
            />
          </LinearGradient>

          <ScrollView
            style={styles.rightPanel}
            contentContainerStyle={[
              styles.rightPanelContent,
              { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formInner}>
              {renderFormContent(true)}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── PORTRAIT layout ─────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <LinearGradient
        colors={['#8b2219', '#4c110d']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          style={{ flex: 1, width: '100%' }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/omnis-logo-white.png')}
              style={styles.mainLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.loginCard}>
            {renderFormContent()}
          </View>

          <View style={styles.footerContainer}>
            <Image
              source={require('../../assets/IEG_logo.png')}
              style={styles.iegLogo}
              resizeMode="contain"
            />
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingVertical: 60,
  },
  logoContainer: { marginBottom: 40, alignItems: 'center' },
  mainLogo: { height: 120, width: 350 },
  loginCard: {
    width: '100%', maxWidth: 500,
    backgroundColor: '#ffffff',
    padding: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 10,
  },
  footerContainer: { alignItems: 'center', width: '100%', marginTop: 40 },
  iegLogo: { height: 40, width: 150, opacity: 0.8 },

  landscapeRoot: { flex: 1, flexDirection: 'row' },
  leftPanel: {
    width: '42%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  leftContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  landscapeLogo: { width: 260, height: 80, marginBottom: 12 },
  leftTagline: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  iegLogoLandscape: { width: 120, height: 32, opacity: 0.7 },
  rightPanel: { flex: 1, backgroundColor: '#f8fafc' },
  rightPanelContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  formInner: {
    width: '100%', maxWidth: 420,
    backgroundColor: '#fff',
    padding: 40, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },

  title: { fontSize: 26, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  titleCompact: { fontSize: 24, marginBottom: 2 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 32, lineHeight: 20 },
  subtitleCompact: { marginBottom: 24 },
  
  inputContainer: { marginBottom: 24 },
  inputContainerCompact: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 8, letterSpacing: 0.5 },
  asterisk: { color: '#ef4444' },
  input: {
    height: 48,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15, color: '#0f172a',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  passwordWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  passwordInput: {
    flex: 1, height: 48,
    paddingHorizontal: 16,
    fontSize: 15, color: '#0f172a',
  },
  showText: {
    fontSize: 12, fontWeight: '700',
    color: '#8b2219', paddingHorizontal: 16,
  },
  button: {
    backgroundColor: '#8b2219',
    height: 52, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: '#cbd5e1' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
