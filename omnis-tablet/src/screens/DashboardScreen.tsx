import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, ImageBackground, StatusBar, Image, useWindowDimensions } from 'react-native';
import { supabase, getCurrentUserProfile } from '../api/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { registerForPushNotificationsAsync } from '../services/NotificationService';
import { getSyncQueue } from '../database/db';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import { useResponsive } from '../hooks/useResponsive';

export default function DashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const responsive = useResponsive();
  const { isPhone, isPortrait, isSmallPhone, hp, showLogo, logoSize, cardColumns, shortcutColumns, fabStyle } = responsive;
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [userName, setUserName] = useState('Administrator');
  const [greeting, setGreeting] = useState('Good morning');
  const [currentDate, setCurrentDate] = useState('');
  const [lateOrders, setLateOrders] = useState(0);
  const [openEnquiries, setOpenEnquiries] = useState(0);
  const [overdueVisits, setOverdueVisits] = useState(0);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const screenWidth = responsive.width;

  // Animated values for progress bars (0→1 on mount)
  const spMtdAnim = useRef(new Animated.Value(0)).current;
  const spYtdAnim = useRef(new Animated.Value(0)).current;
  const mxMtdAnim = useRef(new Animated.Value(0)).current;
  const mxYtdAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    registerForPushNotificationsAsync();
    
    // Check sync queue length
    const queue = getSyncQueue();
    const pending = queue.filter(t => t.status === 'pending' || t.status === 'failed').length;
    setPendingSyncs(pending);

    // Dynamic greeting based on time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Dynamic date formatting
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    const dateFormatted = new Date().toLocaleDateString('en-US', options);
    setCurrentDate(`Today is ${dateFormatted}. Overview for your fleet:`);

    // Fetch user name from Supabase profile
    const fetchUser = async () => {
      try {
        const profile = await getCurrentUserProfile();
        if (profile?.full_name) {
          setUserName(profile.full_name);
        }
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };
    fetchUser();

    // Animate progress bars in on mount
    Animated.stagger(120, [
      Animated.timing(spMtdAnim, { toValue: 0.25, duration: 900, useNativeDriver: false }),
      Animated.timing(spYtdAnim, { toValue: 0.41, duration: 900, useNativeDriver: false }),
      Animated.timing(mxMtdAnim, { toValue: 0.22, duration: 900, useNativeDriver: false }),
      Animated.timing(mxYtdAnim, { toValue: 0.55, duration: 900, useNativeDriver: false }),
    ]).start();

    // Fetch live counts on mount (also called from useFocusEffect on every return)
  }, []);

  // ── Refresh pills on every screen focus ───────────────────────────────────
  const fetchCounts = React.useCallback(async () => {
    try {
      const { count: lateCount } = await supabase
        .from('fmb_report_machines')
        .select('id', { count: 'exact', head: true })
        .lt('days_left', 0);
      setLateOrders(lateCount || 0);

      const { count: openCount } = await supabase
        .from('customer_enquiries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Open');
      setOpenEnquiries(openCount || 0);

      // Fetch overdue visits
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.email) {
        const { data: myCusts } = await supabase
          .from('customers')
          .select('tier, last_visit_date')
          .eq('account_manager', userData.user.email);
          
        if (myCusts) {
          let overdue = 0;
          myCusts.forEach(c => {
            let freq = 90;
            if (c.tier === 1) freq = 30;
            else if (c.tier === 2) freq = 60;
            
            if (c.last_visit_date) {
              const last = new Date(c.last_visit_date);
              const next = new Date(last.getTime() + freq * 24 * 60 * 60 * 1000);
              if (next < new Date()) overdue++;
            } else {
              overdue++;
            }
          });
          setOverdueVisits(overdue);
        }
      }
    } catch (err) {
      console.error('Failed to fetch counts', err);
    }
  }, []);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.replace('Login');
  };

  // Refresh counts when screen is focused (no longer locking orientation)
  useFocusEffect(
    React.useCallback(() => {
      fetchCounts();
    }, [fetchCounts])
  );

  const OEM_LOGOS = [
    { name: 'LANDCROS', placeholder: true },
    { name: 'HENRED FRUEHAUF', placeholder: true },
    { name: 'ZSI', placeholder: true },
    { name: 'SHANTUI', placeholder: true },
    { name: 'SINOTRUK', placeholder: true },
    { name: 'FOTON', placeholder: true },
    { name: 'Bobcat', placeholder: true },
    { name: 'WIRTGEN', placeholder: true },
    { name: 'WEICHAI', placeholder: true },
  ];

  // Circuit-board pattern — nodes, traces, and via holes across the grey body
  const CELL = 52;
  const TRACE_COLOR = 'rgba(71, 85, 105, 0.08)';
  const NODE_COLOR  = 'rgba(71, 85, 105, 0.14)';
  const circuitCols = Math.ceil(screenWidth / CELL) + 2;
  const circuitRows = Math.ceil(700 / CELL) + 2;
  const circuitPattern: React.ReactNode[] = [];

  for (let r = 0; r < circuitRows; r++) {
    for (let c = 0; c < circuitCols; c++) {
      const x = c * CELL;
      const y = r * CELL;
      const seed = r * 31 + c * 17;

      // Horizontal trace to the right
      if (c < circuitCols - 1 && seed % 3 !== 0) {
        circuitPattern.push(
          <View key={`h-${r}-${c}`} style={{
            position: 'absolute', left: x + 3, top: y - 0.5,
            width: CELL - 6, height: 1,
            backgroundColor: TRACE_COLOR,
          }} />
        );
      }

      // Vertical trace downward
      if (r < circuitRows - 1 && (seed * 3 + 5) % 3 !== 0) {
        circuitPattern.push(
          <View key={`v-${r}-${c}`} style={{
            position: 'absolute', left: x - 0.5, top: y + 3,
            width: 1, height: CELL - 6,
            backgroundColor: TRACE_COLOR,
          }} />
        );
      }

      // Node dot at every intersection
      circuitPattern.push(
        <View key={`n-${r}-${c}`} style={{
          position: 'absolute', left: x - 2, top: y - 2,
          width: 4, height: 4, borderRadius: 2,
          backgroundColor: NODE_COLOR,
        }} />
      );

      // Via hole ring at ~9% of nodes
      if (seed % 11 === 0) {
        circuitPattern.push(
          <View key={`via-${r}-${c}`} style={{
            position: 'absolute', left: x - 5, top: y - 5,
            width: 10, height: 10, borderRadius: 5,
            borderWidth: 1, borderColor: NODE_COLOR,
            backgroundColor: 'transparent',
          }} />
        );
      }
    }
  }

  return (
    <View style={[styles.safeArea, { paddingTop: 0, paddingBottom: 0 }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
        {/* Circuit-board pattern background */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }} pointerEvents="none">
          {circuitPattern}
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} bounces={false}>
          
          {/* Top Header Row: Red Profile Card + KPIs */}
        <LinearGradient
          colors={['#4c110d', '#8b2219', '#6b1a14']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerCard, { paddingTop: insets.top + 10, paddingHorizontal: hp + 6 }]}
        >
          <ImageBackground
            source={require('../../assets/header_bg_earthmoving.jpg')}
            style={StyleSheet.absoluteFill}
            imageStyle={{ opacity: 0.35, resizeMode: 'cover' }}
          />
          <View style={styles.headerNavBar}>
            <View style={{ padding: 4 }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.pillContainerInline}>
                <Text style={styles.pillText}>V4.3.10-NEXUS</Text>
              </View>
              <TouchableOpacity style={styles.logoutBtnInline} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={16} color="#ffffff" />
                <Text style={styles.logoutTextInline}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={{ flexDirection: isPhone && isPortrait ? 'column' : 'row', alignItems: isPhone && isPortrait ? 'flex-start' : 'center', justifyContent: 'space-between', width: '100%' }}>
            
            {/* Left Side: Profile Text & Actions */}
            <View style={[styles.profileSection, { justifyContent: 'flex-start', alignItems: 'flex-start', flex: 1 }]}>
              <View style={[styles.profileTextContainer, { alignItems: 'flex-start', marginLeft: 0 }]}>
                <Text style={[styles.greeting, { textAlign: 'left' }]}>{greeting}, {userName}! 👋</Text>
                <Text style={[styles.roleText, { textAlign: 'left' }]}>{currentDate}</Text>
                <View style={[styles.quickActionRow, { justifyContent: 'flex-start', flexWrap: 'wrap', marginTop: 6 }]}>
                  <TouchableOpacity 
                    style={styles.quickActionBtn}
                    onPress={() => navigation.navigate('Inbox')}
                  >
                    <Ionicons name="mail-unread-outline" size={12} color="#fff" />
                    <Text style={styles.quickActionText}>Inbox</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.quickActionBtn}
                    onPress={() => navigation.navigate('Sync Status')}
                  >
                    <Ionicons name="sync-outline" size={12} color="#fff" />
                    <Text style={styles.quickActionText}>Sync Status</Text>
                    {pendingSyncs > 0 && (
                      <View style={[styles.badgeContainer, { position: 'absolute', top: -6, right: -6, width: 16, height: 16 }]}>
                        <Text style={[styles.badgeText, { fontSize: 9 }]}>{pendingSyncs}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.quickActionBtn, { backgroundColor: '#ea580c', borderColor: '#c2410c' }]}
                    onPress={() => navigation.navigate('Fleetrack Dashboard')}
                  >
                    <Ionicons name="car-sport" size={12} color="#fff" />
                    <Text style={styles.quickActionText}>Fleetrack</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Right Side: Omnis Logo — hidden on phones */}
            {showLogo && (
              <View style={{ justifyContent: 'center', alignItems: 'flex-end', minHeight: logoSize.h, marginLeft: 16, marginTop: 20 }}>
                <View style={{
                  shadowColor: '#ffffff',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.35,
                  shadowRadius: 18,
                }}>
                  <Image
                    source={require('../../assets/omnis-logo-white.png')}
                    style={{ width: logoSize.w, height: logoSize.h, resizeMode: 'contain' }}
                  />
                </View>
                <Text style={{
                  color: '#f8fafc',
                  fontWeight: '800',
                  letterSpacing: 2,
                  fontSize: 10,
                  marginTop: 8,
                  opacity: 0.7,
                  textTransform: 'uppercase',
                }}>
                  Unified Intelligence
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={[styles.innerContent, { paddingHorizontal: hp }]}>

          {/* Performance Cards Row */}
          <View style={[styles.performanceRow, cardColumns === 1 && { flexDirection: 'column', gap: 10 }]}>
            {/* Sinopower Card */}
            <LinearGradient
              colors={['#4c110d', '#8b2219', '#6b1a14']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.perfCard, isPhone && styles.perfCardPhone]}
            >
              {/* Watermark pattern icon */}
              <View style={{ position: 'absolute', right: -16, bottom: -20, opacity: 0.08 }} pointerEvents="none">
                <Ionicons name="trending-up" size={140} color="#ffffff" />
              </View>
              {/* Diagonal dot pattern strip */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.04 }} pointerEvents="none">
                {[...Array(6)].map((_, r) => [...Array(10)].map((_, c) => (
                  <View key={`${r}-${c}`} style={{ position: 'absolute', left: c * 22 - 10, top: r * 22 - 10, width: 3, height: 3, borderRadius: 2, backgroundColor: '#fff' }} />
                )))}
              </View>
              <View style={[styles.perfHeader, isPhone && { marginBottom: 8 }]}>
                <View>
                  <Text style={[styles.perfTitle, { color: '#ffffff' }, isPhone && { fontSize: 10 }]}>SINOPOWER</Text>
                  <Text style={[styles.perfSubtitle, isPhone && { fontSize: 8 }]}>MTD & YTD PERFORMANCE</Text>
                </View>
                <View style={[styles.perfIconContainer, { backgroundColor: 'rgba(255,255,255,0.15)' }, isPhone && { width: 24, height: 24, borderRadius: 6 }]}>
                  <Ionicons name="trending-up" size={isPhone ? 12 : 14} color="#ffffff" />
                </View>
              </View>
              
              <View style={styles.perfBody}>
                <View style={styles.perfBlock}>
                  <Text style={styles.perfBlockTitle}>MONTH TO DATE</Text>
                  <View style={styles.perfBlockValues}>
                    <Text style={[styles.perfValue, isPhone && styles.perfValuePhone]}>4</Text>
                    <Text style={[styles.perfTarget, isPhone && { fontSize: 10 }]}>/ 15</Text>
                  </View>
                  <View style={[styles.perfBarBg, isPhone && { height: 6 }]}>
                    <Animated.View style={[styles.perfBarFill, {
                      width: spMtdAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                      backgroundColor: 'rgba(255,255,255,0.82)',
                    }]} />
                  </View>
                  <View style={styles.perfBlockFooter}>
                    <Text style={[styles.perfPct, { color: '#ffffff' }, isPhone && { fontSize: 12 }]}>25%</Text>
                    <Text style={[styles.perfNote, isPhone && { fontSize: 8 }]}>Need 11 more</Text>
                  </View>
                </View>
                
                <View style={styles.perfDivider} />
                
                <View style={styles.perfBlock}>
                  <Text style={styles.perfBlockTitle}>YEAR TO DATE</Text>
                  <View style={styles.perfBlockValues}>
                    <Text style={[styles.perfValue, isPhone && styles.perfValuePhone]}>79</Text>
                    <Text style={[styles.perfTarget, isPhone && { fontSize: 10 }]}>/ 192</Text>
                  </View>
                  <View style={[styles.perfBarBg, isPhone && { height: 6 }]}>
                    <Animated.View style={[styles.perfBarFill, {
                      width: spYtdAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                      backgroundColor: 'rgba(255,255,255,0.82)',
                    }]} />
                  </View>
                  <View style={styles.perfBlockFooter}>
                    <Text style={[styles.perfPct, { color: '#ffffff' }, isPhone && { fontSize: 12 }]}>41%</Text>
                    <Text style={[styles.perfNote, isPhone && { fontSize: 8 }]}>Need 113 more</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* Machinery Exchange Card */}
            <LinearGradient
              colors={['#6b1a14', '#8b2219', '#4c110d']}
              start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
              style={[styles.perfCard, isPhone && styles.perfCardPhone]}
            >
              {/* Watermark pattern icon */}
              <View style={{ position: 'absolute', right: -16, bottom: -20, opacity: 0.08 }} pointerEvents="none">
                <Ionicons name="construct" size={140} color="#ffffff" />
              </View>
              {/* Diagonal dot pattern strip */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.04 }} pointerEvents="none">
                {[...Array(6)].map((_, r) => [...Array(10)].map((_, c) => (
                  <View key={`${r}-${c}`} style={{ position: 'absolute', left: c * 22 - 10, top: r * 22 - 10, width: 3, height: 3, borderRadius: 2, backgroundColor: '#fff' }} />
                )))}
              </View>
              <View style={[styles.perfHeader, isPhone && { marginBottom: 8 }]}>
                <View>
                  <Text style={[styles.perfTitle, { color: '#ffffff' }, isPhone && { fontSize: 10 }]}>MACHINERY EXCHANGE</Text>
                  <Text style={[styles.perfSubtitle, isPhone && { fontSize: 8 }]}>MTD & YTD PERFORMANCE</Text>
                </View>
                <View style={[styles.perfIconContainer, { backgroundColor: 'rgba(255,255,255,0.15)' }, isPhone && { width: 24, height: 24, borderRadius: 6 }]}>
                  <Ionicons name="trending-up" size={isPhone ? 12 : 14} color="#ffffff" />
                </View>
              </View>
              
              <View style={styles.perfBody}>
                <View style={styles.perfBlock}>
                  <Text style={styles.perfBlockTitle}>MONTH TO DATE</Text>
                  <View style={styles.perfBlockValues}>
                    <Text style={[styles.perfValue, isPhone && styles.perfValuePhone]}>4</Text>
                    <Text style={[styles.perfTarget, isPhone && { fontSize: 10 }]}>/ 18</Text>
                  </View>
                  <View style={[styles.perfBarBg, isPhone && { height: 6 }]}>
                    <Animated.View style={[styles.perfBarFill, {
                      width: mxMtdAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                      backgroundColor: 'rgba(255,255,255,0.82)',
                    }]} />
                  </View>
                  <View style={styles.perfBlockFooter}>
                    <Text style={[styles.perfPct, { color: '#ffffff' }, isPhone && { fontSize: 12 }]}>22%</Text>
                    <Text style={[styles.perfNote, isPhone && { fontSize: 8 }]}>Need 14 more</Text>
                  </View>
                </View>
                
                <View style={styles.perfDivider} />
                
                <View style={styles.perfBlock}>
                  <Text style={styles.perfBlockTitle}>YEAR TO DATE</Text>
                  <View style={styles.perfBlockValues}>
                    <Text style={[styles.perfValue, isPhone && styles.perfValuePhone]}>119</Text>
                    <Text style={[styles.perfTarget, isPhone && { fontSize: 10 }]}>/ 215</Text>
                  </View>
                  <View style={[styles.perfBarBg, isPhone && { height: 6 }]}>
                    <Animated.View style={[styles.perfBarFill, {
                      width: mxYtdAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                      backgroundColor: 'rgba(255,255,255,0.82)',
                    }]} />
                  </View>
                  <View style={styles.perfBlockFooter}>
                    <Text style={[styles.perfPct, { color: '#ffffff' }, isPhone && { fontSize: 12 }]}>55%</Text>
                    <Text style={[styles.perfNote, isPhone && { fontSize: 8 }]}>Need 96 more</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

        </View>

        {/* Quick Access Bar — single flat row of square buttons */}
        <View style={[styles.shortcutsFlat, { paddingHorizontal: hp, flexWrap: shortcutColumns === 4 ? 'wrap' : 'nowrap' }, isPhone && styles.shortcutsFlatPhone]}>
          <TouchableOpacity style={[styles.shortcutSquare, isPhone && styles.shortcutSquarePhone]} onPress={() => navigation.navigate('Salestrack Customers')}>
            <LinearGradient colors={['rgba(255,255,255,0.11)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill as any} />
            <Ionicons name="people-circle" size={isPhone ? 26 : 18} color="#ffffff" />
            <Text style={[styles.shortcutSquareText, isPhone && styles.shortcutSquareTextPhone]} numberOfLines={1}>Customers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shortcutSquare, isPhone && styles.shortcutSquarePhone]} onPress={() => navigation.navigate('Order Tracking')}>
            <LinearGradient colors={['rgba(255,255,255,0.11)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill as any} />
            <Ionicons name="cube" size={isPhone ? 26 : 18} color="#ffffff" />
            <Text style={[styles.shortcutSquareText, isPhone && styles.shortcutSquareTextPhone]} numberOfLines={1}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shortcutSquare, isPhone && styles.shortcutSquarePhone]} onPress={() => navigation.navigate('Salestrack Customers')}>
            <LinearGradient colors={['rgba(255,255,255,0.11)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill as any} />
            <Ionicons name="car-sport" size={isPhone ? 26 : 18} color="#ffffff" />
            <Text style={[styles.shortcutSquareText, isPhone && styles.shortcutSquareTextPhone]} numberOfLines={1}>Fleet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shortcutSquare, isPhone && styles.shortcutSquarePhone]} onPress={() => navigation.navigate('Customer Enquiries')}>
            <LinearGradient colors={['rgba(255,255,255,0.11)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill as any} />
            <Ionicons name="clipboard" size={isPhone ? 26 : 18} color="#ffffff" />
            <Text style={[styles.shortcutSquareText, isPhone && styles.shortcutSquareTextPhone]} numberOfLines={1}>Enquiries</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shortcutSquare, isPhone && styles.shortcutSquarePhone]} onPress={() => navigation.navigate('Certificates')}>
            <LinearGradient colors={['rgba(255,255,255,0.11)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill as any} />
            <Ionicons name="school" size={isPhone ? 26 : 18} color="#ffffff" />
            <Text style={[styles.shortcutSquareText, isPhone && styles.shortcutSquareTextPhone]} numberOfLines={1}>Certificates</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shortcutSquare, isPhone && styles.shortcutSquarePhone]} onPress={() => navigation.navigate('Training Library')}>
            <LinearGradient colors={['rgba(255,255,255,0.11)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill as any} />
            <Ionicons name="book" size={isPhone ? 26 : 18} color="#ffffff" />
            <Text style={[styles.shortcutSquareText, isPhone && styles.shortcutSquareTextPhone]} numberOfLines={1}>Library</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shortcutSquare, isPhone && styles.shortcutSquarePhone]} onPress={() => navigation.navigate('Visit History')}>
            <LinearGradient colors={['rgba(255,255,255,0.11)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill as any} />
            <Ionicons name="time" size={isPhone ? 26 : 18} color="#ffffff" />
            <Text style={[styles.shortcutSquareText, isPhone && styles.shortcutSquareTextPhone]} numberOfLines={1}>My Visits</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shortcutSquare, isPhone && styles.shortcutSquarePhone]} onPress={() => navigation.navigate('Aftersales')}>
            <LinearGradient colors={['rgba(255,255,255,0.11)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill as any} />
            <Ionicons name="clipboard-outline" size={isPhone ? 26 : 18} color="#f59e0b" />
            <Text style={[styles.shortcutSquareText, isPhone && styles.shortcutSquareTextPhone]} numberOfLines={1}>Aftersales</Text>
          </TouchableOpacity>
        </View>



        {/* OEM Logos Footer */}
        <View style={[styles.footerLogosContainer, isPhone && { marginBottom: 60 }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.footerScrollContent, isPhone && { gap: 14 }]}
          >
            <Image source={require('../../assets/landcross.jpg')} style={[styles.footerLogoItem, isPhone && styles.footerLogoItemPhone]} />
            <Image source={require('../../assets/fruehauf.png')} style={[styles.footerLogoItem, isPhone && styles.footerLogoItemPhone]} />
            <Image source={require('../../assets/shantui.png')} style={[styles.footerLogoItem, isPhone && styles.footerLogoItemPhone]} />
            <Image source={require('../../assets/foton.png')} style={[styles.footerLogoItem, isPhone && styles.footerLogoItemPhone]} />
            <Image source={require('../../assets/bobcat.png')} style={[styles.footerLogoItem, isPhone && styles.footerLogoItemPhone]} />
            <Image source={require('../../assets/wirtgen.png')} style={[styles.wirtgenLogoItem, isPhone && { height: 40, width: 50 }]} />
            <Image source={require('../../assets/weichai.png')} style={[styles.footerLogoItem, isPhone && styles.footerLogoItemPhone]} />
          </ScrollView>
        </View>

        </ScrollView>
      </View>

      {/* Floating Action Button — centered on phones, right-aligned on tablets */}
      <TouchableOpacity 
        style={[styles.fab, { bottom: Math.max(32, insets.bottom + 20) }, isPhone && { right: undefined, left: responsive.width / 2 - 32 }]} 
        onPress={() => navigation.navigate('Log Activity')}
      >
        <Ionicons name="add" size={32} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#4c110d', // Match the top of the gradient so bounces look seamless
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent', 
  },
  content: {
    paddingBottom: 40,
  },
  badgeContainer: {
    position: 'absolute', 
    top: 6, 
    right: 8, 
    backgroundColor: '#ef4444', 
    borderRadius: 10, 
    minWidth: 20, 
    height: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#61150f',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  innerContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  headerNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pillContainerInline: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
  },
  logoutBtnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutTextInline: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
  },
  headerCard: {
    padding: 24,
    paddingHorizontal: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    shadowColor: '#8b2219',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 20,
  },
  pillText: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
    flex: 1,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#8b2219',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
  },
  profileTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginBottom: 12,
  },
  // Phone-specific overrides
  perfCardPhone: {
    minWidth: 0,
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  perfValuePhone: {
    fontSize: 20,
    lineHeight: 22,
  },
  shortcutsFlatPhone: {
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  shortcutSquarePhone: {
    paddingVertical: 16,
    borderRadius: 14,
    minHeight: 72,
  },
  shortcutSquareTextPhone: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  footerLogoItemPhone: {
    height: 40,
    width: 80,
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  quickActionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
  },
  
  performanceRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  perfCard: {
    flex: 1,
    minWidth: 300,
    borderLeftWidth: 0,
    borderWidth: 0,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 12,
    paddingHorizontal: 16,
    shadowColor: '#8b2219',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  perfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  perfTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  perfSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  perfIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  perfBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  perfBlock: {
    flex: 1,
  },
  perfDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 12,
  },
  perfBlockTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  perfBlockValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  perfValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 28,
  },
  perfTarget: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '600',
    marginLeft: 4,
  },
  perfBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 4,
  },
  perfBarFill: {
    height: '100%',
    borderRadius: 99,
  },
  perfBlockFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  perfPct: {
    fontSize: 14,
    fontWeight: '900',
  },
  perfNote: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
  },

  shortcutsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  shortcutBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    width: '23%',
    minWidth: 70, 
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  shortcutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 8,
    textAlign: 'center',
  },
  shortcutsFlat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 6,
    marginBottom: 6,
    gap: 6,
  },
  shortcutSquare: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderTopColor: 'rgba(255,255,255,0.22)',
    borderRadius: 12,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  shortcutSquareText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 5,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  footerLogosContainer: {
    marginTop: 4,
    marginBottom: 80,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  footerSectionLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  footerScrollContent: {
    alignItems: 'center',
    gap: 20,
    paddingRight: 16,
  },
  footerLogoItem: {
    height: 80,
    width: 140,
    resizeMode: 'contain',
  },
  wirtgenLogoItem: {
    height: 80,
    width: 95,
    resizeMode: 'contain',
  },
  fab: {
    position: 'absolute',
    right: 32,
    backgroundColor: '#0f172a',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ceSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  ceSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
    gap: 8,
  },
  ceSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8b2219',
    flex: 1,
    letterSpacing: 0.3,
  },
  ceBadge: {
    backgroundColor: '#8b2219',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  ceBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  ceEmpty: {
    padding: 20,
    alignItems: 'center',
  },
  ceEmptyText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  ceCard: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'flex-start',
    gap: 12,
  },
  ceCardLeft: {
    flex: 1,
  },
  ceCardRight: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 90,
  },
  ceCustomer: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  ceDetails: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 4,
  },
  ceDate: {
    fontSize: 10,
    color: '#94a3b8',
  },
  ceStatusBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ceStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ceValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
  },
  headerStatusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingBottom: 12,
  },
  headerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  headerStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  headerStatusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  alertText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    flex: 1,
  },
  alertLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b45309',
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 24,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 16,
  },
});
