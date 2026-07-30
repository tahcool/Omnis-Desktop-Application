import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity,
  RefreshControl, TextInput, ScrollView, StatusBar,
} from 'react-native';
import { supabase } from '../api/supabaseClient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

// ─── Types ───────────────────────────────────────────────────────────────────

type TabType = 'orders' | 'defects' | 'training';

const COMPANIES = ['All Companies', 'Sinopower', 'Machinery Exchange'];

const DEFECT_PRIORITY_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High:     '#f97316',
  Medium:   '#f59e0b',
  Low:      '#64748b',
};

const DEFECT_STATUS_COLORS: Record<string, string> = {
  Open:      '#f59e0b',
  WIP:       '#3b82f6',
  'On Hold': '#8b5cf6',
  Closed:    '#10b981',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getStatusColor = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s.includes('complete') || s.includes('delivered') || s.includes('handover')) return '#10b981';
  if (s.includes('cancel')) return '#ef4444';
  if (s.includes('transit') || s.includes('ship')) return '#3b82f6';
  if (s.includes('wip') || s.includes('progress') || s.includes('build')) return '#f59e0b';
  return '#64748b';
};

const stripQuotes = (str: string) => (str ? str.replace(/^"|"$/g, '') : '');

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OrderTrackingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  // ── Active tab ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabType>('orders');

  // ── Orders state ────────────────────────────────────────────────────────────
  const [orders, setOrders]       = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [company, setCompany]     = useState('');
  const [fromDate, setFromDate]   = useState<Date | undefined>();
  const [toDate, setToDate]       = useState<Date | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showFilters, setShowFilters]   = useState(false);
  const [sortBy, setSortBy]   = useState<'days_left' | 'target_handover' | 'customer'>('days_left');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker]     = useState(false);

  // ── Defects state ───────────────────────────────────────────────────────────
  const [defects, setDefects]           = useState<any[]>([]);
  const [loadingDefects, setLoadingDefects] = useState(false);
  const [defectStatusFilter, setDefectStatusFilter] = useState('All');

  // ── Training state ──────────────────────────────────────────────────────────
  const [training, setTraining]           = useState<any[]>([]);
  const [loadingTraining, setLoadingTraining] = useState(false);

  // ── Fetch functions ─────────────────────────────────────────────────────────

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      let query = supabase
        .from('fmb_report_machines')
        .select('*')
        .order('order_date', { ascending: false })
        .limit(300);
      if (fromDate) query = query.gte('order_date', fromDate.toISOString());
      if (toDate)   query = query.lte('order_date', toDate.toISOString());
      const { data, error } = await query;
      if (error) throw new Error(error.message);

      let rows = data || [];
      if (company && company !== 'All Companies' && company !== '') {
        const { data: reports } = await supabase
          .from('fmb_reports').select('frappe_id').eq('company', company);
        const validIds = new Set((reports || []).map((r: any) => r.frappe_id));
        rows = rows.filter((r: any) => validIds.has(r.report_id));
      }

      const mapped = rows.map((r: any) => ({
        id: r.id,
        customer: (r.report_id || '').replace(/^"|"$/g, '').split('-')[0].trim(),
        status: r.status || 'Unknown',
        order_date: r.order_date,
        target_handover: r.revised_handover || r.target_handover || '—',
        days_left: r.days_left !== null && r.days_left !== undefined ? String(r.days_left) : '—',
        model: r.machine || '—',
        brand: r.brand || '',
        qty: r.qty || 1,
        notes: r.notes || '',
        machine_id: r.machine_id || '',
      }));
      setOrders(mapped);
    } catch (e) {
      console.error(e);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
      setRefreshing(false);
    }
  };

  const fetchDefects = async () => {
    setLoadingDefects(true);
    try {
      // Only fetch Salestrack order defects — fleetrack_managed IS NULL excludes Fleetrack's 5k+ records
      let q = supabase
        .from('ft_defect')
        .select('*')
        .is('fleetrack_managed', null)
        .order('start_date', { ascending: false });
      if (defectStatusFilter !== 'All') q = q.eq('status', defectStatusFilter);
      const { data, error } = await q;
      if (!error) setDefects(data || []);
    } catch (e) { console.error(e); }
    finally { setLoadingDefects(false); }
  };

  const fetchTraining = async () => {
    setLoadingTraining(true);
    try {
      const { data, error } = await supabase
        .from('training_progress')
        .select('*')
        .order('completed_at', { ascending: false });
      if (!error) setTraining(data || []);
    } catch (e) { console.error(e); }
    finally { setLoadingTraining(false); }
  };

  const fetchAll = () => { fetchOrders(); fetchDefects(); fetchTraining(); };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchOrders(); }, [company, fromDate, toDate]);
  useEffect(() => { fetchDefects(); }, [defectStatusFilter]);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  // ── Stats strip computations ────────────────────────────────────────────────

  const stats = useMemo(() => {
    const late    = orders.filter(o => parseFloat(o.days_left) < 0);
    const onTrack = orders.filter(o => parseFloat(o.days_left) >= 0 && o.days_left !== '—');
    const openDef = defects.filter(d => d.status !== 'Closed');
    return { total: orders.length, late: late.length, onTrack: onTrack.length, openDefects: openDef.length };
  }, [orders, defects]);

  // ── Order filtering / sorting ───────────────────────────────────────────────

  const filteredOrders = useMemo(() => orders.filter(o => {
    if (statusFilter !== 'All') {
      if (!(o.status || '').toLowerCase().includes(statusFilter.toLowerCase())) return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (o.customer || '').toLowerCase().includes(q)
      || (o.model || '').toLowerCase().includes(q)
      || (o.status || '').toLowerCase().includes(q);
  }).sort((a, b) => {
    let va: any, vb: any;
    if (sortBy === 'customer')        { va = (a.customer || '').toLowerCase(); vb = (b.customer || '').toLowerCase(); }
    else if (sortBy === 'target_handover') { va = a.target_handover || '9999'; vb = b.target_handover || '9999'; }
    else { va = parseFloat(a.days_left) || 9999; vb = parseFloat(b.days_left) || 9999; }
    return sortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
  }), [orders, statusFilter, searchQuery, sortBy, sortDir]);

  const handleSort = (col: 'days_left' | 'target_handover' | 'customer') => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };
  const sortArrow = (col: string) => sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  // ── Render: Order card ──────────────────────────────────────────────────────

  const renderOrder = ({ item }: { item: any }) => {
    const statusColor = getStatusColor(item.status);
    const customerName = stripQuotes(item.customer || 'Unknown');
    const daysVal = parseFloat(item.days_left);
    const isLate = !isNaN(daysVal) && daysVal < 0;
    const riskColor = isLate ? '#ef4444' : '#10b981';

    // Match defects to this order via order_id (contains customer name) or machine name
    const orderDefects = defects.filter(d =>
      (d.order_id && item.customer && d.order_id.toLowerCase().includes(item.customer.toLowerCase())) ||
      (d.machine && item.model && d.machine.toLowerCase().includes((item.model || '').toLowerCase().split(' ')[0]))
    );
    const openOrderDefects = orderDefects.filter(d => d.status !== 'Closed').length;

    return (
      <View style={[styles.rowCard, { borderLeftColor: riskColor }]}>
        <View style={styles.cellCustomer}>
          <Text style={styles.customerName} numberOfLines={2}>{customerName}</Text>
          <View style={styles.riskBadge}>
            <Ionicons name={isLate ? 'warning' : 'checkmark-circle'} size={12} color={riskColor} />
            <Text style={[styles.riskLabel, { color: riskColor }]}>{isLate ? 'LATE' : 'ON TRACK'}</Text>
          </View>
          {openOrderDefects > 0 && (
            <View style={styles.defectBadge}>
              <Ionicons name="alert-circle" size={10} color="#b45309" />
              <Text style={styles.defectText}>{openOrderDefects} Open Defect{openOrderDefects > 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>

        <View style={styles.cellMachine}>
          <Text style={styles.machineName} numberOfLines={2}>{stripQuotes(item.model || '-')}</Text>
          {item.brand ? <Text style={styles.brandText}>{item.brand}</Text> : null}
        </View>

        <View style={styles.cellQty}>
          <Text style={styles.qtyText}>{item.qty || '1'}</Text>
        </View>

        <View style={styles.cellStatus}>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '1A', borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status || 'Unknown'}</Text>
          </View>
        </View>

        <View style={styles.cellNotes}>
          <Text style={styles.notesText} numberOfLines={2}>{item.notes || '—'}</Text>
        </View>

        <View style={styles.cellDate}>
          <Text style={styles.dateText}>{item.target_handover || '—'}</Text>
        </View>

        <View style={styles.cellDays}>
          <Text style={[styles.daysText, { color: riskColor }]}>{item.days_left || '-'}</Text>
        </View>
      </View>
    );
  };

  const renderOrderHeader = () => (
    <View style={styles.tableHeader}>
      <TouchableOpacity style={styles.cellCustomer} onPress={() => handleSort('customer')}>
        <Text style={styles.headerText}>Customer{sortArrow('customer')}</Text>
      </TouchableOpacity>
      <View style={styles.cellMachine}><Text style={styles.headerText}>Model</Text></View>
      <View style={styles.cellQty}><Text style={styles.headerText}>Qty</Text></View>
      <View style={styles.cellStatus}><Text style={styles.headerText}>Status</Text></View>
      <View style={styles.cellNotes}><Text style={styles.headerText}>Notes</Text></View>
      <TouchableOpacity style={styles.cellDate} onPress={() => handleSort('target_handover')}>
        <Text style={styles.headerText}>Target Date{sortArrow('target_handover')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.cellDays} onPress={() => handleSort('days_left')}>
        <Text style={styles.headerText}>Days Left{sortArrow('days_left')}</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Render: Defect card ─────────────────────────────────────────────────────

  // Group defects by customer for display
  const groupedDefects = useMemo(() => {
    const filtered = defectStatusFilter === 'All' ? defects : defects.filter(d => d.status === defectStatusFilter);
    const groups: Record<string, any[]> = {};
    filtered.forEach(d => {
      const key = d.customer || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });
    // Flatten into sections for FlatList
    const result: any[] = [];
    Object.entries(groups).forEach(([customer, items]) => {
      result.push({ type: 'header', customer });
      items.forEach(item => result.push({ type: 'item', ...item }));
    });
    return result;
  }, [defects, defectStatusFilter]);

  const renderDefect = ({ item }: { item: any }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.defectGroupHeader}>
          <Ionicons name="business-outline" size={13} color="#64748b" />
          <Text style={styles.defectGroupText}>{item.customer.toUpperCase()}</Text>
        </View>
      );
    }

    const statusColor = DEFECT_STATUS_COLORS[item.status] || '#64748b';
    const dateStr = item.start_date
      ? new Date(item.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';

    return (
      <View style={[styles.defectCard, { borderLeftColor: statusColor }]}>
        <View style={styles.defectCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.defectMachineName}>{item.machine || '—'}</Text>
            {item.name ? <Text style={styles.defectRefText}>{item.name}</Text> : null}
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
            <Text style={[styles.priorityBadgeText, { color: statusColor }]}>{item.status || 'Open'}</Text>
          </View>
        </View>

        <Text style={styles.defectDescription}>{item.description}</Text>

        <View style={styles.defectFooter}>
          <View style={styles.defectFooterItem}>
            <Ionicons name="calendar-outline" size={11} color="#94a3b8" />
            <Text style={styles.defectFooterText}>{dateStr}</Text>
          </View>
          {item.order_id ? (
            <View style={styles.defectFooterItem}>
              <Ionicons name="document-text-outline" size={11} color="#94a3b8" />
              <Text style={styles.defectFooterText} numberOfLines={1}>{item.order_id}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  // ── Render: Training card ──────────────────────────────────────────────────

  const renderTraining = ({ item }: { item: any }) => {
    const pct = item.total_questions > 0 ? Math.round((item.score / item.total_questions) * 100) : item.score;
    const scoreColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
    const completedDate = item.completed_at
      ? new Date(item.completed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';

    return (
      <View style={styles.trainingCard}>
        <View style={styles.trainingCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.trainingTitle} numberOfLines={2}>{item.course_title}</Text>
            <Text style={styles.trainingEmail}>{item.user_email}</Text>
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '22', borderColor: scoreColor }]}>
            <Text style={[styles.scoreText, { color: scoreColor }]}>{pct}%</Text>
          </View>
        </View>
        <View style={styles.trainingFooter}>
          <View style={styles.trainingFooterItem}>
            <Ionicons name="checkmark-circle" size={12} color="#10b981" />
            <Text style={styles.trainingFooterText}>{item.status}</Text>
          </View>
          <Text style={styles.trainingDate}>{completedDate}</Text>
        </View>
        {/* Score bar */}
        <View style={styles.scoreBarBg}>
          <View style={[styles.scoreBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: scoreColor }]} />
        </View>
      </View>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <LinearGradient colors={['#ffffff', '#f1f5f9']} style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Header ── */}
      <LinearGradient
        colors={['#4c110d', '#8b2219', '#6b1a14']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        {/* Row 1: nav + actions */}
        <View style={styles.headerRow1}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Tracking</Text>
          <View style={styles.headerActions}>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{filteredOrders.length}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.iconBtn}>
              <Ionicons name={showFilters ? 'close' : 'search'} size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} style={styles.iconBtn}>
              <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 2: Stats strip */}
        <View style={styles.statsStrip}>
          {[
            { label: 'Total',        value: stats.total,       color: '#fff' },
            { label: 'Late',         value: stats.late,        color: '#f87171' },
            { label: 'On Track',     value: stats.onTrack,     color: '#4ade80' },
            { label: 'Open Defects', value: stats.openDefects, color: '#fb923c' },
          ].map((s, i) => (
            <View key={i} style={styles.statChip}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Row 3: Company filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.companyFilterRow} contentContainerStyle={{ gap: 6, paddingRight: 16 }}>
          {COMPANIES.map(c => {
            const active = (company || 'All Companies') === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setCompany(c === 'All Companies' ? '' : c)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Row 4: Tab bar */}
        <View style={styles.tabBar}>
          {(['orders', 'defects', 'training'] as TabType[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons
                name={tab === 'orders' ? 'list' : tab === 'defects' ? 'alert-circle' : 'school'}
                size={14} color={activeTab === tab ? '#8b2219' : 'rgba(255,255,255,0.7)'}
              />
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'defects' && stats.openDefects > 0 ? ` (${stats.openDefects})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Collapsible filters (orders only) */}
        {showFilters && activeTab === 'orders' && (
          <View style={styles.filtersBody}>
            <View style={styles.filterRow}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={16} color="#94a3b8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search orders..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={styles.clearBtn} onPress={() => { setCompany(''); setFromDate(undefined); setToDate(undefined); setSearchQuery(''); }}>
                <Ionicons name="refresh" size={14} color="#64748b" />
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.filterRow}>
              <View style={[styles.pickerWrapper, { flex: 1 }]}>
                <Picker selectedValue={statusFilter} style={styles.picker} onValueChange={setStatusFilter} mode="dropdown">
                  <Picker.Item label="All Statuses" value="All" />
                  <Picker.Item label="New Sale" value="New Sale" />
                  <Picker.Item label="In Progress" value="In Progress" />
                  <Picker.Item label="Awaiting Customer" value="Awaiting Customer" />
                  <Picker.Item label="On Hold" value="On Hold" />
                  <Picker.Item label="Customer to Collect" value="Customer to Collect" />
                  <Picker.Item label="Handed Over" value="Handed Over" />
                  <Picker.Item label="Delivered" value="Delivered" />
                  <Picker.Item label="Final Inspection" value="Final Inspection" />
                </Picker>
              </View>
              <View style={styles.dateFilterContainer}>
                <Text style={styles.periodLabel}>Period:</Text>
                <TouchableOpacity style={styles.dateBox} onPress={() => setShowFromPicker(true)}>
                  <Text style={styles.dateText}>{fromDate ? fromDate.toLocaleDateString() : 'From'}</Text>
                </TouchableOpacity>
                <Text style={styles.periodTo}>–</Text>
                <TouchableOpacity style={styles.dateBox} onPress={() => setShowToPicker(true)}>
                  <Text style={styles.dateText}>{toDate ? toDate.toLocaleDateString() : 'To'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Defect status filter chips */}
        {activeTab === 'defects' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 14, paddingBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
            {['All', 'Open', 'WIP', 'On Hold', 'Closed'].map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.filterChip, defectStatusFilter === s && styles.filterChipActive]}
                onPress={() => setDefectStatusFilter(s)}
              >
                <Text style={[styles.filterChipText, defectStatusFilter === s && styles.filterChipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </LinearGradient>

      {/* ── Date pickers ── */}
      {showFromPicker && (
        <DateTimePicker value={fromDate || new Date()} mode="date" display="default"
          onChange={(_, d) => { setShowFromPicker(false); if (d) setFromDate(d); }} />
      )}
      {showToPicker && (
        <DateTimePicker value={toDate || new Date()} mode="date" display="default"
          onChange={(_, d) => { setShowToPicker(false); if (d) setToDate(d); }} />
      )}

      {/* ── Content ── */}
      <View style={{ flex: 1 }}>

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          loadingOrders && !refreshing ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#8b2219" />
              <Text style={styles.loadingText}>Syncing orders...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredOrders}
              keyExtractor={item => String(item.id || Math.random())}
              renderItem={renderOrder}
              ListHeaderComponent={renderOrderHeader}
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8b2219']} />}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Ionicons name="folder-open-outline" size={48} color="#cbd5e1" />
                  <Text style={styles.emptyText}>No orders match your criteria</Text>
                </View>
              }
            />
          )
        )}

        {/* DEFECTS TAB */}
        {activeTab === 'defects' && (
          loadingDefects ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#8b2219" />
              <Text style={styles.loadingText}>Loading defects...</Text>
            </View>
          ) : (
            <FlatList
              data={groupedDefects}
              keyExtractor={(item, i) => item.type === 'header' ? `hdr-${item.customer}` : `${item.name}-${i}`}
              renderItem={renderDefect}
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8b2219']} />}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Ionicons name="checkmark-circle-outline" size={48} color="#10b981" />
                  <Text style={styles.emptyText}>No Salestrack defects found</Text>
                </View>
              }
            />
          )
        )}

        {/* TRAINING TAB */}
        {activeTab === 'training' && (
          loadingTraining ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#8b2219" />
              <Text style={styles.loadingText}>Loading training records...</Text>
            </View>
          ) : (
            <>
              {/* Training summary row */}
              {training.length > 0 && (
                <View style={styles.trainingSummary}>
                  <View style={styles.trainingSummaryChip}>
                    <Text style={styles.trainingSummaryValue}>{training.length}</Text>
                    <Text style={styles.trainingSummaryLabel}>Completions</Text>
                  </View>
                  <View style={styles.trainingSummaryChip}>
                    <Text style={styles.trainingSummaryValue}>
                      {Math.round(training.reduce((s, t) => {
                        const pct = t.total_questions > 0 ? (t.score / t.total_questions) * 100 : t.score;
                        return s + pct;
                      }, 0) / training.length)}%
                    </Text>
                    <Text style={styles.trainingSummaryLabel}>Avg Score</Text>
                  </View>
                  <View style={styles.trainingSummaryChip}>
                    <Text style={styles.trainingSummaryValue}>
                      {new Set(training.map(t => t.course_id)).size}
                    </Text>
                    <Text style={styles.trainingSummaryLabel}>Courses</Text>
                  </View>
                </View>
              )}
              <FlatList
                data={training}
                keyExtractor={item => item.id}
                renderItem={renderTraining}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8b2219']} />}
                ListEmptyComponent={
                  <View style={styles.center}>
                    <Ionicons name="school-outline" size={48} color="#cbd5e1" />
                    <Text style={styles.emptyText}>No training records found</Text>
                  </View>
                }
              />
            </>
          )
        )}
      </View>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: { paddingBottom: 0 },
  headerRow1: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 10, gap: 10 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  countBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  iconBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },

  // Stats strip
  statsStrip: { flexDirection: 'row', paddingHorizontal: 14, gap: 8, marginBottom: 10 },
  statChip: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, paddingVertical: 7, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statValue: { fontSize: 17, fontWeight: '900' },
  statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: '600', textTransform: 'uppercase', marginTop: 1 },

  // Company filter
  companyFilterRow: { paddingHorizontal: 14, marginBottom: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  filterChipActive: { backgroundColor: '#fff' },
  filterChipText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: '#8b2219' },

  // Tab bar
  tabBar: { flexDirection: 'row', paddingHorizontal: 14, gap: 8, paddingBottom: 12 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#8b2219' },

  // Search / filters
  filtersBody: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 12 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, height: 42, gap: 6 },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
  clearBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, height: 42, borderRadius: 8, gap: 4 },
  clearText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  pickerWrapper: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', height: 42, justifyContent: 'center', overflow: 'hidden' },
  picker: { height: 42, color: '#fff' },
  dateFilterContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 10, height: 42, paddingHorizontal: 10 },
  periodLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginRight: 6 },
  dateBox: { paddingHorizontal: 2 },
  dateText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  periodTo: { marginHorizontal: 4, color: 'rgba(255,255,255,0.5)' },

  // Content
  listContent: { padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: '#64748b', fontWeight: '600' },
  emptyText: { marginTop: 12, color: '#94a3b8', fontSize: 15, fontWeight: '500', textAlign: 'center' },

  // Order table
  tableHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f1f5f9', borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  headerText: { fontSize: 9, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  rowCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', borderLeftWidth: 4, marginBottom: 6, paddingVertical: 10, paddingHorizontal: 12 },
  cellCustomer: { flex: 2, paddingRight: 8 },
  customerName: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 3 },
  riskBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2 },
  riskLabel: { fontSize: 9, fontWeight: '800' },
  defectBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 2, gap: 3 },
  defectText: { fontSize: 9, fontWeight: '800', color: '#b45309' },
  cellMachine: { flex: 2, paddingRight: 8 },
  machineName: { fontSize: 12, fontWeight: '700', color: '#334155' },
  brandText: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  cellQty: { width: 36, alignItems: 'center' },
  qtyText: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  cellStatus: { flex: 1.5, paddingHorizontal: 4 },
  statusPill: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, borderWidth: 1, alignSelf: 'flex-start' },
  statusText: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },
  cellNotes: { flex: 1.5, paddingHorizontal: 6 },
  notesText: { fontSize: 11, color: '#475569' },
  cellDate: { width: 78, alignItems: 'center' },
  cellDays: { width: 62, alignItems: 'center' },
  daysText: { fontSize: 15, fontWeight: '900' },

  // Defect cards
  defectGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingVertical: 10, marginTop: 4 },
  defectGroupText: { fontSize: 11, fontWeight: '800', color: '#475569', letterSpacing: 0.5 },
  defectCard: { backgroundColor: '#fff', borderRadius: 10, borderLeftWidth: 4, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, marginBottom: 6, elevation: 1, marginLeft: 8 },
  defectCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, gap: 8 },
  priorityBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  priorityBadgeText: { fontSize: 10, fontWeight: '800' },
  defectMachineName: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  defectRefText: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  defectDescription: { fontSize: 13, color: '#334155', lineHeight: 19, marginBottom: 8 },
  defectFooter: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  defectFooterItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  defectFooterText: { fontSize: 11, color: '#64748b', flex: 1 },

  // Training cards
  trainingCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, marginBottom: 8, elevation: 1 },
  trainingCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  trainingTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 3 },
  trainingEmail: { fontSize: 11, color: '#94a3b8' },
  scoreBadge: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  scoreText: { fontSize: 15, fontWeight: '900' },
  trainingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  trainingFooterItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trainingFooterText: { fontSize: 12, color: '#10b981', fontWeight: '600' },
  trainingDate: { fontSize: 11, color: '#94a3b8' },
  scoreBarBg: { height: 4, backgroundColor: '#f1f5f9', borderRadius: 99, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 99 },
  trainingSummary: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  trainingSummaryChip: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  trainingSummaryValue: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  trainingSummaryLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginTop: 1 },
});
