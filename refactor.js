const fs = require('fs');
const file = '../omnis-mobile/src/screens/SalesDashboardScreen.tsx';
let code = fs.readFileSync(file, 'utf8');

const returnStart = code.indexOf('return (\n    <IndustrialBackground>');
const endReturn = code.lastIndexOf('  );\n}');

if(returnStart > -1 && endReturn > -1) {
  const newReturn = `return (
    <View style={{ flex: 1, backgroundColor: TOKENS.bg }}>
      {/* ── FIXED MAROON HERO BACKGROUND ── */}
      <LinearGradient
        colors={['#7A1B22', '#5E1319']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 260 }}
      />
      <Image
        source={require('../../assets/images/omnis_hero_bg.png')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          width: '100%',
          height: insets.top + 260,
          opacity: 0.22,
        }}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(94, 19, 25, 0.98)', 'rgba(122, 27, 34, 0.72)', 'rgba(94, 19, 25, 0.95)']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 260 }}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.1)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 100 }}
      />

      {/* ── FIXED HERO CONTENT ── */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 260, zIndex: 2 }} pointerEvents="box-none">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: insets.top + 12 }}>
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <Image 
              source={require('../../assets/images/omnis-logo-white.png')} 
              style={{ height: 60, width: 140 }} 
              resizeMode="contain" 
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, flexShrink: 0 }}>
            <Pressable onPress={() => {}} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="notifications-outline" size={22} color="#fff" />
              {true && (
                <View style={{ position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 2, borderColor: '#5E1319' }} />
              )}
            </Pressable>
            <Pressable onPress={() => nav.navigate('Profile')} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="person-circle" size={27} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Sales Performance Card */}
        <View style={{ marginHorizontal: 20, marginTop: 20, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Sales Performance</Text>
              <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.6)" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={{ color: TOKENS.accentGold, fontSize: 14, fontWeight: '700' }}>Fair</Text>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900' }}>{efficiency || 0}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' }}>/100</Text>
            </View>
          </View>
          <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: \`\${Math.min(efficiency || 0, 100)}%\`, backgroundColor: TOKENS.accentGold, borderRadius: 3 }} />
          </View>
        </View>

        {/* 4-Stat Row */}
        <View style={{ flexDirection: 'row', marginHorizontal: 20, marginTop: 16 }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>{totalOpp}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '500', marginTop: 2 }}>Opportunities</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ position: 'absolute', left: 0, top: 4, bottom: 4, width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>{fmbTotal}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '500', marginTop: 2 }}>Active Orders</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ position: 'absolute', left: 0, top: 4, bottom: 4, width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>{winRate}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '500', marginTop: 2 }}>Win Rate</Text>
          </View>
        </View>
      </View>

      {/* ── FIXED WHITE SHEET — always anchored, content scrolls inside ── */}
      <View style={{
        position: 'absolute',
        top: insets.top + 260 - 24, // SHEET_TOP (overlap slightly)
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: TOKENS.bg,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        zIndex: 5,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 10,
      }}>
        <View style={{ width: 36, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginTop: 10 }} />

        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setRefreshing(true);
            await load();
            setRefreshing(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }} tintColor="#7A1B22" />}
        >
          {/* Quick Access Grid */}
          <View style={{ paddingVertical: 20 }}>
             <NavigationGrid
               nav={nav}
               load={load}
               onVoicePress={() => setVoiceOpen(true)}
               badges={{
                 Orders: fmbPastDue + fmbNearDue,
                 Fleet: bdTotal,
                 Enquiries: myHlCount,
               }}
             />
          </View>

          <View style={[styles.divider, { backgroundColor: TOKENS.border }]} />

          {/* Recent Activities Section (Tenders/Projects) */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: TOKENS.text }}>Recent Activities</Text>
              <Pressable style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fef2f2', borderRadius: 20 }}>
                <Text style={{ color: '#9A242E', fontWeight: '700', fontSize: 12 }}>View All</Text>
              </Pressable>
            </View>

            {[
              { id: 1, title: 'Tender Submitted: Mine Extension Project', sub: 'Excavator Fleet • Today, 09:30 AM', icon: 'document-text', color: '#2563eb', bg: '#dbeafe' },
              { id: 2, title: 'Project Won: Northern Mining Phase 2', sub: 'Bulldozers • Yesterday, 04:15 PM', icon: 'trophy', color: '#16a34a', bg: '#dcfce7' },
              { id: 3, title: 'Tender Evaluation: Quarry Logistics', sub: 'Loaders • Oct 12, 11:00 AM', icon: 'hourglass', color: '#ea580c', bg: '#ffedd5' },
              { id: 4, title: 'New Project Bid: Highway Construction', sub: 'Cranes • Oct 10, 08:45 AM', icon: 'business', color: '#8b5cf6', bg: '#ede9fe' },
            ].map((item, index) => (
              <Pressable key={item.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: index === 3 ? 0 : 1, borderBottomColor: TOKENS.border }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: TOKENS.text }}>{item.title}</Text>
                  <Text style={{ fontSize: 11, color: TOKENS.textMuted, marginTop: 3 }}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={TOKENS.textMuted} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Re-add the Modals that were in the original return */}
      <OmnisVoiceUI
        visible={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onSave={(data) => {
          console.log('Saving voice data:', data);
          setVoiceOpen(false);
          Alert.alert('Success', 'Visit note extracted and logged.');
        }}
      />
    </View>`;
  const before = code.substring(0, returnStart);
  const after = code.substring(endReturn + 5);
  fs.writeFileSync(file, before + newReturn + after);
  console.log('Successfully refactored layout.');
} else {
  console.log('Could not find boundaries.');
}
