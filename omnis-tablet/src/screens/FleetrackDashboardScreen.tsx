import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, ImageBackground, StatusBar, Image } from 'react-native';
import { supabase, getCurrentUserProfile } from '../api/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { registerForPushNotificationsAsync } from '../services/NotificationService';
import { getSyncQueue } from '../database/db';
import { BlurView } from 'expo-blur';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useFocusEffect } from '@react-navigation/native';

export default function FleetrackDashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [userName, setUserName] = useState('Administrator');
  const [greeting, setGreeting] = useState('Good morning');
  const [currentDate, setCurrentDate] = useState('');
  const [lateOrders, setLateOrders] = useState(0);
  const [spDefectsOpen, setSpDefectsOpen] = useState(0);
  const [spDefectsTotal, setSpDefectsTotal] = useState(0);
  const [spBreakdownsActive, setSpBreakdownsActive] = useState(0);
  const [spBreakdownsTotal, setSpBreakdownsTotal] = useState(0);
  const [mxDefectsOpen, setMxDefectsOpen] = useState(0);
  const [mxDefectsTotal, setMxDefectsTotal] = useState(0);
  const [mxBreakdownsActive, setMxBreakdownsActive] = useState(0);
  const [mxBreakdownsTotal, setMxBreakdownsTotal] = useState(0);
  const [openEnquiries, setOpenEnquiries] = useState(0);
  const [overdueVisits, setOverdueVisits] = useState(0);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [fabModalVisible, setFabModalVisible] = useState(false);
  const screenWidth = Dimensions.get('window').width;

  // Animated values for progress bars (0→1 on mount)
  const spDefectAnim = useRef(new Animated.Value(0)).current;
  const spBreakdownAnim = useRef(new Animated.Value(0)).current;
  const mxDefectAnim = useRef(new Animated.Value(0)).current;
  const mxBreakdownAnim = useRef(new Animated.Value(0)).current;

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
    

    // Fetch live counts on mount (also called from useFocusEffect on every return)
  }, []);

  // ── Refresh pills on every screen focus ───────────────────────────────────
  const fetchCounts = React.useCallback(async () => {
    try {

      // Fetch machines for mapping
      let allMachines: any[] = [];
      let mFrom = 0;
      const mStep = 1000;
      while (true) {
        const { data: mRes } = await supabase.from('ft_machine').select('name, sn, division').range(mFrom, mFrom + mStep - 1);
        if (!mRes || mRes.length === 0) break;
        allMachines = [...allMachines, ...mRes];
        if (mRes.length < mStep) break;
        mFrom += mStep;
      }
      const getDivision = (nameOrSn) => {
        if (!nameOrSn) return 'fleetrack';
        const match = allMachines.find(m => m.name === nameOrSn || m.sn === nameOrSn);
        return match?.division?.toLowerCase() || 'fleetrack';
      };

      // Fetch Defects
      let defects: any[] = [];
      let dFrom = 0;
      const dStep = 1000;
      while (true) {
        const { data: dRes } = await supabase.from('ft_defect').select('status, machine, customer').range(dFrom, dFrom + dStep - 1);
        if (!dRes || dRes.length === 0) break;
        defects = [...defects, ...dRes];
        if (dRes.length < dStep) break;
        dFrom += dStep;
      }
      
      const spDefects = defects.filter(d => getDivision(d.machine) === 'sinopower' || (d.customer && d.customer.toLowerCase().includes('sinopower')));
      const mxDefects = defects.filter(d => !spDefects.includes(d));

      const spOpenD = spDefects.filter(d => d.status && d.status.toLowerCase() !== 'closed' && d.status.toLowerCase() !== 'resolved').length;
      setSpDefectsOpen(spOpenD);
      setSpDefectsTotal(spDefects.length);
      Animated.timing(spDefectAnim, { toValue: spDefects.length > 0 ? (spDefects.length - spOpenD) / spDefects.length : 0, duration: 900, useNativeDriver: false }).start();

      const mxOpenD = mxDefects.filter(d => d.status && d.status.toLowerCase() !== 'closed' && d.status.toLowerCase() !== 'resolved').length;
      setMxDefectsOpen(mxOpenD);
      setMxDefectsTotal(mxDefects.length);
      Animated.timing(mxDefectAnim, { toValue: mxDefects.length > 0 ? (mxDefects.length - mxOpenD) / mxDefects.length : 0, duration: 900, useNativeDriver: false }).start();

      // Fetch Breakdowns
      let breakdowns: any[] = [];
      let bFrom = 0;
      const bStep = 1000;
      while (true) {
        const { data: bRes } = await supabase.from('ft_breakdown_logs').select('status, breakdown_end_date, division, machine').range(bFrom, bFrom + bStep - 1);
        if (!bRes || bRes.length === 0) break;
        breakdowns = [...breakdowns, ...bRes];
        if (bRes.length < bStep) break;
        bFrom += bStep;
      }

      const spBreakdowns = breakdowns.filter(b => (b.division && b.division.toLowerCase() === 'sinopower') || getDivision(b.machine) === 'sinopower');
      const mxBreakdowns = breakdowns.filter(b => !spBreakdowns.includes(b));

      const spActiveB = spBreakdowns.filter(b => b.breakdown_end_date === null && (!b.status || (b.status.toLowerCase() !== 'resolved' && b.status.toLowerCase() !== 'closed'))).length;
      setSpBreakdownsActive(spActiveB);
      setSpBreakdownsTotal(spBreakdowns.length);
      Animated.timing(spBreakdownAnim, { toValue: spBreakdowns.length > 0 ? (spBreakdowns.length - spActiveB) / spBreakdowns.length : 0, duration: 900, useNativeDriver: false }).start();

      const mxActiveB = mxBreakdowns.filter(b => b.breakdown_end_date === null && (!b.status || (b.status.toLowerCase() !== 'resolved' && b.status.toLowerCase() !== 'closed'))).length;
      setMxBreakdownsActive(mxActiveB);
      setMxBreakdownsTotal(mxBreakdowns.length);
      Animated.timing(mxBreakdownAnim, { toValue: mxBreakdowns.length > 0 ? (mxBreakdowns.length - mxActiveB) / mxBreakdowns.length : 0, duration: 900, useNativeDriver: false }).start();
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

  // Lock to landscape when this screen is focused, unlock when leaving
  useFocusEffect(
    React.useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      fetchCounts(); // ← refresh Late Orders + Open Enquiries every time screen is focused
      return () => {
        ScreenOrientation.unlockAsync();
      };
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
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} bounces={false} scrollEnabled={false}>

        {/* Top Header Row: Red Profile Card + KPIs */}
        <LinearGradient
          colors={['#3d0b09', '#6d1612', '#52110d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerCard, { paddingTop: insets.top + 10 }]}
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
          
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            
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
                    style={[styles.quickActionBtn, { backgroundColor: '#f59e0b', borderColor: '#f59e0b' }]}
                    onPress={() => navigation.navigate('Dashboard')}
                  >
                    <Ionicons name="swap-horizontal" size={12} color="#fff" />
                    <Text style={[styles.quickActionText, { color: '#ffffff' }]}>Salestrack</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Right Side: Omnis Logo — premium glow on letters only */}
            <View style={{ justifyContent: 'center', alignItems: 'flex-end', minHeight: 75, marginLeft: 16, marginTop: 20 }}>
              {/* Glow lives on the Image shadow, not a container */}
              <View style={{
                shadowColor: '#ffffff',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.35,
                shadowRadius: 18,
              }}>
                <Image
                  source={require('../../assets/omnis-logo-white.png')}
                  style={{ width: 300, height: 75, resizeMode: 'contain' }}
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
          </View>

        </LinearGradient>

        <View style={styles.innerContent}>

          {/* Performance Cards Row */}
          <View style={styles.performanceRow}>
<LinearGradient
                colors={['#4c110d', '#8b2219', '#6b1a14']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.perfCard}
              >
                <View style={{ position: 'absolute', right: -16, bottom: -20, opacity: 0.08 }} pointerEvents="none">
                  <Ionicons name="trending-up" size={140} color="#ffffff" />
                </View>
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.04 }} pointerEvents="none">
                  {[...Array(6)].map((_, r) => [...Array(10)].map((_, c) => (
                    <View key={`sp-${r}-${c}`} style={{ position: 'absolute', left: c * 22 - 10, top: r * 22 - 10, width: 3, height: 3, borderRadius: 2, backgroundColor: '#fff' }} />
                  )))}
                </View>
                <View style={styles.perfHeader}>
                  <View>
                    <Text style={[styles.perfTitle, { color: '#ffffff' }]}>SINOPOWER</Text>
                    <Text style={styles.perfSubtitle}>DEFECTS & BREAKDOWNS</Text>
                  </View>
                  <View style={[styles.perfIconContainer, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                    <Ionicons name="trending-up" size={14} color="#ffffff" />
                  </View>
                </View>
                
                <View style={styles.perfBody}>
                  {/* Defects */}
                  <View style={styles.perfBlock}>
                    <Text style={styles.perfBlockTitle}>DEFECTS</Text>
                    <View style={styles.perfBlockValues}>
                      <Text style={styles.perfValue}>{spDefectsOpen}</Text>
                      <Text style={styles.perfTarget}> Open</Text>
                    </View>
                    <View style={styles.perfBarBg}>
                      <Animated.View style={[styles.perfBarFill, {
                        width: spDefectAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                        backgroundColor: 'rgba(255,255,255,0.82)',
                      }]} />
                    </View>
                    <View style={styles.perfBlockFooter}>
                      <Text style={[styles.perfPct, { color: '#ffffff' }]}>{spDefectsTotal > 0 ? Math.round(((spDefectsTotal - spDefectsOpen)/spDefectsTotal)*100) : 0}%</Text>
                      <Text style={styles.perfNote}>Resolution Rate</Text>
                    </View>
                  </View>
                  
                  <View style={styles.perfDivider} />
                  
                  {/* Breakdowns */}
                  <View style={styles.perfBlock}>
                    <Text style={styles.perfBlockTitle}>BREAKDOWNS</Text>
                    <View style={styles.perfBlockValues}>
                      <Text style={styles.perfValue}>{spBreakdownsActive}</Text>
                      <Text style={styles.perfTarget}> Active</Text>
                    </View>
                    <View style={styles.perfBarBg}>
                      <Animated.View style={[styles.perfBarFill, {
                        width: spBreakdownAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                        backgroundColor: 'rgba(255,255,255,0.82)',
                      }]} />
                    </View>
                    <View style={styles.perfBlockFooter}>
                      <Text style={[styles.perfPct, { color: '#ffffff' }]}>{spBreakdownsTotal > 0 ? Math.round(((spBreakdownsTotal - spBreakdownsActive)/spBreakdownsTotal)*100) : 0}%</Text>
                      <Text style={styles.perfNote}>Resolution Rate</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>

              {/* Machinery Exchange Card */}
              <LinearGradient
                colors={['#4c110d', '#8b2219', '#6b1a14']}
                start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
                style={styles.perfCard}
              >
                <View style={{ position: 'absolute', right: -16, bottom: -20, opacity: 0.08 }} pointerEvents="none">
                  <Ionicons name="construct" size={140} color="#ffffff" />
                </View>
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.04 }} pointerEvents="none">
                  {[...Array(6)].map((_, r) => [...Array(10)].map((_, c) => (
                    <View key={`mx-${r}-${c}`} style={{ position: 'absolute', left: c * 22 - 10, top: r * 22 - 10, width: 3, height: 3, borderRadius: 2, backgroundColor: '#fff' }} />
                  )))}
                </View>
                <View style={styles.perfHeader}>
                  <View>
                    <Text style={[styles.perfTitle, { color: '#ffffff' }]}>MACHINERY EXCHANGE</Text>
                    <Text style={styles.perfSubtitle}>DEFECTS & BREAKDOWNS</Text>
                  </View>
                  <View style={[styles.perfIconContainer, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                    <Ionicons name="construct" size={14} color="#ffffff" />
                  </View>
                </View>
                
                <View style={styles.perfBody}>
                  {/* Defects */}
                  <View style={styles.perfBlock}>
                    <Text style={styles.perfBlockTitle}>DEFECTS</Text>
                    <View style={styles.perfBlockValues}>
                      <Text style={styles.perfValue}>{mxDefectsOpen}</Text>
                      <Text style={styles.perfTarget}>/ {mxDefectsTotal}</Text>
                    </View>
                    <View style={styles.perfBarBg}>
                      <Animated.View style={[styles.perfBarFill, {
                        width: mxDefectAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                        backgroundColor: 'rgba(255,255,255,0.82)',
                      }]} />
                    </View>
                    <View style={styles.perfBlockFooter}>
                      <Text style={[styles.perfPct, { color: '#ffffff' }]}>{mxDefectsTotal > 0 ? Math.round(((mxDefectsTotal - mxDefectsOpen)/mxDefectsTotal)*100) : 0}%</Text>
                      <Text style={styles.perfNote}>Efficiency (Closed)</Text>
                    </View>
                  </View>

                  <View style={styles.perfDivider} />
                  
                  {/* Breakdowns */}
                  <View style={styles.perfBlock}>
                    <Text style={styles.perfBlockTitle}>BREAKDOWNS</Text>
                    <View style={styles.perfBlockValues}>
                      <Text style={styles.perfValue}>{mxBreakdownsActive}</Text>
                      <Text style={styles.perfTarget}>/ {mxBreakdownsTotal}</Text>
                    </View>
                    <View style={styles.perfBarBg}>
                      <Animated.View style={[styles.perfBarFill, {
                        width: mxBreakdownAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                        backgroundColor: 'rgba(255,255,255,0.82)',
                      }]} />
                    </View>
                    <View style={styles.perfBlockFooter}>
                      <Text style={[styles.perfPct, { color: '#ffffff' }]}>{mxBreakdownsTotal > 0 ? Math.round(((mxBreakdownsTotal - mxBreakdownsActive)/mxBreakdownsTotal)*100) : 0}%</Text>
                      <Text style={styles.perfNote}>Efficiency (Resolved)</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>

          </View>
          
{/* Quick Access Bar — single flat row of square buttons */}
        <View style={styles.shortcutsFlat}>
          <TouchableOpacity style={styles.shortcutSquare} onPress={() => navigation.navigate('Breakdowns')}>
            <LinearGradient colors={['rgba(255,255,255,0.11)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill as any} />
            <Ionicons name="warning" size={18} color="#ffffff" />
            <Text style={styles.shortcutSquareText} numberOfLines={1}>Breakdowns</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shortcutSquare} onPress={() => navigation.navigate('Defects')}>
            <LinearGradient colors={['rgba(255,255,255,0.11)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill as any} />
            <Ionicons name="bug" size={18} color="#ffffff" />
            <Text style={styles.shortcutSquareText} numberOfLines={1}>Defects</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shortcutSquare} onPress={() => navigation.navigate('Service Tracking')}>
            <LinearGradient colors={['rgba(255,255,255,0.11)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill as any} />
            <Ionicons name="build" size={18} color="#ffffff" />
            <Text style={styles.shortcutSquareText} numberOfLines={1}>Service Tracking</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shortcutSquare} onPress={() => navigation.navigate('Initial Service Report')}>
            <LinearGradient colors={['rgba(255,255,255,0.11)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill as any} />
            <Ionicons name="document-text" size={18} color="#ffffff" />
            <Text style={styles.shortcutSquareText} numberOfLines={1}>ISR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shortcutSquare} onPress={() => navigation.navigate('Machine Registry')}>
            <LinearGradient colors={['rgba(255,255,255,0.11)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill as any} />
            <Ionicons name="cog" size={18} color="#ffffff" />
            <Text style={styles.shortcutSquareText} numberOfLines={1}>Registry</Text>
          </TouchableOpacity>

        </View>



        {/* OEM Logos Footer */}
        <View style={styles.footerLogosContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.footerScrollContent}
          >
            <Image source={require('../../assets/landcross.jpg')} style={styles.footerLogoItem} />
            <Image source={require('../../assets/fruehauf.png')} style={styles.footerLogoItem} />
            <Image source={require('../../assets/shantui.png')} style={styles.footerLogoItem} />
            <Image source={require('../../assets/foton.png')} style={styles.footerLogoItem} />
            <Image source={require('../../assets/bobcat.png')} style={styles.footerLogoItem} />
            <Image source={require('../../assets/wirtgen.png')} style={styles.wirtgenLogoItem} />
            <Image source={require('../../assets/weichai.png')} style={styles.footerLogoItem} />
          </ScrollView>
        </View>

        </ScrollView>
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { bottom: Math.max(32, insets.bottom + 20) }]} 
        onPress={() => setFabModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="#ffffff" />
      </TouchableOpacity>

      {/* FAB Modal for Fleetrack Actions */}
      {fabModalVisible && (
        <TouchableOpacity 
          style={StyleSheet.absoluteFill as any} 
          activeOpacity={1} 
          onPress={() => setFabModalVisible(false)}
        >
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill as any}>
            <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', paddingRight: 32, paddingBottom: Math.max(32, insets.bottom + 20) + 74 }}>
              <View style={{ gap: 12, alignItems: 'flex-end' }}>
                <TouchableOpacity style={styles.fabOptionItem} onPress={() => { setFabModalVisible(false); navigation.navigate('Breakdowns'); }}>
                  <Text style={styles.fabOptionText}>Add Breakdown</Text>
                  <View style={styles.fabOptionIcon}>
                    <Ionicons name="warning" size={20} color="#ffffff" />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.fabOptionItem} onPress={() => { setFabModalVisible(false); navigation.navigate('Defects'); }}>
                  <Text style={styles.fabOptionText}>Add Defect</Text>
                  <View style={styles.fabOptionIcon}>
                    <Ionicons name="bug" size={20} color="#ffffff" />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.fabOptionItem} onPress={() => { setFabModalVisible(false); navigation.navigate('Service Tracking'); }}>
                  <Text style={styles.fabOptionText}>Add Service Plan</Text>
                  <View style={styles.fabOptionIcon}>
                    <Ionicons name="build" size={20} color="#ffffff" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </TouchableOpacity>
      )}
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
  fabOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fabOptionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  fabOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8b2219',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
