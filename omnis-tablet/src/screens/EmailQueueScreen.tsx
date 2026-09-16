import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../api/supabaseClient';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type StatusFilter = 'All' | 'pending' | 'sent' | 'failed';
const STATUS_FILTERS: StatusFilter[] = ['All', 'pending', 'sent', 'failed'];

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: string; iconColor: string; label: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e', icon: 'time-outline',           iconColor: '#d97706', label: 'Pending' },
  sent:    { bg: '#dcfce7', text: '#166534', icon: 'checkmark-circle-outline', iconColor: '#16a34a', label: 'Sent' },
  failed:  { bg: '#fef2f2', text: '#991b1b', icon: 'alert-circle-outline',    iconColor: '#dc2626', label: 'Failed' },
};

export default function EmailQueueScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [emails, setEmails]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchEmails = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || '';

      // Get user display name for matching created_by (some records use name, not email)
      const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.display_name;
      const formattedEmailName = userEmail.split('@')[0].split(/[._-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      const displayName = metaName?.trim() || formattedEmailName || '';

      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
      const anonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || anonKey;

      // Fetch email queue records matching the user
      const filterParts = [`created_by.eq.${encodeURIComponent(userEmail)}`];
      if (displayName && displayName !== userEmail) {
        filterParts.push(`created_by.eq.${encodeURIComponent(displayName)}`);
      }

      const res = await fetch(
        `${supabaseUrl}/rest/v1/omnis_email_queue?or=(${filterParts.join(',')})&order=created_at.desc&limit=100`,
        {
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!res.ok) {
        console.warn('[EmailQueue] fetch returned', res.status);
        setEmails([]);
        return;
      }

      const data = await res.json();
      setEmails(data || []);
    } catch (e) {
      console.error('[EmailQueue] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEmails();
  }, [fetchEmails]);

  // ── Stats ───────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:   emails.length,
    pending: emails.filter(e => e.status === 'pending').length,
    sent:    emails.filter(e => e.status === 'sent').length,
    failed:  emails.filter(e => e.status === 'failed').length,
  }), [emails]);

  // ── Filtered ────────────────────────────────────────────────────────────────

  const filteredEmails = useMemo(() => {
    if (statusFilter === 'All') return emails;
    return emails.filter(e => e.status === statusFilter);
  }, [emails, statusFilter]);

  // ── Retry ───────────────────────────────────────────────────────────────────

  const handleRetry = useCallback(async (item: any) => {
    Alert.alert(
      'Retry Email',
      `Retry sending "${item.subject}" to ${item.to_email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retry',
          onPress: async () => {
            setRetryingId(item.id);
            try {
              const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
              const anonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
              const { data: { session } } = await supabase.auth.getSession();
              const authToken = session?.access_token || anonKey;

              // Reset status to pending and clear error
              const patchRes = await fetch(`${supabaseUrl}/rest/v1/omnis_email_queue?id=eq.${item.id}`, {
                method: 'PATCH',
                headers: {
                  'apikey': anonKey,
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal',
                },
                body: JSON.stringify({
                  status: 'pending',
                  error_message: null,
                  sent_at: null,
                }),
              });

              if (!patchRes.ok) throw new Error('Failed to reset email status');

              // Trigger edge function
              try {
                await fetch(`${supabaseUrl}/functions/v1/process-email-queue`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({}),
                });
              } catch (e) {
                console.log('Edge trigger silent catch:', e);
              }

              Alert.alert('Retrying', 'Email has been re-queued for sending.');
              fetchEmails();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to retry email.');
            } finally {
              setRetryingId(null);
            }
          },
        },
      ]
    );
  }, [fetchEmails]);

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = useCallback((item: any) => {
    Alert.alert(
      'Delete Email',
      `Remove "${item.subject}" from the queue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
              const anonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
              const { data: { session } } = await supabase.auth.getSession();
              const authToken = session?.access_token || anonKey;

              const res = await fetch(`${supabaseUrl}/rest/v1/omnis_email_queue?id=eq.${item.id}`, {
                method: 'DELETE',
                headers: {
                  'apikey': anonKey,
                  'Authorization': `Bearer ${authToken}`,
                },
              });

              if (!res.ok) throw new Error('Failed to delete email');
              Alert.alert('Deleted', 'Email removed from queue.');
              fetchEmails();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete email.');
            }
          },
        },
      ]
    );
  }, [fetchEmails]);

  // ── Render item ─────────────────────────────────────────────────────────────

  const renderItem = useCallback(({ item }: { item: any }) => {
    const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const isRetrying = retryingId === item.id;
    const createdAt = item.created_at
      ? new Date(item.created_at).toLocaleString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : '—';
    const sentAt = item.sent_at
      ? new Date(item.sent_at).toLocaleString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : null;

    return (
      <View style={styles.card}>
        {/* Status accent bar */}
        <View style={[styles.cardAccent, { backgroundColor: sc.iconColor }]} />

        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardSubject} numberOfLines={2}>{item.subject || '(No Subject)'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Ionicons name={sc.icon as any} size={11} color={sc.iconColor} />
            <Text style={[styles.statusBadgeText, { color: sc.text }]}>{sc.label}</Text>
          </View>
        </View>

        {/* Recipients */}
        <View style={styles.recipientRow}>
          <Ionicons name="mail-outline" size={11} color="#64748b" />
          <Text style={styles.recipientText} numberOfLines={1}>To: {item.to_email || '—'}</Text>
        </View>
        {item.cc_email ? (
          <View style={styles.recipientRow}>
            <Ionicons name="people-outline" size={11} color="#64748b" />
            <Text style={styles.recipientText} numberOfLines={1}>CC: {item.cc_email}</Text>
          </View>
        ) : null}

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="time-outline" size={10} color="#64748b" />
            <Text style={styles.metaText}>{createdAt}</Text>
          </View>
          {sentAt && (
            <View style={styles.metaChip}>
              <Ionicons name="checkmark-done-outline" size={10} color="#16a34a" />
              <Text style={[styles.metaText, { color: '#16a34a' }]}>Sent {sentAt}</Text>
            </View>
          )}
          {item.related_type && (
            <View style={[styles.metaChip, { backgroundColor: '#e0e7ff' }]}>
              <Text style={[styles.metaText, { color: '#4338ca', fontWeight: '700' }]}>
                {item.related_type.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Error message */}
        {item.error_message ? (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={12} color="#dc2626" />
            <Text style={styles.errorText} numberOfLines={2}>{item.error_message}</Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actionsRow}>
          {(item.status === 'failed' || item.status === 'pending') && (
            <TouchableOpacity
              style={[styles.retryBtn, isRetrying && { opacity: 0.6 }]}
              onPress={() => handleRetry(item)}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <ActivityIndicator size={12} color="#2563eb" />
              ) : (
                <Ionicons name="refresh-outline" size={14} color="#2563eb" />
              )}
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={14} color="#ef4444" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [retryingId, handleRetry, handleDelete]);

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <LinearGradient
        colors={['#4c110d', '#8b2219', '#6b1a14']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.headerTitle}>Email Queue</Text>
            <Text style={styles.headerSubtitle}>Outgoing email dispatch history</Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.iconBtn}>
            <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsStrip}>
          {[
            { label: 'Total',   value: stats.total },
            { label: 'Pending', value: stats.pending, highlight: stats.pending > 0 },
            { label: 'Sent',    value: stats.sent },
            { label: 'Failed',  value: stats.failed,  highlight: stats.failed > 0 },
          ].map((s, i) => (
            <View key={i} style={[styles.statChip, (s as any).highlight && styles.statChipHighlight]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {STATUS_FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>
                {f === 'All' ? 'All' : STATUS_CONFIG[f]?.label || f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#8b2219" />
        </View>
      ) : (
        <FlatList
          data={filteredEmails}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b2219" />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="mail-open-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No emails found</Text>
              <Text style={styles.emptySubText}>
                {statusFilter !== 'All' ? `No ${statusFilter} emails. Try a different filter.` : 'Your email queue is empty.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },

  // ── Header ──
  header: { paddingBottom: 10 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  iconBtn: { padding: 8 },

  statsStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 10,
  },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  statChipHighlight: {
    backgroundColor: 'rgba(245,158,11,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.5)',
  },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.65)', marginTop: 1 },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  filterChipActive: { backgroundColor: 'rgba(255,255,255,0.9)' },
  filterChipText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  filterChipTextActive: { color: '#8b2219' },

  // ── List ──
  listContent: { padding: 16 },
  emptyBox: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#475569', marginTop: 8 },
  emptySubText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', maxWidth: 280 },

  // ── Card ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 8,
    gap: 8,
  },
  cardSubject: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
  },
  statusBadgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },

  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    marginBottom: 2,
    gap: 5,
  },
  recipientText: { fontSize: 11, color: '#64748b', flex: 1 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingLeft: 8,
    marginTop: 6,
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  metaText: { fontSize: 10, color: '#64748b', fontWeight: '600' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    padding: 8,
    marginLeft: 8,
    marginTop: 6,
    gap: 5,
  },
  errorText: { fontSize: 11, color: '#991b1b', flex: 1, lineHeight: 15 },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  retryBtnText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  deleteBtnText: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
});
