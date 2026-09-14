import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../api/supabaseClient';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TYPE_FILTERS = ['All', 'CDV', 'PSV', 'FCDV'] as const;

export default function VisitHistoryScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [visits, setVisits]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter]   = useState<string>('All');

  // Edit Modal State
  const [selectedVisit, setSelectedVisit]   = useState<any>(null);
  const [topics, setTopics]                 = useState('');
  const [opportunities, setOpportunities]   = useState('');
  const [actionRequired, setActionRequired] = useState(false);
  const [followUpDate, setFollowUpDate]     = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes]                   = useState('');
  const [saving, setSaving]                 = useState(false);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchVisits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.display_name;
      const formattedEmailName = (user?.email || '').split('@')[0].split(/[._-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      const salesRepDisplayName = metaName?.trim() || formattedEmailName || 'Representative';
      const fallbackEmail = user?.email || 'Mobile User';

      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
      const anonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || anonKey;

      const headers = {
        'apikey': anonKey,
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      };

      const safeFetch = async (table: string): Promise<any[]> => {
        try {
          const res = await fetch(
            `${supabaseUrl}/rest/v1/${table}?or=(salesperson.eq.${encodeURIComponent(salesRepDisplayName)},salesperson.eq.${encodeURIComponent(fallbackEmail)})`,
            { headers }
          );
          if (!res.ok) {
            console.warn(`[VisitHistory] ${table} returned ${res.status}`);
            return [];
          }
          return await res.json();
        } catch (e) {
          console.warn(`[VisitHistory] fetch ${table} failed:`, e);
          return [];
        }
      };

      const [dataCdv, dataPsv] = await Promise.all([
        safeFetch('cdv_logs'),
        safeFetch('psv_logs'),
      ]);

      const combined = [
        ...dataCdv.map((v: any) => ({ ...v, type: v.visit_type || 'CDV' })),
        ...dataPsv.map((v: any) => ({ ...v, type: 'PSV' })),
      ].sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());

      setVisits(combined);
    } catch (e) {
      console.error('[VisitHistory] fetchVisits error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchVisits(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchVisits(); };

  // ── Stats ───────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:       visits.length,
    cdvCount:    visits.filter(v => v.type === 'CDV').length,
    psvCount:    visits.filter(v => v.type === 'PSV').length,
    actionCount: visits.filter(v => v.action_required).length,
  }), [visits]);

  // ── Filtered list ───────────────────────────────────────────────────────────

  const filteredVisits = useMemo(() => {
    let list = [...visits];
    if (typeFilter !== 'All') list = list.filter(v => v.type === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(v =>
        v.customer?.toLowerCase().includes(q) ||
        v.type?.toLowerCase().includes(q) ||
        (v.topics_discussed && v.topics_discussed.toLowerCase().includes(q)) ||
        (v.findings && v.findings.toLowerCase().includes(q)) ||
        (v.opportunities && v.opportunities.toLowerCase().includes(q)) ||
        (v.action_notes && v.action_notes.toLowerCase().includes(q))
      );
    }
    return list;
  }, [visits, typeFilter, searchQuery]);

  // ── Edit modal ──────────────────────────────────────────────────────────────

  const openEditModal = (visit: any) => {
    setSelectedVisit(visit);
    setTopics(visit.type === 'PSV' ? (visit.findings || '') : (visit.topics_discussed || ''));
    setOpportunities(visit.type === 'PSV' ? (visit.action_notes || '') : (visit.opportunities || ''));
    setActionRequired(visit.action_required || false);
    setFollowUpDate(visit.follow_up_date ? new Date(visit.follow_up_date) : null);
    setNotes(visit.notes || '');
  };

  const saveChanges = async () => {
    if (!topics) { Alert.alert('Error', 'Topics discussed cannot be empty.'); return; }
    setSaving(true);
    try {
      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
      const anonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || anonKey;

      const payload: any = {
        action_required: actionRequired,
        notes,
        updated_at: new Date().toISOString(),
        follow_up_date: actionRequired && followUpDate ? followUpDate.toISOString().split('T')[0] : null,
      };

      if (selectedVisit.type === 'PSV') {
        payload.findings = topics;
        payload.action_notes = opportunities;
      } else {
        payload.topics_discussed = topics;
        payload.opportunities = opportunities;
      }

      const table = selectedVisit.type === 'PSV' ? 'psv_logs' : 'cdv_logs';
      const res = await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.${selectedVisit.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to update visit');
      Alert.alert('Success', 'Visit updated successfully');
      setSelectedVisit(null);
      fetchVisits();
    } catch (e) {
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteVisit = (visit: any) => {
    Alert.alert(
      'Delete Visit Log',
      `Are you sure you want to delete the ${visit.type} visit for "${visit.customer}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteVisit(visit) },
      ]
    );
  };

  const deleteVisit = async (visit: any) => {
    try {
      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
      const anonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || anonKey;

      const table = visit.type === 'PSV' ? 'psv_logs' : 'cdv_logs';
      const res = await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.${visit.id}`, {
        method: 'DELETE',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!res.ok) throw new Error('Failed to delete visit record');

      Alert.alert('Deleted', 'Visit report deleted successfully.');
      if (selectedVisit?.id === visit.id) setSelectedVisit(null);
      fetchVisits();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to delete visit');
    }
  };

  // ── Render card ─────────────────────────────────────────────────────────────

  const renderVisitCard = (visit: any) => {
    const isAction = visit.action_required;
    const machines: any[] = Array.isArray(visit.machines_inspected) ? visit.machines_inspected : [];
    const depts: string[] = Array.isArray(visit.target_departments) ? visit.target_departments : [];
    const photos: string[] = Array.isArray(visit.images) ? visit.images : [];

    return (
      <View key={visit.id} style={styles.card}>
        {/* Left accent bar */}
        <View style={[styles.cardAccent, { backgroundColor: isAction ? '#f59e0b' : '#10b981' }]} />

        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.cardDate}>{visit.visit_date}</Text>
            <View style={[styles.typeBadge, visit.type === 'PSV' ? styles.badgePSV : styles.badgeCDV]}>
              <Text style={styles.typeText}>{visit.type}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, visit.status === 'Completed' ? styles.badgeCompleted : styles.badgePending]}>
            <Text style={[styles.statusText, visit.status === 'Completed' ? styles.textCompleted : styles.textPending]}>
              {visit.status || 'SUBMITTED'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingLeft: 8 }}>
          <Text style={[styles.customerName, { marginBottom: 0, paddingLeft: 0, flexShrink: 1 }]} numberOfLines={1}>
            {visit.customer}
          </Text>
          {visit.email_sent && (
            <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
              <Text style={{ color: '#15803d', fontSize: 9, fontWeight: 'bold' }}>Email Sent</Text>
            </View>
          )}
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="chatbubbles-outline" size={12} color="#64748b" />
          <Text style={styles.infoText} numberOfLines={2}>
            {visit.type === 'PSV' ? (visit.findings || 'No findings reported') : (visit.topics_discussed || 'No topics discussed')}
          </Text>
        </View>

        {(visit.type === 'PSV' ? visit.action_notes : visit.opportunities) ? (
          <View style={styles.infoRow}>
            <Ionicons name="trending-up-outline" size={12} color="#64748b" />
            <Text style={styles.infoText} numberOfLines={1}>
              {visit.type === 'PSV' ? visit.action_notes : visit.opportunities}
            </Text>
          </View>
        ) : null}

        {/* PSV Machine inspection summary */}
        {visit.type === 'PSV' && machines.length > 0 && (
          <View style={styles.machineSummaryRow}>
            <Ionicons name="construct-outline" size={12} color="#8b2219" />
            <Text style={styles.machineSummaryText}>
              {machines.length} machine{machines.length > 1 ? 's' : ''} inspected
            </Text>
            {depts.map(d => (
              <View key={d} style={styles.deptBadge}>
                <Text style={styles.deptBadgeText}>{d}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Photos indicator */}
        {photos.length > 0 && (
          <View style={styles.infoRow}>
            <Ionicons name="images-outline" size={12} color="#64748b" />
            <Text style={styles.infoText}>{photos.length} photo{photos.length > 1 ? 's' : ''} attached</Text>
          </View>
        )}

        {isAction && (
          <View style={styles.actionFlag}>
            <Ionicons name="alert-circle-outline" size={12} color="#92400e" />
            <Text style={styles.actionFlagText}>Action Required</Text>
          </View>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDeleteVisit(visit)}>
            <Ionicons name="trash-outline" size={14} color="#ef4444" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(visit)}>
            <Ionicons name="create-outline" size={14} color="#2563eb" />
            <Text style={styles.editBtnText}>View Details / Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Header ── */}
      <LinearGradient
        colors={['#4c110d', '#8b2219', '#6b1a14']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        {/* Row 1: nav */}
        <View style={styles.headerRow1}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Visit History</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TouchableOpacity onPress={fetchVisits} style={styles.iconBtn}>
              <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={styles.iconBtn}>
              <Ionicons name={showSearch ? 'close' : 'search'} size={20} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 2: KPI stats strip */}
        <View style={styles.statsStrip}>
          {[
            { label: 'Total',      value: stats.total },
            { label: 'CDV',        value: stats.cdvCount },
            { label: 'PSV',        value: stats.psvCount },
            { label: 'Action Req', value: stats.actionCount },
          ].map((s, i) => (
            <View key={i} style={styles.statChip}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Row 3: type filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 6, paddingRight: 16 }}>
          {TYPE_FILTERS.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.filterChip, typeFilter === t && styles.filterChipActive]}
              onPress={() => setTypeFilter(t)}
            >
              <Text style={[styles.filterChipText, typeFilter === t && styles.filterChipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search bar (collapsible) */}
        {showSearch && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={15} color="rgba(255,255,255,0.55)" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search customer, type or topics..."
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        )}
      </LinearGradient>

      {/* ── Content ── */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#8b2219" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b2219" />}
        >
          {filteredVisits.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="clipboard-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No visits found</Text>
              <Text style={styles.emptySubText}>Log a customer visit or change filter settings.</Text>
            </View>
          ) : (
            filteredVisits.map(renderVisitCard)
          )}
        </ScrollView>
      )}

      {/* ── Edit / Details Modal ── */}
      <Modal visible={!!selectedVisit} animationType="slide" transparent onRequestClose={() => setSelectedVisit(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedVisit?.type || 'Visit'} Details & Notes
              </Text>
              <TouchableOpacity onPress={() => setSelectedVisit(null)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.label}>Customer Name</Text>
              <Text style={styles.readOnlyText}>{selectedVisit?.customer}</Text>

              <Text style={styles.label}>Topics Discussed</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                multiline
                value={topics}
                onChangeText={setTopics}
                placeholder="What was discussed?"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.label}>Opportunities</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                multiline
                value={opportunities}
                onChangeText={setOpportunities}
                placeholder="Any new opportunities?"
                placeholderTextColor="#94a3b8"
              />

              {/* PSV Inspected Machines Section */}
              {selectedVisit?.type === 'PSV' && Array.isArray(selectedVisit?.machines_inspected) && selectedVisit.machines_inspected.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.label}>Inspected Customer Machines</Text>
                  {selectedVisit.machines_inspected.map((m: any, idx: number) => {
                    const depts = m.departments ? Object.keys(m.departments).filter(k => m.departments[k]) : [];
                    return (
                      <View key={idx} style={styles.modalMachineCard}>
                        <Text style={styles.modalMachineTitle}>{m.model} (SN: {m.serial_no})</Text>
                        {m.findings ? (
                          <Text style={styles.modalMachineFindings}>Comments: {m.findings}</Text>
                        ) : null}
                        {depts.length > 0 && (
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                            {depts.map(d => (
                              <View key={d} style={styles.deptBadge}>
                                <Text style={styles.deptBadgeText}>{d}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                multiline
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional notes"
                placeholderTextColor="#94a3b8"
              />

              <TouchableOpacity style={styles.checkboxContainer} onPress={() => setActionRequired(!actionRequired)}>
                <View style={[styles.checkbox, actionRequired && styles.checkboxActive]}>
                  {actionRequired && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Action Required</Text>
              </TouchableOpacity>

              {actionRequired && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.label}>Next Follow-Up Date</Text>
                  <TouchableOpacity
                    style={[styles.input, { justifyContent: 'center' }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={{ color: followUpDate ? '#0f172a' : '#94a3b8' }}>
                      {followUpDate ? followUpDate.toLocaleDateString() : 'Select a date'}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={followUpDate || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(_, selectedDate) => {
                        setShowDatePicker(Platform.OS === 'ios');
                        if (selectedDate) setFollowUpDate(selectedDate);
                      }}
                    />
                  )}
                </View>
              )}

              <View style={{ height: 24 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalDeleteBtn} onPress={() => confirmDeleteVisit(selectedVisit)}>
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                <Text style={styles.modalDeleteBtnText}>Delete</Text>
              </TouchableOpacity>

              <View style={{ flex: 1 }} />

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedVisit(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={saveChanges} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: { paddingBottom: 10 },
  headerRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#fff' },
  iconBtn: { padding: 8 },

  statsStrip: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.65)', marginTop: 1 },

  filterRow: { paddingHorizontal: 16, marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  filterChipActive: { backgroundColor: 'rgba(255,255,255,0.9)' },
  filterChipText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  filterChipTextActive: { color: '#8b2219' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    marginHorizontal: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 13, paddingVertical: 0 },

  // ── List ───────────────────────────────────────────────────────────────────
  scrollContent: { padding: 16 },
  emptyBox: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#475569', marginTop: 8 },
  emptySubText: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingLeft: 8,
  },
  cardDate: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeCDV: { backgroundColor: '#e0e7ff' },
  badgePSV: { backgroundColor: '#f3e8ff' },
  typeText: { fontSize: 9, fontWeight: '800', color: '#4338ca' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeCompleted: { backgroundColor: '#dcfce7' },
  badgePending:   { backgroundColor: '#fef3c7' },
  statusText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  textCompleted: { color: '#166534' },
  textPending:   { color: '#92400e' },

  customerName: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 6, paddingLeft: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3, paddingLeft: 8 },
  infoText: { fontSize: 12, color: '#475569', marginLeft: 6, flex: 1 },

  machineSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8, marginTop: 4, marginBottom: 4 },
  machineSummaryText: { fontSize: 11, fontWeight: '700', color: '#8b2219' },
  deptBadge: { backgroundColor: '#e0f2fe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  deptBadgeText: { fontSize: 10, fontWeight: '700', color: '#0284c7' },

  actionFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginLeft: 8,
    marginTop: 4,
  },
  actionFlagText: { fontSize: 10, fontWeight: '700', color: '#92400e' },

  actionsContainer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deleteBtnText: { fontSize: 12, fontWeight: '700', color: '#ef4444', marginLeft: 4 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: '#2563eb', marginLeft: 4 },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 10, marginBottom: 4 },
  readOnlyText: { fontSize: 14, fontWeight: '600', color: '#0f172a', backgroundColor: '#f1f5f9', padding: 8, borderRadius: 6 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#0f172a' },

  modalMachineCard: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', padding: 8, borderRadius: 8, marginBottom: 6 },
  modalMachineTitle: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  modalMachineFindings: { fontSize: 11, color: '#475569', marginTop: 2 },

  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  checkboxActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  checkboxLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },

  modalFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  modalDeleteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  modalDeleteBtnText: { fontSize: 13, fontWeight: '700', color: '#ef4444', marginLeft: 4 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6, backgroundColor: '#f1f5f9' },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  saveBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6, backgroundColor: '#2563eb' },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
