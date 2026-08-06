import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, ScrollView, TextInput, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'react-native';
import { supabase } from '../api/supabaseClient';
import MachineSearch from '../components/MachineSearch';

export default function BreakdownsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [respFilter, setRespFilter] = useState('All');
  
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newItem, setNewItem] = useState<any>({});
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<any>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    
    while (true) {
      const { data: res, error } = await supabase.from('ft_breakdown_logs').select('*').range(from, from + step - 1);
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
    const { error } = await supabase.from('ft_breakdown_logs').insert([{ ...newItem , status: 'Reported', breakdown_date: new Date().toISOString() }]);
    if (!error) {
      setAddModalVisible(false);
      setNewItem({});
      fetchData();
    }
  };

  const handleEdit = async () => {
    if (!editItem.id) return;
    const { error } = await supabase.from('ft_breakdown_logs').update({ ...editItem }).eq('id', editItem.id);
    if (!error) {
      setEditModalVisible(false);
      setEditItem({});
      fetchData();
    }
  };

  const filteredData = data.filter(item => {
    const q = search.toLowerCase();
    
    const matchesSearch = !q || 
      (item.customer && item.customer.toLowerCase().includes(q)) || 
      (item.serial_number && String(item.serial_number).toLowerCase().includes(q)) || 
      (item.model && item.model.toLowerCase().includes(q)) ||
      (item.machine && item.machine.toLowerCase().includes(q));

    const status = (item.status || '').toLowerCase();
    let matchesStatus = true;
    if (filter === 'Open') {
      matchesStatus = !item.breakdown_end_date && status !== 'resolved' && status !== 'closed';
    } else if (filter !== 'All') {
      matchesStatus = status === filter.toLowerCase();
    }

    const matchesResp = respFilter === 'All' || item.responsibility === respFilter;

    return matchesSearch && matchesStatus && matchesResp;
  });

  const openCount = data.filter(d => !d.breakdown_end_date && (d.status || '').toLowerCase() !== 'resolved' && (d.status || '').toLowerCase() !== 'closed').length;
  const urgentCount = data.filter(d => d.urgent === true || d.urgent === 'Yes' || d.urgent === 'true').length;

  const renderFormFields = (itemState: any, setItemState: any, isEdit: boolean) => (
    <>
      <Text style={styles.inputLabel}>{isEdit ? "Machine" : "Select Machine (Search SN or Name)"}</Text>
      {!isEdit ? (
        <MachineSearch onSelect={(m) => setItemState({...itemState, machine: m.name, serial_number: m.sn, sn: m.sn, model: m.model, customer: m.customer})} />
      ) : (
        <TextInput style={[styles.input, { backgroundColor: '#f1f5f9', color: '#64748b' }]} value={`${itemState.machine || ''} - ${itemState.serial_number || ''}`} editable={false} />
      )}
      
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
        <Text style={[styles.inputLabel, { marginTop: 0, flex: 1 }]}>Is this breakdown Urgent?</Text>
        <TouchableOpacity 
          style={{ width: 48, height: 24, borderRadius: 12, backgroundColor: itemState.urgent === true || itemState.urgent === 'Yes' || itemState.urgent === 'true' ? '#ef4444' : '#e2e8f0', padding: 2 }}
          onPress={() => {
            const currentUrgent = itemState.urgent === true || itemState.urgent === 'Yes' || itemState.urgent === 'true';
            setItemState({...itemState, urgent: !currentUrgent});
          }}
        >
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', transform: [{ translateX: itemState.urgent === true || itemState.urgent === 'Yes' || itemState.urgent === 'true' ? 24 : 0 }] }} />
        </TouchableOpacity>
      </View>

      <Text style={styles.inputLabel}>Responsibility</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        {['WSD', 'FSD', 'Customer', 'OEM'].map(r => (
          <TouchableOpacity key={r} style={[styles.filterChip, itemState.responsibility === r && styles.filterChipActive]} onPress={() => setItemState({...itemState, responsibility: r})}>
            <Text style={[styles.filterText, itemState.responsibility === r && styles.filterTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.inputLabel}>Current HMR</Text>
      <TextInput style={styles.input} placeholder="e.g. 5000" placeholderTextColor="#64748b" keyboardType="numeric" value={itemState.current_hmr ? String(itemState.current_hmr) : ''} onChangeText={(t: string) => setItemState({...itemState, current_hmr: t})} />

      <Text style={styles.inputLabel}>Description</Text>
      <TextInput style={styles.input} placeholder="Describe the breakdown..." placeholderTextColor="#64748b" multiline numberOfLines={3} value={itemState.description || ''} onChangeText={(t: string) => setItemState({...itemState, description: t})} />
      
      {isEdit && (
        <>
          <Text style={styles.inputLabel}>Status</Text>
          <TextInput style={styles.input} placeholder="Status..." placeholderTextColor="#64748b" value={itemState.status || ''} onChangeText={(t: string) => setItemState({...itemState, status: t})} />
        </>
      )}

      <Text style={styles.inputLabel}>Target End Date (TED)</Text>
      <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#64748b" value={itemState.ted || ''} onChangeText={(t: string) => setItemState({...itemState, ted: t})} />
      
      {isEdit && (
        <>
          <Text style={styles.inputLabel}>Revised End Date (RED)</Text>
          <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#64748b" value={itemState.red || ''} onChangeText={(t: string) => setItemState({...itemState, red: t})} />
        </>
      )}

      <Text style={styles.inputLabel}>Parts ETA</Text>
      <TextInput style={styles.input} placeholder="Date or timeline for parts..." placeholderTextColor="#64748b" value={itemState.parts_eta || ''} onChangeText={(t: string) => setItemState({...itemState, parts_eta: t})} />

      <Text style={styles.inputLabel}>Manager's Comments</Text>
      <TextInput style={styles.input} placeholder="Any comments..." placeholderTextColor="#64748b" multiline numberOfLines={2} value={itemState.manager_comments || ''} onChangeText={(t: string) => setItemState({...itemState, manager_comments: t})} />
        
    </>
  );

  return (
    <LinearGradient colors={['#ffffff', '#f1f5f9']} style={[styles.safeArea, { paddingBottom: 0 }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient 
        colors={['#4c110d', '#8b2219', '#6b1a14']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Fleetrack Dashboard')}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Breakdowns</Text>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topRow} style={{ maxHeight: 75, minHeight: 75 }}>
        <View style={styles.kpiCard}>
          <Ionicons name="build-outline" size={20} color="#3b82f6" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.kpiValue}>{openCount}</Text>
            <Text style={styles.kpiLabel}>OPEN BREAKDOWNS</Text>
          </View>
        </View>
        
        <View style={styles.kpiCard}>
          <Ionicons name="warning-outline" size={20} color="#ef4444" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.kpiValue}>{urgentCount}</Text>
            <Text style={styles.kpiLabel}>URGENT BREAKDOWNS</Text>
          </View>
        </View>

        <View style={{ width: 1, height: 40, backgroundColor: '#e2e8f0', marginHorizontal: 4 }} />

        <Text style={styles.filterGroupLabel}>Status:</Text>
        {['All', 'Open', 'Closed'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterChipSmall, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterTextSmall, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
        
        <View style={{ width: 1, height: 24, backgroundColor: '#cbd5e1', marginHorizontal: 4 }} />
        
        <Text style={styles.filterGroupLabel}>Resp:</Text>
        {['All', 'WSD', 'FSD'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterChipSmall, respFilter === f && styles.filterChipActive]} onPress={() => setRespFilter(f)}>
            <Text style={[styles.filterTextSmall, respFilter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}

        <View style={{ width: 1, height: 40, backgroundColor: '#e2e8f0', marginHorizontal: 4 }} />
        
        <TouchableOpacity style={styles.newBtn} onPress={() => setAddModalVisible(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newBtnText}>New BD</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.container}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#94a3b8" />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search Customer, Machine, S/N..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>



        {loading ? (
          <ActivityIndicator size="large" color="#8b2219" style={{ marginTop: 40 }} />
        ) : (
          <View style={{ flex: 1, paddingHorizontal: 16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flex: 1 }}>
              <View>
                {/* Header Row */}
                <View style={[styles.tableHeader, { width: '100%' }]}>
                  <Text style={[styles.headerCell, { flex: 1.5 }]}>Customer</Text>
                  <Text style={[styles.headerCell, { flex: 2.2 }]}>Machine / S/N</Text>
                  <Text style={[styles.headerCell, { flex: 1 }]}>Reported On</Text>
                  <Text style={[styles.headerCell, { flex: 1.8 }]}>Description</Text>
                  <Text style={[styles.headerCell, { flex: 1 }]}>TED</Text>
                  <Text style={[styles.headerCell, { flex: 1 }]}>RED</Text>
                  <Text style={[styles.headerCell, { flex: 0.8 }]}>Resp.</Text>
                  <Text style={[styles.headerCell, { flex: 1.8 }]}>Status & ETA</Text>
                  <Text style={[styles.headerCell, { flex: 1.5 }]}>Mgr Comments</Text>
                  <Text style={[styles.headerCell, { width: 60 }]}></Text>
                </View>
                {/* Table Body */}
                <FlatList
                  data={filteredData}
                  keyExtractor={(item, idx) => item.id?.toString() || idx.toString()}
                  renderItem={({ item }) => {
                    const isUrgent = item.urgent === true || item.urgent === 'Yes' || item.urgent === 'true';
                    return (
                      <View style={[styles.tableRow, { width: '100%', backgroundColor: isUrgent ? '#fef2f2' : '#fff', borderLeftColor: isUrgent ? '#ef4444' : '#e2e8f0', borderLeftWidth: isUrgent ? 6 : 4 }]}>
                        
                        <View style={[styles.cell, { flex: 1.5 }]}>
                          <Text style={styles.cellText} numberOfLines={2}>{item.customer || '-'}</Text>
                        </View>
                        <View style={[styles.cell, { flex: 2.2 }]}>
                          <Text style={styles.cellText}>{item.machine || '-'}</Text>
                          <Text style={[styles.cellText, { color: '#64748b', fontSize: 10, marginTop: 2 }]}>Model: {item.model || '-'}</Text>
                          <Text style={[styles.cellText, { color: '#64748b', fontSize: 10 }]}>SN: {item.serial_number || '-'}</Text>
                        </View>
                        <View style={[styles.cell, { flex: 1 }]}>
                          <Text style={styles.cellText} numberOfLines={2}>{item.breakdown_date ? item.breakdown_date.substring(0, 10) : '-'}</Text>
                        </View>
                        <View style={[styles.cell, { flex: 1.8 }]}>
                          <Text style={styles.cellText} numberOfLines={3}>{item.description || '-'}</Text>
                        </View>
                        <View style={[styles.cell, { flex: 1 }]}>
                          <Text style={styles.cellText} numberOfLines={1}>{item.ted || '-'}</Text>
                        </View>
                        <View style={[styles.cell, { flex: 1 }]}>
                          <Text style={styles.cellText} numberOfLines={1}>{item.red || '-'}</Text>
                        </View>
                        <View style={[styles.cell, { flex: 0.8 }]}>
                          <Text style={styles.cellText} numberOfLines={1}>{item.responsibility || '-'}</Text>
                        </View>
                        <View style={[styles.cell, { flex: 1.8 }]}>
                          <Text style={styles.cellText} numberOfLines={4}>
                            {item.status || '-'}
                            {item.parts_eta && item.parts_eta.trim() !== '-' && item.parts_eta.trim() !== '' ? `\nETA: ${item.parts_eta}` : ''}
                          </Text>
                        </View>
                        <View style={[styles.cell, { flex: 1.5 }]}>
                          <Text style={styles.cellText} numberOfLines={3}>{item.manager_comments || '-'}</Text>
                        </View>
                        <View style={[styles.cell, { width: 60, alignItems: 'center', justifyContent: 'center', paddingRight: 0 }]}>
                          <TouchableOpacity onPress={() => { setEditItem(item); setEditModalVisible(true); }} style={styles.editBtn}>
                            <Text style={styles.editBtnText}>Edit</Text>
                          </TouchableOpacity>
                        </View>

                      </View>
                    );
                  }}
                  contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 120) }}
                />
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Add Modal */}
      {addModalVisible && (
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Breakdown</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {renderFormFields(newItem, setNewItem, false)}
              <TouchableOpacity style={styles.submitBtn} onPress={handleAdd}>
                <Text style={styles.submitBtnText}>Save Breakdown</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* Edit Modal */}
      {editModalVisible && (
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Breakdown</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {renderFormFields(editItem, setEditItem, true)}
              <TouchableOpacity style={styles.submitBtn} onPress={handleEdit}>
                <Text style={styles.submitBtnText}>Update Breakdown</Text>
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
  
  topRow: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'center', gap: 12 },
  kpiCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', minWidth: 150 },
  kpiValue: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  kpiLabel: { fontSize: 8, fontWeight: '700', color: '#64748b', marginTop: 2, letterSpacing: 0.5 },
  newBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dc2626', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  newBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 12, marginLeft: 6 },

  container: { flex: 1, backgroundColor: 'transparent' },
  searchRow: { padding: 16, paddingBottom: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#e2e8f0',
    borderRadius: 8, paddingHorizontal: 12, height: 44
  },
  searchInput: { flex: 1, marginLeft: 8, color: '#0f172a', fontSize: 15 },
  
  filterGroupLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  filterChipSmall: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
    backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#cbd5e1'
  },
  filterChipActive: { backgroundColor: '#8b2219', borderColor: '#4c110d' },
  filterTextSmall: { fontSize: 11, fontWeight: '600', color: '#475569' },
  filterTextActive: { color: '#fff' },
  
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  headerCell: { flex: 1, fontSize: 9, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', borderLeftWidth: 4, marginBottom: 6, alignItems: 'center' },
  cell: { flex: 1, paddingRight: 8 },
  cellText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  editBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f1f5f9', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  editBtnText: { fontSize: 11, fontWeight: '700', color: '#3b82f6' },

  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 100
  },
  modalContainer: {
    backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '90%', paddingBottom: 24
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
    backgroundColor: '#8b2219', borderRadius: 8, padding: 14,
    alignItems: 'center', marginTop: 24, marginBottom: 40
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
