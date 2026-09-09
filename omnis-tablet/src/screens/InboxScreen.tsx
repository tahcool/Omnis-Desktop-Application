import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, FlatList, Modal, TextInput, Switch, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../api/supabaseClient';

export default function InboxScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  
  // Modal State
  const [notes, setNotes] = useState('');
  const [overrideDate, setOverrideDate] = useState('');
  const [isHot, setIsHot] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.email) return;

      const { data, error } = await supabase
        .from('omnis_quotations')
        .select('*')
        .eq('custom_sales_person', userData.user.email)
        .eq('status', 'Open');

      if (error) throw error;

      // Filter for due items
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      
      const dueQuotes = (data || []).filter(q => {
        const tDate = new Date(q.transaction_date);
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysElapsed = Math.floor((today.getTime() - tDate.getTime()) / msPerDay);
        
        // System due dates
        const isSystemDue = (daysElapsed === 3 || daysElapsed === 7 || daysElapsed >= 21);
        
        // Override due date
        let isOverrideDue = false;
        if (q.salesperson_follow_up_date) {
            isOverrideDue = q.salesperson_follow_up_date <= todayStr;
        }

        return isSystemDue || isOverrideDue;
      });

      setQuotes(dueQuotes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openQuote = (quote: any) => {
    setSelectedQuote(quote);
    setNotes(quote.notes || '');
    setOverrideDate(quote.salesperson_follow_up_date || '');
    setIsHot((quote.likelihood_percent || 0) >= 75);
    setNewStatus(quote.status || 'Open');
  };

  const saveFollowUp = async () => {
    if (!selectedQuote) return;
    setSaving(true);
    try {
      const updates = {
        notes: notes,
        salesperson_follow_up_date: overrideDate || null,
        likelihood_percent: isHot ? 100 : selectedQuote.likelihood_percent,
        status: newStatus
      };

      const { error } = await supabase
        .from('omnis_quotations')
        .update(updates)
        .eq('name', selectedQuote.name);

      if (error) throw error;
      
      Alert.alert("Success", "Follow-up saved!");
      setSelectedQuote(null);
      fetchFollowUps();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => openQuote(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.quoteName}>{item.name}</Text>
        {((item.likelihood_percent || 0) >= 75) && <View style={styles.hotBadge}><Text style={styles.hotText}>HOT</Text></View>}
      </View>
      <Text style={styles.customerName}>{item.customer_name || 'Unknown Customer'}</Text>
      <Text style={styles.quoteTitle}>{item.title}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>Created: {item.transaction_date}</Text>
        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#4c110d" />
      
      {/* Header */}
      <LinearGradient colors={['#4c110d', '#8b2219', '#6b1a14']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.navBar}>
        <View style={styles.headerTop}>
          <View style={styles.navLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuIcon}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Inbox & Follow-ups</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Main Content */}
      <View style={styles.container}>
        {loading ? (
          <View style={styles.emptyContainer}><ActivityIndicator size="large" color="#8b2219" /></View>
        ) : quotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>You have no quotes due for follow-up today.</Text>
          </View>
        ) : (
          <FlatList
            data={quotes}
            keyExtractor={q => q.name}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      {/* Action Modal */}
      <Modal visible={!!selectedQuote} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
            <ScrollView>
                <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Process Follow-up</Text>
                <TouchableOpacity onPress={() => setSelectedQuote(null)}>
                    <Ionicons name="close" size={28} color="#64748b" />
                </TouchableOpacity>
                </View>

                {selectedQuote && (
                <View style={styles.form}>
                    <Text style={styles.label}>NOTES</Text>
                    <TextInput
                    style={styles.textArea}
                    multiline
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Enter outcome of the follow-up..."
                    />

                    <Text style={styles.label}>SALESPERSON OVERRIDE DATE</Text>
                    <TextInput
                    style={styles.input}
                    value={overrideDate}
                    onChangeText={setOverrideDate}
                    placeholder="YYYY-MM-DD"
                    />

                    <View style={styles.switchRow}>
                    <Text style={styles.label}>MARK AS HOT LEAD</Text>
                    <Switch value={isHot} onValueChange={setIsHot} trackColor={{ true: '#ef4444', false: '#e2e8f0' }} />
                    </View>

                    <Text style={styles.label}>UPDATE STATUS</Text>
                    <View style={styles.statusGroup}>
                    {['Open', 'Sale', 'Lost Sale', 'Request Acquittal'].map(s => (
                        <TouchableOpacity
                        key={s}
                        style={[styles.statusBtn, newStatus === s && styles.statusBtnActive]}
                        onPress={() => setNewStatus(s)}
                        >
                        <Text style={[styles.statusBtnText, newStatus === s && styles.statusBtnTextActive]}>{s}</Text>
                        </TouchableOpacity>
                    ))}
                    </View>

                    <TouchableOpacity style={styles.saveBtn} onPress={saveFollowUp} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Follow-up</Text>}
                    </TouchableOpacity>
                </View>
                )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  navBar: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#3a0c09' },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navLeft: { flexDirection: 'row', alignItems: 'center' },
  navTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff' },
  menuIcon: { marginRight: 16, padding: 4 },
  container: { flex: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#334155', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  listContainer: { padding: 16, gap: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  quoteName: { fontSize: 13, fontWeight: '800', color: '#94a3b8' },
  hotBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#fca5a5' },
  hotText: { color: '#ef4444', fontSize: 10, fontWeight: '800' },
  customerName: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  quoteTitle: { fontSize: 14, color: '#475569', marginBottom: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  dateText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  form: { gap: 20 },
  label: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#f8fafc', color: '#0f172a' },
  textArea: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#f8fafc', color: '#0f172a', minHeight: 100, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  statusBtnActive: { borderColor: '#8b2219', backgroundColor: '#fef2f2' },
  statusBtnText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  statusBtnTextActive: { color: '#8b2219' },
  saveBtn: { backgroundColor: '#8b2219', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' }
});
