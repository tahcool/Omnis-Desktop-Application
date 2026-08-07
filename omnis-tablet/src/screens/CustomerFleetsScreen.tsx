import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity,
  RefreshControl, TextInput, StatusBar, ScrollView, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../api/supabaseClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getServiceColor = (hrsLeft: number | null, nextHmr: number) => {
  if (hrsLeft === null || hrsLeft === undefined || nextHmr === 0) return '#94a3b8';
  if (hrsLeft <= 0)   return '#ef4444';
  if (hrsLeft <= 50)  return '#ef4444';
  if (hrsLeft <= 250) return '#d97706';
  return '#10b981';
};

const getServiceLabel = (hrsLeft: number | null, nextHmr: number) => {
  if (hrsLeft === null || hrsLeft === undefined || nextHmr === 0) return '—';
  if (hrsLeft <= 0) return `${Math.abs(hrsLeft)}h overdue`;
  return `${hrsLeft}h left`;
};

// ─── Machine Detail Modal ─────────────────────────────────────────────────────

function MachineDetailModal({ machine, visible, onClose }: { machine: any; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  if (!machine) return null;

  const isWarranty = machine.warranty_status === 'Under Warranty';
  const hrsLeft = machine.hours_remaining_to_service;
  const nextHmr = machine.next_service_hmr || 0;
  const svcColor = getServiceColor(hrsLeft, nextHmr);
  const svcLabel = getServiceLabel(hrsLeft, nextHmr);

  const modelParts = (machine.model || '').split('-');
  const brand = modelParts[0] || '';
  const modelCode = modelParts.length > 1 ? modelParts.slice(1).join('-') : (machine.model || '—');

  const DetailRow = ({ label, value, valueColor }: { label: string; value: string | null | undefined; valueColor?: string }) => (
    <View style={dStyles.detailRow}>
      <Text style={dStyles.detailLabel}>{label}</Text>
      <Text style={[dStyles.detailValue, valueColor ? { color: valueColor } : {}]}>{value || '—'}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={dStyles.overlay}>
        <View style={dStyles.sheet}>
          {/* Sheet header */}
          <LinearGradient colors={['#4c110d', '#8b2219']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={dStyles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={dStyles.sheetBrand}>{brand}</Text>
              <Text style={dStyles.sheetModel}>{modelCode}</Text>
              <Text style={dStyles.sheetCustomer}>{machine.customer || '—'}</Text>
            </View>
            <View style={{ gap: 6, alignItems: 'flex-end' }}>
              <TouchableOpacity onPress={onClose} style={dStyles.closeIconBtn}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={[dStyles.warrantBadge, { backgroundColor: isWarranty ? '#14532d' : '#7f1d1d' }]}>
                <Text style={[dStyles.warrantBadgeText, { color: isWarranty ? '#4ade80' : '#fca5a5' }]}>
                  {isWarranty ? 'In Warranty' : 'Out of Warranty'}
                </Text>
              </View>
              {hrsLeft !== null && nextHmr > 0 && (
                <View style={[dStyles.warrantBadge, { backgroundColor: svcColor + '33' }]}>
                  <Text style={[dStyles.warrantBadgeText, { color: svcColor }]}>{svcLabel}</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {/* Stats strip */}
          <View style={dStyles.statsRow}>
            {[
              { label: 'Current HMR',      value: machine.current_hmr != null ? `${Number(machine.current_hmr).toLocaleString()} hrs` : '—' },
              { label: 'Hrs to Service',   value: hrsLeft != null ? `${hrsLeft} hrs` : '—',     color: svcColor },
              { label: 'Next Svc HMR',     value: nextHmr > 0 ? `${Number(nextHmr).toLocaleString()} hrs` : '—' },
            ].map((s, i) => (
              <View key={i} style={dStyles.statChip}>
                <Text style={[dStyles.statValue, s.color ? { color: s.color } : {}]}>{s.value}</Text>
                <Text style={dStyles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Details */}
          <ScrollView style={dStyles.detailsScroll} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
            <Text style={dStyles.sectionTitle}>Machine Details</Text>
            <DetailRow label="Serial No." value={machine.serial_number || machine.serial_no || machine.chassis_number || machine.name} />
            <DetailRow label="Fleet No."  value={machine.fleet_number || machine.fleet_no || machine.fleet_no_ft} />
            <DetailRow label="Region"     value={machine.region} />
            <DetailRow label="Location"   value={machine.location} />
            <DetailRow label="Warranty"   value={machine.warranty_status} valueColor={isWarranty ? '#059669' : '#ef4444'} />
            <DetailRow label="OEM"        value={machine.oem} />

            <Text style={[dStyles.sectionTitle, { marginTop: 16 }]}>Service History</Text>
            <DetailRow label="Current HMR"       value={machine.current_hmr != null ? `${Number(machine.current_hmr).toLocaleString()} hrs` : null} />
            <DetailRow label="Last Service"       value={machine.last_service} valueColor="#475569" />
            <DetailRow label="Next Service HMR"   value={nextHmr > 0 ? `${Number(nextHmr).toLocaleString()} hrs` : null} valueColor={svcColor} />
            <DetailRow label="Hours to Service"   value={hrsLeft != null ? `${hrsLeft} hrs` : null} valueColor={svcColor} />

            {(machine.technician || machine.contact_person) && (
              <>
                <Text style={[dStyles.sectionTitle, { marginTop: 16 }]}>Contact</Text>
                <DetailRow label="Technician"     value={machine.technician} />
                <DetailRow label="Contact Person" value={machine.contact_person} />
              </>
            )}
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CustomerFleetsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const [machines, setMachines]       = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch]   = useState(false);

  // Filters
  const [warrantyFilter, setWarrantyFilter] = useState<'All' | 'Under Warranty' | 'Out of Warranty'>('All');
  const [serviceFilter,  setServiceFilter]  = useState<'All' | 'Due' | 'Overdue'>('All');
  const [regionFilter,   setRegionFilter]   = useState('All');

  // Detail modal
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [detailVisible,   setDetailVisible]   = useState(false);

  // Quotes
  const [quotes, setQuotes]             = useState<any[]>([]);
  const [expandedQuotes, setExpandedQuotes] = useState<Record<string, boolean>>({});

  const fetchQuotes = async () => {
    try {
      const fiveMonthsAgo = new Date();
      fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
      const { data, error } = await supabase
        .from('quotations')
        .select('name, customer_name, transaction_date, grand_total, status, company, custom_sales_person, currency, valid_till, title')
        .gte('transaction_date', fiveMonthsAgo.toISOString().split('T')[0])
        .order('transaction_date', { ascending: false });
      if (!error) setQuotes(data || []);
    } catch (e) { console.error(e); }
  };

  const fetchMachines = async () => {
    try {
      const res = await fetch(
        'https://fleetrack.machinery-exchange.com/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }
      );
      const json = await res.json();
      setMachines(json?.data || json?.message?.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchMachines(); fetchQuotes(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchMachines(); fetchQuotes(); };

  // ── Available regions ─────────────────────────────────────────────────────
  const regions = useMemo(() => {
    const r = new Set(machines.map(m => m.region).filter(Boolean));
    return ['All', ...Array.from(r).sort()];
  }, [machines]);

  // ── Filtered machines ─────────────────────────────────────────────────────
  const filtered = useMemo(() => machines.filter(m => {
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const cust = (m.customer || '').toLowerCase();
      const mod  = (m.model || '').toLowerCase();
      const sn   = (m.serial_number || m.serial_no || m.chassis_number || m.name || '').toLowerCase();
      const loc  = (m.location || '').toLowerCase();
      if (!cust.includes(q) && !mod.includes(q) && !sn.includes(q) && !loc.includes(q)) return false;
    }
    // Warranty
    if (warrantyFilter !== 'All') {
      if (m.warranty_status !== warrantyFilter) return false;
    }
    // Service
    if (serviceFilter === 'Due') {
      const h = m.hours_remaining_to_service;
      if (h === null || h === undefined || h > 250 || (m.next_service_hmr || 0) === 0) return false;
    }
    if (serviceFilter === 'Overdue') {
      const h = m.hours_remaining_to_service;
      if (h === null || h === undefined || h > 0) return false;
    }
    // Region
    if (regionFilter !== 'All' && m.region !== regionFilter) return false;

    return true;
  }), [machines, searchQuery, warrantyFilter, serviceFilter, regionFilter]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const inWarranty = filtered.filter(m => m.warranty_status === 'Under Warranty').length;
    const svcDue     = filtered.filter(m => {
      const h = m.hours_remaining_to_service;
      return h !== null && h !== undefined && h <= 250 && (m.next_service_hmr || 0) > 0;
    }).length;
    const overdue = filtered.filter(m => {
      const h = m.hours_remaining_to_service;
      return h !== null && h !== undefined && h <= 0;
    }).length;
    const customers = new Set(filtered.map(m => m.customer)).size;
    return { total: filtered.length, customers, inWarranty, svcDue, overdue };
  }, [filtered]);

  // ── Group by customer ─────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    filtered.forEach(m => {
      const k = m.customer || 'Unassigned';
      if (!g[k]) g[k] = [];
      g[k].push(m);
    });
    return g;
  }, [filtered]);

  // ── Group quotes by customer name ─────────────────────────────────────────
  const quotesGrouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    quotes.forEach(q => {
      const key = (q.customer_name || '').trim();
      if (!g[key]) g[key] = [];
      g[key].push(q);
    });
    return g;
  }, [quotes]);

  // Fuzzy match: find quotes for a fleet customer by checking substring match
  const getQuotesForCustomer = (customer: string) => {
    const custLower = customer.toLowerCase().trim();
    // Try exact match first, then substring
    const exactKey = Object.keys(quotesGrouped).find(k => k.toLowerCase() === custLower);
    if (exactKey) return quotesGrouped[exactKey];
    const fuzzyKey = Object.keys(quotesGrouped).find(k =>
      k.toLowerCase().includes(custLower) || custLower.includes(k.toLowerCase())
    );
    return fuzzyKey ? quotesGrouped[fuzzyKey] : [];
  };

  const toggleQuotes = (customer: string) =>
    setExpandedQuotes(prev => ({ ...prev, [customer]: !prev[customer] }));

  const sortedCustomers = Object.keys(grouped).sort();

  // ── Render machine row ────────────────────────────────────────────────────
  const renderMachine = (m: any, idx: number, isLast: boolean) => {
    const modelParts = (m.model || '').split('-');
    const modelCode = modelParts.length > 1 ? modelParts.slice(1).join('-') : (m.model || '-');
    const brand = modelParts[0] || '';
    const hrsLeft = m.hours_remaining_to_service;
    const nextHmr = m.next_service_hmr || 0;
    const svcColor = getServiceColor(hrsLeft, nextHmr);
    const svcLabel = getServiceLabel(hrsLeft, nextHmr);
    const isWarranty = m.warranty_status === 'Under Warranty';

    return (
      <TouchableOpacity
        key={idx}
        style={[styles.machineRow, isLast && { borderBottomWidth: 0 }]}
        onPress={() => { setSelectedMachine(m); setDetailVisible(true); }}
        activeOpacity={0.7}
      >
        {/* Model + brand */}
        <View style={styles.machineCol1}>
          <Text style={styles.machineModel} numberOfLines={1}>{modelCode}</Text>
          <Text style={styles.machineBrand}>{brand}</Text>
        </View>

        {/* Serial + Location */}
        <View style={styles.machineCol2}>
          <Text style={styles.machineSn} numberOfLines={1}>
            {m.serial_number || m.serial_no || m.chassis_number || m.name || '—'}
          </Text>
          {m.location ? <Text style={styles.machineLocation} numberOfLines={1}>{m.location}</Text> : null}
        </View>

        {/* HMR */}
        <View style={styles.machineCol3}>
          <Text style={styles.machineHmr}>{m.current_hmr != null ? Number(m.current_hmr).toLocaleString() : '—'}</Text>
          <Text style={styles.machineHmrLabel}>hrs</Text>
        </View>

        {/* Service */}
        <View style={styles.machineCol4}>
          <Text style={[styles.machineSvc, { color: svcColor }]}>{svcLabel}</Text>
        </View>

        {/* Warranty + chevron */}
        <View style={styles.machineCol5}>
          {isWarranty
            ? <View style={styles.badgeIn}><Text style={styles.badgeInText}>In</Text></View>
            : <View style={styles.badgeOut}><Text style={styles.badgeOutText}>Out</Text></View>}
          <Ionicons name="chevron-forward" size={12} color="#94a3b8" style={{ marginTop: 4 }} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderCustomer = ({ item: customer }: { item: string }) => {
    const custMachines = grouped[customer];
    const custInWarranty = custMachines.filter(m => m.warranty_status === 'Under Warranty').length;
    const custSvcDue = custMachines.filter(m => {
      const h = m.hours_remaining_to_service;
      return h !== null && h !== undefined && h <= 250 && (m.next_service_hmr || 0) > 0;
    }).length;

    return (
      <View style={styles.customerCard}>
        <View style={styles.customerHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerTitle}>{customer}</Text>
            <Text style={styles.customerCount}>{custMachines.length} machine{custMachines.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {custInWarranty > 0 && (
              <View style={[styles.custBadge, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
                <Text style={[styles.custBadgeText, { color: '#059669' }]}>{custInWarranty} warranty</Text>
              </View>
            )}
            {custSvcDue > 0 && (
              <View style={[styles.custBadge, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                <Text style={[styles.custBadgeText, { color: '#d97706' }]}>{custSvcDue} svc due</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.tableHeaderRow}>
          <View style={styles.machineCol1}><Text style={styles.th}>MODEL</Text></View>
          <View style={styles.machineCol2}><Text style={styles.th}>SERIAL / LOCATION</Text></View>
          <View style={styles.machineCol3}><Text style={[styles.th, { textAlign: 'right' }]}>HMR</Text></View>
          <View style={styles.machineCol4}><Text style={[styles.th, { textAlign: 'right' }]}>SERVICE</Text></View>
          <View style={styles.machineCol5}><Text style={[styles.th, { textAlign: 'center' }]}>WRNTY</Text></View>
        </View>

        <View style={styles.tableBody}>
          {custMachines.map((m, idx) => renderMachine(m, idx, idx === custMachines.length - 1))}
        </View>

        {/* ── Recent Quotes accordion ── */}
        {(() => {
          const custQuotes = getQuotesForCustomer(customer);
          const isExpanded = !!expandedQuotes[customer];
          if (custQuotes.length === 0) return null;

          const QUOTE_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
            Draft:     { bg: '#f1f5f9', text: '#64748b' },
            Submitted: { bg: '#eff6ff', text: '#1d4ed8' },
            Ordered:   { bg: '#ecfdf5', text: '#059669' },
            Expired:   { bg: '#fef2f2', text: '#dc2626' },
            Cancelled: { bg: '#fef2f2', text: '#dc2626' },
            Lost:      { bg: '#fef2f2', text: '#dc2626' },
          };

          return (
            <View style={styles.quotesSection}>
              <TouchableOpacity style={styles.quotesSectionHeader} onPress={() => toggleQuotes(customer)} activeOpacity={0.7}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="document-text-outline" size={14} color="#8b2219" />
                  <Text style={styles.quotesSectionTitle}>Recent Quotes</Text>
                  <View style={styles.quotesCountBadge}>
                    <Text style={styles.quotesCountText}>{custQuotes.length}</Text>
                  </View>
                </View>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#64748b" />
              </TouchableOpacity>

              {isExpanded && custQuotes.map((q, qi) => {
                const sc = QUOTE_STATUS_COLORS[q.status] || { bg: '#f1f5f9', text: '#64748b' };
                const dateStr = q.transaction_date
                  ? new Date(q.transaction_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—';
                const validStr = q.valid_till
                  ? new Date(q.valid_till).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                  : null;
                const isExpired = q.valid_till && new Date(q.valid_till) < new Date();
                const total = q.grand_total
                  ? `${q.currency || 'USD'} ${Number(q.grand_total).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                  : '—';

                return (
                  <View key={qi} style={[styles.quoteCard, qi === custQuotes.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={styles.quoteCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.quoteName}>{q.name}</Text>
                        <Text style={styles.quoteDate}>{dateStr}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={styles.quoteTotal}>{total}</Text>
                        <View style={[styles.quoteStatusBadge, { backgroundColor: sc.bg }]}>
                          <Text style={[styles.quoteStatusText, { color: sc.text }]}>{q.status}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.quoteCardFooter}>
                      {q.custom_sales_person ? (
                        <View style={styles.quoteFooterItem}>
                          <Ionicons name="person-outline" size={10} color="#94a3b8" />
                          <Text style={styles.quoteFooterText}>{q.custom_sales_person}</Text>
                        </View>
                      ) : null}
                      {validStr ? (
                        <View style={styles.quoteFooterItem}>
                          <Ionicons name="calendar-outline" size={10} color={isExpired ? '#ef4444' : '#94a3b8'} />
                          <Text style={[styles.quoteFooterText, isExpired && { color: '#ef4444' }]}>
                            Valid till {validStr}{isExpired ? ' · Expired' : ''}
                          </Text>
                        </View>
                      ) : null}
                      {q.company ? (
                        <View style={styles.quoteFooterItem}>
                          <Ionicons name="business-outline" size={10} color="#94a3b8" />
                          <Text style={styles.quoteFooterText}>{q.company}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })()}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Header ── */}
      <LinearGradient
        colors={['#4c110d', '#8b2219', '#6b1a14']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        {/* Row 1: title + actions */}
        <View style={styles.headerRow1}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Customer Fleets</Text>
            <Text style={styles.subtitle}>Fleetrack · Live data</Text>
          </View>
          <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={styles.iconBtn}>
            <Ionicons name={showSearch ? 'close' : 'search'} size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRefresh} style={styles.iconBtn}>
            <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        {/* Row 2: Stats strip */}
        <View style={styles.statsStrip}>
          {[
            { label: 'Customers',   value: stats.customers, color: '#fff' },
            { label: 'Machines',    value: stats.total,     color: '#fff' },
            { label: 'In Warranty', value: stats.inWarranty,color: '#4ade80' },
            { label: 'Svc Due',     value: stats.svcDue,    color: '#fb923c' },
            { label: 'Overdue',     value: stats.overdue,   color: '#f87171' },
          ].map((s, i) => (
            <View key={i} style={styles.statChip}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Search bar */}
        {showSearch && (
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search model, serial, customer, location..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Row 3: Warranty + Service filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 6, paddingRight: 16 }}>
          {(['All', 'Under Warranty', 'Out of Warranty'] as const).map(w => (
            <TouchableOpacity key={w} style={[styles.filterChip, warrantyFilter === w && styles.filterChipActive]} onPress={() => setWarrantyFilter(w)}>
              <Text style={[styles.filterChipText, warrantyFilter === w && styles.filterChipTextActive]}>{w}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.filterDivider} />
          {(['All', 'Due', 'Overdue'] as const).map(s => (
            <TouchableOpacity key={s} style={[styles.filterChip, serviceFilter === s && styles.filterChipActive]} onPress={() => setServiceFilter(s)}>
              {s === 'Due'     ? <View style={[styles.statusDot, { backgroundColor: '#d97706' }]} /> : null}
              {s === 'Overdue' ? <View style={[styles.statusDot, { backgroundColor: '#ef4444' }]} /> : null}
              <Text style={[styles.filterChipText, serviceFilter === s && styles.filterChipTextActive]}>
                {s === 'All' ? 'All Service' : s}
              </Text>
            </TouchableOpacity>
          ))}
          {regions.length > 2 && (
            <>
              <View style={styles.filterDivider} />
              {regions.map(r => (
                <TouchableOpacity key={r} style={[styles.filterChip, regionFilter === r && styles.filterChipActive]} onPress={() => setRegionFilter(r)}>
                  {r !== 'All' ? <Ionicons name="location-outline" size={10} color={regionFilter === r ? '#8b2219' : 'rgba(255,255,255,0.7)'} /> : null}
                  <Text style={[styles.filterChipText, regionFilter === r && styles.filterChipTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      </LinearGradient>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8b2219" />
          <Text style={styles.loadingText}>Loading fleet data from Fleetrack...</Text>
        </View>
      ) : (
        <FlatList
          data={sortedCustomers}
          keyExtractor={item => item}
          renderItem={renderCustomer}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8b2219']} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="car-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No machines match your filters</Text>
            </View>
          }
        />
      )}

      {/* ── Machine Detail Modal ── */}
      <MachineDetailModal
        machine={selectedMachine}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
      />
    </View>
  );
}

// ─── Main Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  // Header
  header: { paddingBottom: 0, elevation: 4 },
  headerRow1: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  backButton: { padding: 4 },
  iconBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 },

  // Stats strip
  statsStrip: { flexDirection: 'row', paddingHorizontal: 14, gap: 6, marginBottom: 10 },
  statChip: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, paddingVertical: 6, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statValue: { fontSize: 15, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 8, color: 'rgba(255,255,255,0.55)', fontWeight: '600', textTransform: 'uppercase', marginTop: 1 },

  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, marginHorizontal: 14, marginBottom: 8, height: 40, gap: 6 },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a' },

  // Filters
  filterRow: { paddingHorizontal: 14, marginBottom: 10 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  filterChipActive: { backgroundColor: '#fff' },
  filterChipText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' },
  filterChipTextActive: { color: '#8b2219' },
  filterDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },

  // List
  listContent: { padding: 14, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 14, color: '#64748b', fontWeight: '600', textAlign: 'center' },
  emptyText: { marginTop: 12, color: '#94a3b8', fontSize: 14 },

  // Customer card
  customerCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16, overflow: 'hidden', elevation: 2 },
  customerHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fafbfc' },
  customerTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  customerCount: { fontSize: 11, color: '#64748b', marginTop: 1 },
  custBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  custBadgeText: { fontSize: 10, fontWeight: '700' },

  // Table header
  tableHeaderRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  th: { fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' },
  tableBody: { paddingHorizontal: 12 },

  // Machine row
  machineRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  machineCol1: { flex: 2 },
  machineCol2: { flex: 2.5 },
  machineCol3: { flex: 1.2, alignItems: 'flex-end', paddingRight: 8 },
  machineCol4: { flex: 1.5, alignItems: 'flex-end', paddingRight: 8 },
  machineCol5: { flex: 1, alignItems: 'center' },

  machineModel: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  machineBrand: { fontSize: 10, color: '#3b82f6', marginTop: 1 },
  machineSn: { fontSize: 11, color: '#475569', fontWeight: '600' },
  machineLocation: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  machineHmr: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  machineHmrLabel: { fontSize: 9, color: '#94a3b8' },
  machineSvc: { fontSize: 11, fontWeight: '700', textAlign: 'right' },
  badgeIn: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  badgeInText: { color: '#059669', fontSize: 9, fontWeight: '700' },
  badgeOut: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  badgeOutText: { color: '#64748b', fontSize: 9, fontWeight: '700' },

  // Quotes section
  quotesSection: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  quotesSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fafbfc' },
  quotesSectionTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  quotesCountBadge: { backgroundColor: '#8b2219', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  quotesCountText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  quoteCard: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
  quoteCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  quoteName: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  quoteDate: { fontSize: 11, color: '#94a3b8' },
  quoteTotal: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  quoteStatusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  quoteStatusText: { fontSize: 10, fontWeight: '800' },
  quoteCardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quoteFooterItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  quoteFooterText: { fontSize: 11, color: '#64748b' },
});

// ─── Detail Modal Styles ──────────────────────────────────────────────────────

const dStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%' },
  sheetHeader: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetBrand: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  sheetModel: { fontSize: 22, fontWeight: '900', color: '#fff', marginVertical: 2 },
  sheetCustomer: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  warrantBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  warrantBadgeText: { fontSize: 11, fontWeight: '800' },

  statsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  statChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRightWidth: 1, borderRightColor: '#f1f5f9' },
  statValue: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },

  detailsScroll: { paddingHorizontal: 18 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14, marginBottom: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  detailLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', flex: 1 },
  detailValue: { fontSize: 13, color: '#0f172a', fontWeight: '700', textAlign: 'right', flex: 2 },

  closeIconBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 6,
    marginBottom: 4,
  },
  closeBtn: { margin: 16, backgroundColor: '#8b2219', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
