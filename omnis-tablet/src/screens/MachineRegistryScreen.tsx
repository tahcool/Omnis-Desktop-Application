import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, ScrollView, TextInput, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'react-native';
import { supabase } from '../api/supabaseClient';
import MachineSearch from '../components/MachineSearch';

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default function MachineRegistryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [groupByCustomer, setGroupByCustomer] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newItem, setNewItem] = useState<any>({});
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    
    while (true) {
      const { data: res, error } = await supabase.from('ft_machine').select('*').range(from, from + step - 1);
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
    const { error } = await supabase.from('ft_machine').insert([{ ...newItem }]);
    if (!error) {
      setAddModalVisible(false);
      setNewItem({});
      fetchData();
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const q = search.toLowerCase();
      const matchSearch = 
        (item.sn || '').toLowerCase().includes(q) ||
        (item.fleet_no || '').toLowerCase().includes(q) ||
        (item.name || '').toLowerCase().includes(q) ||
        (item.model || '').toLowerCase().includes(q) ||
        (item.customer || '').toLowerCase().includes(q);
        
      const status = (item.status || '').toLowerCase();
      const matchesFilter = filter === 'All' || status === filter.toLowerCase();
      
      const div = (item.division || '').toLowerCase();
      const matchesDivision = divisionFilter === 'All' || 
                              (divisionFilter === 'Machinery Exchange' && div === 'fleetrack') || 
                              (divisionFilter === 'Sinopower' && div === 'sinopower');
      
      return matchSearch && matchesFilter && matchesDivision;
    });
  }, [data, search, filter, divisionFilter]);

  const renderData = useMemo(() => {
    if (!groupByCustomer) return filteredData;
    
    // Group by customer
    const grouped = filteredData.reduce((acc, curr) => {
      const cust = curr.customer || 'Unknown Customer';
      if (!acc[cust]) acc[cust] = [];
      acc[cust].push(curr);
      return acc;
    }, {} as Record<string, any[]>);
    
    let result: any[] = [];
    Object.entries(grouped).forEach(([cust, items]) => {
      const typedItems = items as any[];
      result.push({ isHeader: true, customer: cust, count: typedItems.length, id: 'header_' + cust });
      result.push(...typedItems);
    });
    return result;
  }, [filteredData, groupByCustomer]);

  const renderRow = ({ item, index }: any) => {
    if (item.isHeader) {
      return (
        <View style={styles.groupHeaderRow}>
          <Text style={styles.groupHeaderText}>{item.customer} ({item.count} Machines)</Text>
        </View>
      );
    }
    
    let imageUrl = null;
    if (item.machine_picture && item.machine_picture.startsWith('http')) {
       imageUrl = item.machine_picture;
    } else {
       // Point directly to Supabase bucket like the desktop app
       const sn = item.sn || (item.name ? item.name.replace(/[^a-zA-Z0-9]/g, '_') : '');
       if (sn) {
         imageUrl = `https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/machine-images/${sn}/cover.jpeg`;
       }
    }

    const isOverdue = (item.hours_remaining_to_service || 0) < 0;

    return (
      <View style={styles.tableRow}>
        <View style={styles.cellIndex}>
          <Text style={styles.cellTextSmallBold}>{index + 1}</Text>
        </View>
        
        <View style={styles.cellCustomer}>
          <Text style={styles.cellTextBold} numberOfLines={2}>{item.customer || '-'}</Text>
        </View>

        <View style={styles.cellImg}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderImg}>
              <Ionicons name="image-outline" size={20} color="#94a3b8" />
            </View>
          )}
        </View>

        <View style={styles.cellMachine}>
          <Text style={styles.cellTextBold} numberOfLines={1}>{item.sn || '-'}</Text>
          <Text style={styles.cellTextSmall} numberOfLines={1}>Model: {item.model || '-'}</Text>
          <Text style={styles.cellTextSmall} numberOfLines={1}>SN: {item.sn || '-'}</Text>
          <Text style={styles.cellTextSmall} numberOfLines={1}>Fleet: {item.fleet_no || '-'}</Text>
          <Text style={styles.cellTextSmall} numberOfLines={1}>Region: {item.region || '-'}</Text>
        </View>

        <View style={styles.cellService}>
          <Text style={styles.cellTextSmall} numberOfLines={1}>Obligation: {item.service_obligation || 'Not Specified'}</Text>
          <Text style={styles.cellTextSmall} numberOfLines={1}>Last Serviced: {item.last_service_hmr || 0} HRS ({formatDate(item.last_service_date)})</Text>
          <Text style={styles.cellTextSmall} numberOfLines={1}>Next Service ({item.service_interval_hours || 0}H Interval): {item.next_service_hmr || 0} HRS</Text>
          {isOverdue && (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueBadgeText}>⚠ OVERDUE BY {Math.abs(item.hours_remaining_to_service || 0)} HRS</Text>
            </View>
          )}
        </View>

        <View style={styles.cellCondition}>
          <Text style={[styles.cellTextBold, { color: '#2563eb', fontSize: 14 }]}>{item.current_hmr || 0} <Text style={{ fontSize: 10, color: '#64748b' }}>HRS</Text></Text>
          <Text style={styles.cellTextSmall}>Updated: {formatDate(item.updated_at)}</Text>
          <View style={styles.warrantyBadge}>
            <Text style={styles.warrantyBadgeText}>{item.warranty_status || 'Out of Warranty'}</Text>
          </View>
        </View>
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>Machine Registry</Text>
      </LinearGradient>

      <View style={styles.container}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#94a3b8" />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search SN, Fleet, Name, Customer..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
            {['All', 'Active', 'Inactive', 'Workshop'].map(f => (
              <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ width: 1, height: '60%', backgroundColor: '#cbd5e1', alignSelf: 'center', marginHorizontal: 4 }} />
            {['All Companies', 'Machinery Exchange', 'Sinopower'].map(f => (
              <TouchableOpacity key={f} style={[styles.filterChip, { borderColor: '#8b2219' }, divisionFilter === f ? { backgroundColor: '#8b2219' } : { backgroundColor: '#f8fafc' }]} onPress={() => setDivisionFilter(f)}>
                <Text style={[styles.filterText, divisionFilter === f ? { color: '#fff' } : { color: '#8b2219' }]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={[styles.groupToggle, groupByCustomer && styles.groupToggleActive]} onPress={() => setGroupByCustomer(!groupByCustomer)}>
            <Ionicons name="layers-outline" size={16} color={groupByCustomer ? '#fff' : '#64748b'} />
            <Text style={[styles.groupToggleText, groupByCustomer && styles.groupToggleTextActive]}>Group by Customer</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 40 }} />
        ) : (
          <View style={{ flex: 1, paddingHorizontal: 16 }}>
            <View style={{ flex: 1 }}>
              {/* Header Row */}
              <LinearGradient 
                colors={['#4c110d', '#8b2219', '#6b1a14']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.tableHeader}
              >
                <Text style={styles.headerCellIndex}>#</Text>
                <Text style={styles.headerCellCustomer}>CUSTOMER</Text>
                <Text style={styles.headerCellImg}>IMG</Text>
                <Text style={styles.headerCellMachine}>MACHINE</Text>
                <Text style={styles.headerCellService}>SERVICE SCHEDULING</Text>
                <Text style={styles.headerCellCondition}>CONDITION</Text>
              </LinearGradient>
              {/* Table Body */}
              <FlatList
                data={renderData}
                keyExtractor={(item, idx) => item.id?.toString() || idx.toString()}
                renderItem={renderRow}
                contentContainerStyle={{ paddingBottom: 150 }}
              />
            </View>
          </View>
        )}
      </View>

      {/* FAB Removed */}
      
      
      {/* Add Modal */}
      {addModalVisible && (
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Machine</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Select Machine</Text>
              <MachineSearch onSelect={(m) => setNewItem({...newItem, machine: m.name})} />
              <TouchableOpacity style={styles.submitBtn} onPress={handleAdd}>
                <Text style={styles.submitBtnText}>Save</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      )}
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
  
  filterContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  filterRow: { maxHeight: 50, flex: 1 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#cbd5e1'
  },
  filterChipActive: { backgroundColor: '#f59e0b', borderColor: '#d97706' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  filterTextActive: { color: '#fff' },
  
  groupToggle: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: '#cbd5e1', marginLeft: 12
  },
  groupToggleActive: { backgroundColor: '#3b82f6', borderColor: '#2563eb' },
  groupToggleText: { fontSize: 12, fontWeight: '600', color: '#64748b', marginLeft: 6 },
  groupToggleTextActive: { color: '#fff' },

  tableHeader: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderTopLeftRadius: 8, borderTopRightRadius: 8, marginBottom: 0 },
  headerCellIndex: { width: 30, fontSize: 10, fontWeight: '800', color: '#fff', textTransform: 'uppercase', textAlign: 'center' },
  headerCellCustomer: { flex: 1.5, fontSize: 10, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
  headerCellImg: { width: 60, fontSize: 10, fontWeight: '800', color: '#fff', textTransform: 'uppercase', textAlign: 'center' },
  headerCellMachine: { flex: 2, fontSize: 10, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
  headerCellService: { flex: 2.5, fontSize: 10, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
  headerCellCondition: { flex: 1.2, fontSize: 10, fontWeight: '800', color: '#fff', textTransform: 'uppercase', textAlign: 'right' },

  tableRow: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  groupHeaderRow: { backgroundColor: '#f1f5f9', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  groupHeaderText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },

  cellIndex: { width: 30, alignItems: 'center', justifyContent: 'center' },
  cellCustomer: { flex: 1.5, paddingRight: 8 },
  cellImg: { width: 60, alignItems: 'center', justifyContent: 'center', paddingRight: 8 },
  cellMachine: { flex: 2, paddingRight: 8 },
  cellService: { flex: 2.5, paddingRight: 8, justifyContent: 'center' },
  cellCondition: { flex: 1.2, alignItems: 'flex-end', justifyContent: 'center' },

  cellTextBold: { fontSize: 12, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  cellTextSmallBold: { fontSize: 11, fontWeight: '700', color: '#475569' },
  cellTextSmall: { fontSize: 10, color: '#475569', marginBottom: 2 },

  thumbnail: { width: 44, height: 44, borderRadius: 4, backgroundColor: '#f1f5f9' },
  placeholderImg: { width: 44, height: 44, borderRadius: 4, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },

  overdueBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 },
  overdueBadgeText: { color: '#ef4444', fontSize: 9, fontWeight: '700' },

  warrantyBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  warrantyBadgeText: { color: '#64748b', fontSize: 9, fontWeight: '700' },

  fab: {
    position: 'absolute', right: 24, width: 56, height: 56,
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
