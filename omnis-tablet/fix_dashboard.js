const fs = require('fs');
let content = fs.readFileSync('src/screens/FleetrackDashboardScreen.tsx', 'utf8');

// 1. Replace states
content = content.replace(
  /const \[openDefects, setOpenDefects\] = useState\(0\);\n  const \[totalDefects, setTotalDefects\] = useState\(0\);\n  const \[activeBreakdowns, setActiveBreakdowns\] = useState\(0\);\n  const \[totalBreakdowns, setTotalBreakdowns\] = useState\(0\);\n  const \[openInitialServices, setOpenInitialServices\] = useState\(0\);\n  const \[totalInitialServices, setTotalInitialServices\] = useState\(0\);\n  const \[activeServicePlans, setActiveServicePlans\] = useState\(0\);\n  const \[totalServicePlans, setTotalServicePlans\] = useState\(0\);/,
  `const [spDefectsOpen, setSpDefectsOpen] = useState(0);
  const [spDefectsTotal, setSpDefectsTotal] = useState(0);
  const [spBreakdownsActive, setSpBreakdownsActive] = useState(0);
  const [spBreakdownsTotal, setSpBreakdownsTotal] = useState(0);
  const [mxDefectsOpen, setMxDefectsOpen] = useState(0);
  const [mxDefectsTotal, setMxDefectsTotal] = useState(0);
  const [mxBreakdownsActive, setMxBreakdownsActive] = useState(0);
  const [mxBreakdownsTotal, setMxBreakdownsTotal] = useState(0);`
);

// 2. Replace anims
content = content.replace(
  /const defectAnim = useRef\(new Animated\.Value\(0\)\)\.current;\n  const breakdownAnim = useRef\(new Animated\.Value\(0\)\)\.current;\n  const isAnim = useRef\(new Animated\.Value\(0\)\)\.current;\n  const spAnim = useRef\(new Animated\.Value\(0\)\)\.current;/,
  `const spDefectAnim = useRef(new Animated.Value(0)).current;
  const spBreakdownAnim = useRef(new Animated.Value(0)).current;
  const mxDefectAnim = useRef(new Animated.Value(0)).current;
  const mxBreakdownAnim = useRef(new Animated.Value(0)).current;`
);

// 3. Replace fetchCounts logic
const fetchCountsReplacement = `// Fetch machines for mapping
      let allMachines = [];
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
      let defects = [];
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

      const spOpenD = spDefects.filter(d => d.status && d.status.toLowerCase() !== 'closed').length;
      setSpDefectsOpen(spOpenD);
      setSpDefectsTotal(spDefects.length);
      Animated.timing(spDefectAnim, { toValue: spDefects.length > 0 ? (spDefects.length - spOpenD) / spDefects.length : 0, duration: 900, useNativeDriver: false }).start();

      const mxOpenD = mxDefects.filter(d => d.status && d.status.toLowerCase() !== 'closed').length;
      setMxDefectsOpen(mxOpenD);
      setMxDefectsTotal(mxDefects.length);
      Animated.timing(mxDefectAnim, { toValue: mxDefects.length > 0 ? (mxDefects.length - mxOpenD) / mxDefects.length : 0, duration: 900, useNativeDriver: false }).start();

      // Fetch Breakdowns
      let breakdowns = [];
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
`;
const oldFetchRegex = /\/\/ Fetch Defects[\s\S]*?(?=const \{ count: lateCount \} = await supabase)/;
content = content.replace(oldFetchRegex, fetchCountsReplacement);

// 4. Replace Cards
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
              </LinearGradient>`;

const oldCardsRegex = /<LinearGradient[\s\S]*?\{\/\* Quick Access Bar — single flat row of square buttons \*\/\}/;
content = content.replace(oldCardsRegex, newCards + '\n            </View>\n\n          </View>\n          \n{/* Quick Access Bar — single flat row of square buttons */}');

fs.writeFileSync('src/screens/FleetrackDashboardScreen.tsx', content);
console.log('done');
