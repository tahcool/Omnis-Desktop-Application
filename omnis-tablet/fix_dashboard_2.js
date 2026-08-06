const fs = require('fs');

const headerCardStr = `
        {/* Top Header Row: Red Profile Card + KPIs */}
        <LinearGradient
          colors={['#4c110d', '#8b2219', '#6b1a14']}
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
`;

const newCards = `<LinearGradient
                colors={['#4c110d', '#8b2219', '#6b1a14']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.perfCard}
              >
                <View style={{ position: 'absolute', right: -16, bottom: -20, opacity: 0.08 }} pointerEvents="none">
                  <Ionicons name="trending-up" size={140} color="#ffffff" />
                </View>
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.04 }} pointerEvents="none">
                  {[...Array(6)].map((_, r) => [...Array(10)].map((_, c) => (
                    <View key={\`sp-\${r}-\${c}\`} style={{ position: 'absolute', left: c * 22 - 10, top: r * 22 - 10, width: 3, height: 3, borderRadius: 2, backgroundColor: '#fff' }} />
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
                      <Text style={styles.perfTarget}>/ {spDefectsTotal}</Text>
                    </View>
                    <View style={styles.perfBarBg}>
                      <Animated.View style={[styles.perfBarFill, {
                        width: spDefectAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                        backgroundColor: 'rgba(255,255,255,0.82)',
                      }]} />
                    </View>
                    <View style={styles.perfBlockFooter}>
                      <Text style={[styles.perfPct, { color: '#ffffff' }]}>{spDefectsTotal > 0 ? Math.round(((spDefectsTotal - spDefectsOpen)/spDefectsTotal)*100) : 0}%</Text>
                      <Text style={styles.perfNote}>Efficiency (Closed)</Text>
                    </View>
                  </View>
                  
                  <View style={styles.perfDivider} />
                  
                  {/* Breakdowns */}
                  <View style={styles.perfBlock}>
                    <Text style={styles.perfBlockTitle}>BREAKDOWNS</Text>
                    <View style={styles.perfBlockValues}>
                      <Text style={styles.perfValue}>{spBreakdownsActive}</Text>
                      <Text style={styles.perfTarget}>/ {spBreakdownsTotal}</Text>
                    </View>
                    <View style={styles.perfBarBg}>
                      <Animated.View style={[styles.perfBarFill, {
                        width: spBreakdownAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                        backgroundColor: 'rgba(255,255,255,0.82)',
                      }]} />
                    </View>
                    <View style={styles.perfBlockFooter}>
                      <Text style={[styles.perfPct, { color: '#ffffff' }]}>{spBreakdownsTotal > 0 ? Math.round(((spBreakdownsTotal - spBreakdownsActive)/spBreakdownsTotal)*100) : 0}%</Text>
                      <Text style={styles.perfNote}>Efficiency (Resolved)</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>

              {/* Machinery Exchange Card */}
              <LinearGradient
                colors={['#1e3a8a', '#1e40af', '#172554']}
                start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
                style={styles.perfCard}
              >
                <View style={{ position: 'absolute', right: -16, bottom: -20, opacity: 0.08 }} pointerEvents="none">
                  <Ionicons name="construct" size={140} color="#ffffff" />
                </View>
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.04 }} pointerEvents="none">
                  {[...Array(6)].map((_, r) => [...Array(10)].map((_, c) => (
                    <View key={\`mx-\${r}-\${c}\`} style={{ position: 'absolute', left: c * 22 - 10, top: r * 22 - 10, width: 3, height: 3, borderRadius: 2, backgroundColor: '#fff' }} />
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
          
{/* Quick Access Bar — single flat row of square buttons */}`;

let content = fs.readFileSync('src/screens/FleetrackDashboardScreen.tsx', 'utf8');

// I will just replace from `<ScrollView style={{ flex: 1 }}` to `Quick Access Bar`
const regex = /<ScrollView style={{ flex: 1 }} contentContainerStyle={styles\.content} bounces={false} scrollEnabled={false}>[\s\S]*?\{\/\* Quick Access Bar — single flat row of square buttons \*\/\}/;

content = content.replace(regex, `<ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} bounces={false} scrollEnabled={false}>\n` + headerCardStr + newCards);

fs.writeFileSync('src/screens/FleetrackDashboardScreen.tsx', content);
console.log('done');
