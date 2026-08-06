import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, FlatList, ScrollView, TextInput, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'react-native';
import { supabase } from '../api/supabaseClient';
import MachineSearch from '../components/MachineSearch';

export default function InitialServiceReportScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newItem, setNewItem] = useState<any>({});
  
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    
    while (true) {
      let q = supabase.from('ft_machine').select('*').eq('track_initial_service', 'Yes').range(from, from + step - 1);
      const { data: res, error } = await q;
      if (error || !res || res.length === 0) break;
      allData = [...allData, ...res];
      if (res.length < step) break;
      from += step;
    }
    
    setData(allData);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newItem.machine) return;
    const { error } = await supabase.from('ft_machine').insert([{ ...newItem  }]);
    if (!error) {
      setAddModalVisible(false);
      setNewItem({});
      fetchData();
    }
  };

  const filteredData = data.filter(item => {
    const q = search.toLowerCase();
    const matchesSearch = Object.values(item).some(v => String(v).toLowerCase().includes(q));
    const status = (item.status || '').toLowerCase();
    const matchesFilter = filter === 'All' || status === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <LinearGradient colors={['#ffffff', '#f1f5f9']} style={[styles.safeArea, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient 
        colors={['#4c110d', '#8b2219', '#6b1a14']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Fleetrack Dashboard')}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Initial Service Report</Text>
      </LinearGradient>

      <View style={styles.container}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#94a3b8" />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 32, gap: 8 }}>
          {['All', 'Open', 'Closed', 'Resolved', 'Active', 'Scheduled'].map(f => (
            <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 40 }} />
        ) : (
          <View style={{ flex: 1, paddingHorizontal: 16 }}>
            <View>
              {/* Header Row */}
              <View style={styles.tableHeader}>
                <Text style={styles.headerCell}>Machine</Text>
                <Text style={styles.headerCell}>S/N</Text>
                <Text style={styles.headerCell}>OEM</Text>
                <Text style={styles.headerCell}>Tracking</Text>
              </View>
              {/* Table Body */}
              <FlatList
                data={filteredData}
                keyExtractor={(item, idx) => item.id?.toString() || idx.toString()}
                renderItem={({ item }) => (
                  <View style={styles.tableRow}>
                    
                    <View style={styles.cell}>
                      <Text style={styles.cellText} numberOfLines={2}>{item.name || '-'}</Text>
                    </View>
                    <View style={styles.cell}>
                      <Text style={styles.cellText} numberOfLines={2}>{item.sn || '-'}</Text>
                    </View>
                    <View style={styles.cell}>
                      <Text style={styles.cellText} numberOfLines={2}>{item.oem || '-'}</Text>
                    </View>
                    <View style={styles.cell}>
                      <Text style={styles.cellText} numberOfLines={2}>{item.track_initial_service || '-'}</Text>
                    </View>
                  </View>
                )}
                contentContainerStyle={{ paddingBottom: 100 }}
              />
            </View>
          </View>
        )}
      </View>

      
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  container: { flex: 1, backgroundColor: 'transparent' },
  searchRow: { padding: 16, paddingBottom: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#e2e8f0',
    borderRadius: 8, paddingHorizontal: 12, height: 40
  },
  searchInput: { flex: 1, marginLeft: 8, color: '#0f172a', fontSize: 15 },
  filterRow: { maxHeight: 50, marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#cbd5e1'
  },
  filterChipActive: { backgroundColor: '#f59e0b', borderColor: '#d97706' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  filterTextActive: { color: '#fff' },
  
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  headerCell: { flex: 1, fontSize: 9, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', borderLeftWidth: 4, marginBottom: 6, alignItems: 'center' },
  cell: { flex: 1, paddingRight: 8 },
  cellText: { fontSize: 12, fontWeight: '700', color: '#334155' },

  fab: {
    position: 'absolute', bottom: 32, right: 24, width: 56, height: 56,
    borderRadius: 28, backgroundColor: '#f59e0b', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6
  },
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'
  },
  modalContainer: {
    backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '80%', paddingBottom: 24
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0'
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  modalBody: { padding: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 8, padding: 12, fontSize: 15, color: '#0f172a'
  },
  submitBtn: {
    backgroundColor: '#f59e0b', borderRadius: 8, padding: 14,
    alignItems: 'center', marginTop: 24, marginBottom: 40
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
