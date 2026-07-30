import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity,
  RefreshControl, TextInput, StatusBar, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../api/supabaseClient';

// ─── Status colour map ────────────────────────────────────────────────────────

const QUOTE_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  Draft:     { bg: '#f1f5f9', text: '#64748b', bar: '#94a3b8' },
  Submitted: { bg: '#eff6ff', text: '#1d4ed8', bar: '#3b82f6' },
  Ordered:   { bg: '#ecfdf5', text: '#059669', bar: '#10b981' },
  Expired:   { bg: '#fef2f2', text: '#dc2626', bar: '#ef4444' },
  Cancelled: { bg: '#fef2f2', text: '#dc2626', bar: '#ef4444' },
  Lost:      { bg: '#fef2f2', text: '#dc2626', bar: '#ef4444' },
};

const fmtAmount = (val: any, currency = 'USD') => {
  if (!val) return '—';
  const n = Number(val);
  if (isNaN(n)) return '—';
  return `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const fmtDate = (d: string | null, short = false) => {
  if (!d) return '—';
  const opts: Intl.DateTimeFormatOptions = short
    ? { day: '2-digit', month: 'short' }
    : { day: '2-digit', month: 'short', year: 'numeric' };
  return new Date(d).toLocaleDateString('en-GB', opts);
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SalestackCustomersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const [customers, setCustomers]   = useState<any[]>([]);
  const [quotes, setQuotes]         = useState<any[]>([]);
  const [items, setItems]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & search
  const [search,          setSearch]          = useState('');
  const [showSearch,      setShowSearch]      = useState(false);
  const [territoryFilter, setTerritoryFilter] = useState('All');
  const [typeFilter,      setTypeFilter]      = useState('All');
  const [quoteFilter,     setQuoteFilter]     = useState<'All' | 'Has Quotes' | 'No Quotes'>('All');
  const [ownerFilter,     setOwnerFilter]     = useState<'All' | 'My Customers'>('All');
  const [currentUser,     setCurrentUser]     = useState<any>(null);

  // Expanded quote rows per customer
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = async () => {
    try {
      const fiveMonthsAgo = new Date();
      fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
      const cutoff = fiveMonthsAgo.toISOString().split('T')[0];
      const PAGE = 1000;

      // ── Helper: paginate any supabase query builder ───────────────────────
      const paginate = async (builder: (from: number, to: number) => Promise<{ data: any[] | null; error: any }>) => {
        let all: any[] = [];
        let page = 0;
        while (true) {
          const { data, error } = await builder(page * PAGE, (page + 1) * PAGE - 1);
          if (error || !data || data.length === 0) break;
          all = [...all, ...data];
          if (data.length < PAGE) break;
          page++;
        }
        return all;
      };

      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // ── Step 1: Customers + Quotes in PARALLEL (biggest speedup) ──────────
      const [allCustomers, allQuotes] = await Promise.all([
        paginate((from, to) =>
          supabase
            .from('customers')
            .select('id, frappe_id, customer_name, customer_group, territory, customer_type, tier, account_manager, last_visit_date')
            .neq('customer_name', '.')
            .neq('customer_name', '')
            .order('customer_name')
            .range(from, to)
        ),
        paginate((from, to) =>
          supabase
            .from('quotations')
            .select('name, customer_name, transaction_date, grand_total, status, company, custom_sales_person, currency, valid_till, title')
            .gte('transaction_date', cutoff)
            .order('transaction_date', { ascending: false })
            .range(from, to)
        ),
      ]);

      setCustomers(allCustomers);
      setQuotes(allQuotes);
      setLoading(false);      // ← UI unlocks here; items still loading in background
      setRefreshing(false);

      // ── Step 2: Items filtered to ONLY the quotes we fetched ──────────────
      // Instead of fetching all items ever, limit to the recent quote parents.
      // This can reduce payload from 50k+ rows to just a few hundred/thousand.
      if (allQuotes.length > 0) {
        const quoteNames = allQuotes.map((q: any) => q.name);
        const CHUNK = 400; // stay well under PostgREST URL length limits
        let allItems: any[] = [];
        for (let i = 0; i < quoteNames.length; i += CHUNK) {
          const chunk = quoteNames.slice(i, i + CHUNK);
          const { data } = await supabase
            .from('quotation_items')
            .select('id, parent, item_name, item_code, item_group, brand, qty, rate, amount')
            .in('parent', chunk);
          if (data) allItems = [...allItems, ...data];
        }
        setItems(allItems);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // ── Group quotes by customer_name ─────────────────────────────────────────

  const quotesByCustomer = useMemo(() => {
    const g: Record<string, any[]> = {};
    quotes.forEach(q => {
      const k = (q.customer_name || '').trim();
      if (!g[k]) g[k] = [];
      g[k].push(q);
    });
    return g;
  }, [quotes]);

  // ── Group items by quote parent ─────────────────────────────────────────

  const itemsByQuote = useMemo(() => {
    const g: Record<string, any[]> = {};
    items.forEach(i => {
      if (!g[i.parent]) g[i.parent] = [];
      g[i.parent].push(i);
    });
    return g;
  }, [items]);

  const getQuotes = (name: string): any[] => {
    if (!name) return [];
    const exact = quotesByCustomer[name.trim()];
    if (exact) return exact;
    // fallback fuzzy
    const lower = name.toLowerCase();
    const fuzzy = Object.keys(quotesByCustomer).find(k =>
      k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase())
    );
    return fuzzy ? quotesByCustomer[fuzzy] : [];
  };

  // ── Available filter options ──────────────────────────────────────────────

  const territories = useMemo(() => {
    const t = new Set(customers.map(c => c.territory).filter(Boolean));
    return ['All', ...Array.from(t).sort()];
  }, [customers]);

  const customerTypes = useMemo(() => {
    const t = new Set(customers.map(c => c.customer_type).filter(Boolean));
    return ['All', ...Array.from(t).sort()];
  }, [customers]);

  // ── Filtered customers ────────────────────────────────────────────────────

  const filtered = useMemo(() => customers.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      if (!(c.customer_name || '').toLowerCase().includes(q) &&
          !(c.territory || '').toLowerCase().includes(q)) return false;
    }
    if (territoryFilter !== 'All' && c.territory !== territoryFilter) return false;
    if (typeFilter !== 'All' && c.customer_type !== typeFilter) return false;
    if (ownerFilter === 'My Customers' && currentUser?.email && c.account_manager !== currentUser.email) return false;
    if (quoteFilter === 'Has Quotes' && getQuotes(c.customer_name).length === 0) return false;
    if (quoteFilter === 'No Quotes'  && getQuotes(c.customer_name).length  > 0) return false;
    return true;
  }), [customers, search, territoryFilter, typeFilter, quoteFilter, ownerFilter, currentUser, quotesByCustomer]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total     = filtered.length;
    const withQ     = filtered.filter(c => getQuotes(c.customer_name).length > 0).length;
    const totalQ    = filtered.reduce((s, c) => s + getQuotes(c.customer_name).length, 0);
    const expired   = quotes.filter(q => q.valid_till && new Date(q.valid_till) < new Date() && q.status !== 'Ordered' && q.status !== 'Cancelled').length;
    return { total, withQ, totalQ, expired };
  }, [filtered, quotesByCustomer]);

  // ── Render ────────────────────────────────────────────────────────────────

  const renderCustomer = ({ item: c }: { item: any }) => {
    const custQuotes = getQuotes(c.customer_name);
    const isOpen = !!expanded[c.id];
    const mostRecent = custQuotes[0];
    const totalUSD = custQuotes
      .filter(q => (q.currency || 'USD') === 'USD')
      .reduce((s: number, q: any) => s + Number(q.grand_total || 0), 0);

    const isHotLead = custQuotes.some(q => 
      (q.status === 'Draft' || q.status === 'Submitted') && 
      (Number(q.grand_total || 0) > 10000)
    );

    let visitFrequencyDays = 90;
    if (c.tier === 1) visitFrequencyDays = 30;
    else if (c.tier === 2) visitFrequencyDays = 60;

    let isOverdue = false;
    let nextVisitDateStr = 'Needs Visit';
    if (c.last_visit_date) {
      const lastVisit = new Date(c.last_visit_date);
      const nextVisit = new Date(lastVisit.getTime() + visitFrequencyDays * 24 * 60 * 60 * 1000);
      isOverdue = nextVisit < new Date();
      nextVisitDateStr = fmtDate(nextVisit.toISOString(), true);
    } else {
      isOverdue = true;
    }

    return (
      <View style={styles.card}>
        {isHotLead && (
          <View style={{ backgroundColor: '#ef4444', padding: 4, alignItems: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 10 }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>🔥 Hot Lead - Open Quote > $10k - Visit ASAP</Text>
          </View>
        )}
        {/* ── Customer header ── */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.custName}>{c.customer_name}</Text>
            <View style={styles.custMeta}>
              {c.territory ? (
                <View style={styles.metaChip}>
                  <Ionicons name="location-outline" size={10} color="#64748b" />
                  <Text style={styles.metaText}>{c.territory}</Text>
                </View>
              ) : null}
              {c.customer_type ? (
                <View style={styles.metaChip}>
                  <Ionicons name={c.customer_type === 'Individual' ? 'person-outline' : 'business-outline'} size={10} color="#64748b" />
                  <Text style={styles.metaText}>{c.customer_type}</Text>
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {c.account_manager ? (
                <View style={styles.metaChip}>
                  <Ionicons name="person" size={10} color="#8b2219" />
                  <Text style={[styles.metaText, { color: '#8b2219', fontWeight: 'bold' }]}>{c.account_manager}</Text>
                </View>
              ) : null}
              <View style={[styles.metaChip, { backgroundColor: isOverdue ? '#fef2f2' : '#ecfdf5', borderColor: isOverdue ? '#fecaca' : '#a7f3d0' }]}>
                <Ionicons name="calendar-outline" size={10} color={isOverdue ? '#ef4444' : '#10b981'} />
                <Text style={[styles.metaText, { color: isOverdue ? '#ef4444' : '#10b981' }]}>
                  {c.last_visit_date ? `Last: ${fmtDate(c.last_visit_date, true)}` : 'No Visit Record'}
                </Text>
              </View>
              <View style={[styles.metaChip, { backgroundColor: isOverdue ? '#ef4444' : '#f1f5f9', borderWidth: 0 }]}>
                <Ionicons name="time-outline" size={10} color={isOverdue ? '#fff' : '#64748b'} />
                <Text style={[styles.metaText, { color: isOverdue ? '#fff' : '#64748b', fontWeight: isOverdue ? 'bold' : 'normal' }]}>
                  {isOverdue ? 'Overdue' : `Due: ${nextVisitDateStr}`}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardHeaderRight}>
            {custQuotes.length > 0 ? (
              <>
                <Text style={styles.quoteCount}>{custQuotes.length} quote{custQuotes.length !== 1 ? 's' : ''}</Text>
                {(() => {
                  // Show unique item groups across all quotes for this customer
                  const allItemGroups = new Set(
                    custQuotes.flatMap(q => (itemsByQuote[q.name] || []).map((i: any) => i.item_group).filter(Boolean))
                  );
                  return allItemGroups.size > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, justifyContent: 'flex-end' }}>
                      {Array.from(allItemGroups).slice(0, 3).map((g: any) => (
                        <View key={g} style={styles.itemGroupChip}>
                          <Text style={styles.itemGroupChipText}>{g}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null;
                })()}
                {mostRecent && (
                  <View style={[styles.statusPill, { backgroundColor: (QUOTE_COLORS[mostRecent.status] || QUOTE_COLORS.Draft).bg }]}>
                    <Text style={[styles.statusPillText, { color: (QUOTE_COLORS[mostRecent.status] || QUOTE_COLORS.Draft).text }]}>
                      {mostRecent.status}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.noQuotes}>No recent quotes</Text>
            )}
          </View>
        </View>

        {/* ── Quotes accordion ── */}
        {custQuotes.length > 0 && (
          <>
            <TouchableOpacity style={styles.accordionToggle} onPress={() => toggle(c.id)} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="document-text-outline" size={13} color="#8b2219" />
                <Text style={styles.accordionLabel}>Recent Quotes ({custQuotes.length})</Text>
              </View>
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={15} color="#64748b" />
            </TouchableOpacity>

            {isOpen && custQuotes.map((q, qi) => {
              const sc = QUOTE_COLORS[q.status] || QUOTE_COLORS.Draft;
              const isExpired = q.valid_till && new Date(q.valid_till) < new Date() && q.status !== 'Ordered';
              return (
                <View key={qi} style={[styles.quoteRow, qi === custQuotes.length - 1 && { borderBottomWidth: 0 }]}>
                  {/* left accent bar */}
                  <View style={[styles.quoteAccent, { backgroundColor: sc.bar }]} />

                  <View style={styles.quoteBody}>
                    <View style={styles.quoteTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.quoteName}>{q.name}</Text>
                        <Text style={styles.quoteDate}>{fmtDate(q.transaction_date)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={[styles.qStatusBadge, { backgroundColor: sc.bg }]}>
                          <Text style={[styles.qStatusText, { color: sc.text }]}>{q.status}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Items list */}
                    {(itemsByQuote[q.name] || []).length > 0 && (
                      <View style={styles.itemsList}>
                        {(itemsByQuote[q.name] || []).map((item: any, ii: number) => (
                          <View key={ii} style={styles.itemRow}>
                            <View style={styles.itemRowLeft}>
                              {item.item_group ? (
                                <View style={styles.itemGroupBadge}>
                                  <Text style={styles.itemGroupBadgeText}>{item.item_group}</Text>
                                </View>
                              ) : null}
                              <Text style={styles.itemName} numberOfLines={2}>{item.item_name}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={styles.itemQty}>{Number(item.qty || 1).toFixed(0)} unit{Number(item.qty) !== 1 ? 's' : ''}</Text>
                              {item.amount ? (
                                <Text style={{ fontSize: 11, color: '#475569', fontWeight: '500', marginTop: 2 }}>
                                  {fmtAmount(item.amount, q.currency)}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.quoteBottom}>
                      {q.custom_sales_person ? (
                        <View style={styles.qMeta}>
                          <Ionicons name="person-outline" size={10} color="#94a3b8" />
                          <Text style={styles.qMetaText}>{q.custom_sales_person}</Text>
                        </View>
                      ) : null}
                      {q.valid_till ? (
                        <View style={styles.qMeta}>
                          <Ionicons name="calendar-outline" size={10} color={isExpired ? '#ef4444' : '#94a3b8'} />
                          <Text style={[styles.qMetaText, isExpired && { color: '#ef4444' }]}>
                            Valid till {fmtDate(q.valid_till, true)}{isExpired ? ' · Expired' : ''}
                          </Text>
                        </View>
                      ) : null}
                      {q.company ? (
                        <View style={styles.qMeta}>
                          <Ionicons name="business-outline" size={10} color="#94a3b8" />
                          <Text style={styles.qMetaText}>{q.company}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}
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
        {/* Row 1: Back + title */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Customers</Text>
            <Text style={styles.subtitle}>Salestrack · Last 5 months of activity</Text>
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
            { label: 'Customers',    value: stats.total,   color: '#fff' },
            { label: 'With Quotes',  value: stats.withQ,   color: '#38bdf8' },
            { label: 'Total Quotes', value: stats.totalQ,  color: '#4ade80' },
            { label: 'Expiring',     value: stats.expired, color: '#fb923c' },
          ].map((s, i) => (
            <View key={i} style={styles.statChip}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Search */}
        {showSearch && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={15} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search customer name or territory..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={15} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Row 3: Filter chips */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={{ gap: 6, paddingRight: 14 }}
        >
          {/* Owner filter */}
          {(['All', 'My Customers'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, ownerFilter === f && styles.chipActive]}
              onPress={() => setOwnerFilter(f)}
            >
              <Text style={[styles.chipText, ownerFilter === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.chipDivider} />

          {/* Quote filter */}
          {(['All', 'Has Quotes', 'No Quotes'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, quoteFilter === f && styles.chipActive]}
              onPress={() => setQuoteFilter(f)}
            >
              <Text style={[styles.chipText, quoteFilter === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.chipDivider} />

          {/* Type filter */}
          {customerTypes.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, typeFilter === t && styles.chipActive]}
              onPress={() => setTypeFilter(t)}
            >
              {t !== 'All' ? (
                <Ionicons name={t === 'Individual' ? 'person-outline' : 'business-outline'} size={10}
                  color={typeFilter === t ? '#8b2219' : 'rgba(255,255,255,0.8)'} />
              ) : null}
              <Text style={[styles.chipText, typeFilter === t && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}

          {territories.length > 2 && (
            <>
              <View style={styles.chipDivider} />
              {territories.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, territoryFilter === t && styles.chipActive]}
                  onPress={() => setTerritoryFilter(t)}
                >
                  {t !== 'All' ? <Ionicons name="location-outline" size={10} color={territoryFilter === t ? '#8b2219' : 'rgba(255,255,255,0.8)'} /> : null}
                  <Text style={[styles.chipText, territoryFilter === t && styles.chipTextActive]}>{t}</Text>
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
          <Text style={styles.loadingText}>Loading Salestrack customers...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderCustomer}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8b2219']} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No customers match your filters</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  // Header
  header: { paddingBottom: 0, elevation: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  backBtn: { padding: 4 },
  iconBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 },

  // Stats strip
  statsStrip: { flexDirection: 'row', paddingHorizontal: 14, gap: 6, marginBottom: 10 },
  statChip: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, paddingVertical: 7, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statValue: { fontSize: 16, fontWeight: '900' },
  statLabel: { fontSize: 8, color: 'rgba(255,255,255,0.55)', fontWeight: '600', textTransform: 'uppercase', marginTop: 1 },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, marginHorizontal: 14, marginBottom: 8, height: 40, gap: 6 },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a' },

  // Filters
  filterRow: { paddingHorizontal: 14, marginBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  chipActive: { backgroundColor: '#fff' },
  chipText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#8b2219' },
  chipDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 2 },

  // List
  listContent: { padding: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, minHeight: 200 },
  loadingText: { marginTop: 14, color: '#64748b', fontWeight: '600', textAlign: 'center' },
  emptyText: { marginTop: 12, color: '#94a3b8', fontSize: 14 },

  // Customer card
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, overflow: 'hidden', elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 10 },
  cardHeaderLeft: { flex: 1 },
  cardHeaderRight: { alignItems: 'flex-end', gap: 4 },
  custName: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 5 },
  custMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f8fafc', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: '#e2e8f0' },
  metaText: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  quoteCount: { fontSize: 11, fontWeight: '700', color: '#8b2219' },
  quoteValue: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  statusPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  noQuotes: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' },

  // Accordion toggle
  accordionToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#fafbfc' },
  accordionLabel: { fontSize: 11, fontWeight: '800', color: '#0f172a' },

  // Quote rows
  quoteRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  quoteAccent: { width: 4 },
  quoteBody: { flex: 1, padding: 12 },
  quoteTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  quoteName: { fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  quoteDate: { fontSize: 10, color: '#94a3b8' },
  quoteTotal: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  qStatusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  qStatusText: { fontSize: 10, fontWeight: '800' },
  quoteBottom: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  qMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  qMetaText: { fontSize: 11, color: '#64748b' },

  // Item chips on customer card header
  itemGroupChip: { backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#e2e8f0' },
  itemGroupChipText: { fontSize: 9, fontWeight: '700', color: '#475569' },

  // Items list within expanded quote
  itemsList: { marginBottom: 8, borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  itemRowLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap', marginRight: 8 },
  itemGroupBadge: { backgroundColor: '#eff6ff', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  itemGroupBadgeText: { fontSize: 9, fontWeight: '700', color: '#3b82f6' },
  itemName: { fontSize: 11, fontWeight: '600', color: '#334155', flexShrink: 1 },
  itemQty: { fontSize: 10, color: '#94a3b8', fontWeight: '600', minWidth: 50, textAlign: 'right' },
});
