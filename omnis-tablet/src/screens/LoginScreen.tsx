import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image, ScrollView,
  KeyboardAvoidingView, Platform, useWindowDimensions,
} from 'react-native';
import { supabase } from '../api/supabaseClient';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen({ navigation }: any) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;

  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe]     = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username.trim(),
        password,
      });
      if (error) {
        Alert.alert('Login Failed', error.message || 'Invalid credentials');
      } else if (data.user) {
        if (password.trim() === 'ChangeMe@2026') {
          navigation.replace('ForceResetPassword');
        } else {
          navigation.replace('MainApp');
        }
      }
    } catch (error: any) {
      Alert.alert('Login Error', error.message || 'Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // ── Shared form elements ────────────────────────────────────────────────────

  const renderFormContent = (compact = false) => (
    <>
      <Text style={[styles.title, compact && styles.titleCompact]}>Sign in</Text>
      <Text style={styles.version}>V4.2.10-STABLE</Text>
      <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
        Enter your normal system credentials. Omnis will check each connected system for you.
      </Text>

      <View style={[styles.inputContainer, compact && styles.inputContainerCompact]}>
        <Text style={styles.label}>EMAIL / USERNAME <Text style={styles.asterisk}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#94a3b8"
        />
      </View>

      <View style={[styles.inputContainer, compact && styles.inputContainerCompact]}>
        <Text style={styles.label}>PASSWORD <Text style={styles.asterisk}>*</Text></Text>
        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.showText}>{showPassword ? 'HIDE' : 'SHOW'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.optionsRow, compact && styles.optionsRowCompact]}>
        <TouchableOpacity style={styles.checkboxContainer} onPress={() => setRememberMe(!rememberMe)}>
          <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
            {rememberMe && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.rememberText}>Remember me</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Sign in</Text>}
      </TouchableOpacity>
    </>
  );

  // ── LANDSCAPE layout ─────────────────────────────────────────────────────────

  if (isLandscape) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[styles.landscapeRoot, { paddingLeft: insets.left, paddingRight: insets.right }]}>

          {/* Left panel — crimson with logo */}
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
            {/* IEG logo at bottom */}
            <Image
              source={require('../../assets/IEG_logo.png')}
              style={styles.iegLogoLandscape}
              resizeMode="contain"
            />
          </LinearGradient>

          {/* Right panel — white form */}
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

  // ── PORTRAIT layout (unchanged) ───────────────────────────────────────────────

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
          <TouchableOpacity style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>

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

  // ── Portrait ───────────────────────────────────────────────────────────────
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingVertical: 60,
  },
  closeButton: {
    position: 'absolute', top: 40, right: 40,
    width: 32, height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    justifyContent: 'center', alignItems: 'center',
  },
  closeText: { color: '#fff', fontSize: 24, lineHeight: 28 },
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

  // ── Landscape ─────────────────────────────────────────────────────────────
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
  iegLogoLandscape: { height: 30, width: 120, opacity: 0.6 },

  rightPanel: { flex: 1, backgroundColor: '#fff' },
  rightPanelContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  formInner: { maxWidth: 420, width: '100%', alignSelf: 'center' },

  // ── Shared form ───────────────────────────────────────────────────────────
  title: { fontSize: 36, fontWeight: '600', color: '#1a100e', marginBottom: 4 },
  titleCompact: { fontSize: 28 },
  version: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 12, letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 28, lineHeight: 20 },
  subtitleCompact: { marginBottom: 18 },

  inputContainer: { marginBottom: 20 },
  inputContainerCompact: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '600', color: '#64748b', marginBottom: 8, letterSpacing: 0.5 },
  asterisk: { color: '#dc2626' },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#cbd5e1',
    padding: 14, fontSize: 15, color: '#0f172a',
  },
  passwordWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#cbd5e1',
    paddingRight: 14,
  },
  passwordInput: { flex: 1, padding: 14, fontSize: 15, color: '#0f172a' },
  showText: { fontSize: 12, fontWeight: 'bold', color: '#0f172a', letterSpacing: 0.5 },

  optionsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24, marginTop: 4,
  },
  optionsRowCompact: { marginBottom: 16 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 16, height: 16,
    borderWidth: 1, borderColor: '#94a3b8',
    marginRight: 8, justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  checkmark: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  rememberText: { fontSize: 13, color: '#64748b' },
  forgotText: { fontSize: 13, color: '#0284c7', fontWeight: '500' },

  button: { backgroundColor: '#5c120c', padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});
