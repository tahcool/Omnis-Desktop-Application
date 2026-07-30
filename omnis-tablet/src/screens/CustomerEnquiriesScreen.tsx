import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, StatusBar, TextInput, Modal, ScrollView,
  KeyboardAvoidingView, Platform, Alert, Linking, Switch,
} from 'react-native';
import { supabase } from '../api/supabaseClient';
import { fetchCustomers, insertCustomerEnquirySafe } from '../api/customerApi';
import { logAuditTrail } from '../api/auditApi';
import { sendWhatsAppMessage } from '../api/whapiClient';
import AutocompleteDropdown from '../components/AutocompleteDropdown';
import ItemAutocompleteDropdown from '../components/ItemAutocompleteDropdown';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// ─── Constants ──────────────────────────────────────────────────────────────

const COMPANIES = ['Sinopower', 'Machinery Exchange'];

const STATUS_OPTIONS = ['Open', 'In Progress', 'Viewed', 'Quoted', 'Closed'];

const STATUS_COLORS: Record<string, string> = {
  'Open':        '#f59e0b',
  'In Progress': '#3b82f6',
  'Viewed':      '#10b981',
  'Quoted':      '#8b5cf6',
  'Closed':      '#64748b',
};

const COMPANY_COLORS: Record<string, { bg: string; text: string }> = {
  'Sinopower':          { bg: '#7f1d1d', text: '#fca5a5' },
  'Machinery Exchange': { bg: '#1e3a5f', text: '#93c5fd' },
};

const SORT_OPTIONS = ['Newest', 'Oldest', 'Urgency'] as const;
type SortOption = typeof SORT_OPTIONS[number];

// ─── Age helpers ────────────────────────────────────────────────────────────

function getDaysOpen(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}

function getAgeStyle(days: number, status: string) {
  if (['Closed', 'Quoted'].includes(status)) return { color: '#94a3b8', icon: null };
  if (days < 3)  return { color: '#10b981', icon: null };
  if (days < 7)  return { color: '#f59e0b', icon: '⚠️' };
  return { color: '#ef4444', icon: '🔴' };
}

// ─── Blank item factory ─────────────────────────────────────────────────────

function blankItem() {
  return { name: '', qty: '1', isNew: false, company: COMPANIES[0] };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CustomerEnquiriesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  // Data
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [myProfile, setMyProfile] = useState<any>(null);

  // Filters
  const [companyFilter, setCompanyFilter] = useState<string>('All');
  const [statusFilter,  setStatusFilter]  = useState<string>('All');
  const [sortBy,        setSortBy]        = useState<SortOption>('Newest');

  // New Enquiry modal
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [form, setForm] = useState({
    customer_name:    '',
    request_details:  '',
    estimated_value:  '',
    items: [blankItem()],
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: enquiryData }, { data: profileData }] = await Promise.all([
        supabase.from('customer_enquiries').select('*').order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('full_name, company').eq('id', (await supabase.auth.getUser()).data.user?.id ?? '').single(),
      ]);
      setEnquiries(enquiryData || []);
      setMyProfile(profileData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── Computed stats ────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const open = enquiries.filter(e => e.status === 'Open');
    const totalValue = open.reduce((s, e) => s + (e.estimated_value || 0), 0);
    const avgAge = open.length
      ? Math.round(open.reduce((s, e) => s + getDaysOpen(e.created_at), 0) / open.length)
      : 0;
    return { total: enquiries.length, openCount: open.length, avgAge, totalValue };
  }, [enquiries]);

  // ── Filtered & sorted list ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...enquiries];

    // Company filter — check items[].company
    if (companyFilter !== 'All') {
      list = list.filter(e =>
        Array.isArray(e.items) && e.items.some((it: any) => it.company === companyFilter)
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      list = list.filter(e => e.status === statusFilter);
    }

    // Sort
    if (sortBy === 'Newest') list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sortBy === 'Oldest') list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (sortBy === 'Urgency') list.sort((a, b) => {
      const aOpen = !['Closed','Quoted'].includes(a.status);
      const bOpen = !['Closed','Quoted'].includes(b.status);
      if (aOpen && !bOpen) return -1;
      if (!aOpen && bOpen) return 1;
      return getDaysOpen(b.created_at) - getDaysOpen(a.created_at);
    });

    return list;
  }, [enquiries, companyFilter, statusFilter, sortBy]);

  // ── Quick actions ─────────────────────────────────────────────────────────


  // ── Submit new enquiry ────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.customer_name.trim() || !form.request_details.trim()) {
      Alert.alert('Required', 'Please fill in customer name and request details.');
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.display_name;
      const formattedEmailName = (user?.email || '').split('@')[0].split(/[._-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      const salesRepDisplayName = metaName?.trim() || formattedEmailName || 'Representative';

      const itemCompanies = form.items.map(it => it.company).filter(Boolean);
      const targetCompany = itemCompanies.includes('Sinopower') ? 'Sinopower' : 'Machinery Exchange';
      
      const primaryToEmail = targetCompany === 'Sinopower' ? 'trucks@sinopower.co.zw' : 'equipment@machinery-exchange.com';
      const companyCcList = targetCompany === 'Sinopower'
        ? ['antony@industrial-exchange.group', 'brendan@industrial-exchange.group', 'jamie@sinopower.co.zw', 'rutendo@industrial-exchange.group', 'mathew@industrial-exchange.group', 'louis@industrial-exchange.group']
        : ['equipment@machinery-exchange.com', 'sales.humphrey@machinery-exchange.com', 'louis@industrial-exchange.group', 'mathew@industrial-exchange.group', 'rutendo@industrial-exchange.group', 'brendan@industrial-exchange.group', 'chetan.samji@machinery-exchange.com', 'antony@industrial-exchange.group'];

      const uniqueCcEmails = Array.from(new Set(companyCcList.map(e => e.trim().toLowerCase()).filter(Boolean)))
        .filter(e => e !== primaryToEmail.trim().toLowerCase());

      const validItems = form.items
        .filter(it => it.name.trim())
        .map(it => ({
          name:            it.name.trim(),
          qty:             parseInt(it.qty) || 1,
          isNew:           it.isNew,
          company:         it.company,
          suggestedPrice:  it.suggestedPrice || null,
          lastQuotedPrice: it.lastQuotedPrice || null,
          lastQuotedRef:   it.lastQuotedRef || null,
        }));

      const nowIso = new Date().toISOString();

      const { error } = await insertCustomerEnquirySafe({
        submitted_by:    user?.id,
        customer_name:   form.customer_name.trim(),
        request_details: form.request_details.trim(),
        estimated_value: parseFloat(form.estimated_value) || 0,
        items:           validItems,
        target_company:  targetCompany,
        company:         targetCompany,
        sales_rep_name:  salesRepDisplayName,
        status:          'Open',
        created_at:      nowIso,
      });

      if (error) throw new Error(error.message);

      // Queue HTML Email
      const itemsRows = validItems.map(it => `
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${it.name}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155; font-weight: 600;">${it.qty}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #475569;">${it.company}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; text-align: center;">${it.isNew ? '<span style="background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">NEW</span>' : 'Standard'}</td>
        </tr>
      `).join('');

      const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.04);">
          <div style="background: linear-gradient(135deg, #4c110d 0%, #8b2219 50%, #6b1a14 100%); padding: 26px 20px; text-align: center;">
            <div style="margin-bottom: 8px;">
              <img src="https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/omnis-logo-white.png" alt="OMNIS" style="max-height: 48px; width: auto;" />
            </div>
            <h2 style="color: #ffffff; font-size: 16px; margin: 4px 0 0 0; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
              NEW CUSTOMER ENQUIRY — ${targetCompany}
            </h2>
            <p style="color: rgba(255,255,255,0.85); font-size: 12px; margin: 4px 0 0 0;">
              ${form.customer_name.trim()} • ${new Date().toISOString().split('T')[0]}
            </p>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 14px; color: #334155; margin-top: 0;">
              A new customer enquiry has been logged by representative <strong>${salesRepDisplayName}</strong>.
            </p>
            <div style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tbody>
                  <tr>
                    <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; width: 35%; background: #f8fafc; color: #475569;">Customer Name</td>
                    <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">${form.customer_name.trim()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; background: #f8fafc; color: #475569;">Target Division</td>
                    <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">${targetCompany}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; background: #f8fafc; color: #475569;">Request Details</td>
                    <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; line-height: 1.5;">${form.request_details.trim()}</td>
                  </tr>
                  ${form.estimated_value ? `
                  <tr>
                    <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; background: #f8fafc; color: #475569;">Estimated Value</td>
                    <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #059669; font-weight: 700;">$${form.estimated_value}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 10px 16px; font-weight: 700; background: #f8fafc; color: #475569;">Logged Representative</td>
                    <td style="padding: 10px 16px; color: #0f172a;">${salesRepDisplayName}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            ${validItems.length > 0 ? `
            <h3 style="color: #8b2219; font-size: 14px; margin: 20px 0 10px 0; font-weight: 800;">
              Requested Items / Equipment (${validItems.length}):
            </h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background: #8b2219; color: #ffffff; text-align: left;">
                  <th style="padding: 8px 14px;">Item Description</th>
                  <th style="padding: 8px 14px; text-align: center;">Qty</th>
                  <th style="padding: 8px 14px;">Division</th>
                  <th style="padding: 8px 14px; text-align: center;">Condition</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
            ` : ''}
          </div>
          <div style="background: #f8fafc; padding: 12px 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
            Omnis Order &amp; Enquiry Management System
          </div>
        </div>
      </body>
      </html>
      `;

      await supabase.from('omnis_email_queue').insert({
        system: 'fleetrack',
        to_email: primaryToEmail,
        cc_email: uniqueCcEmails.join(', ') || null,
        subject: `[NEW ENQUIRY] ${form.customer_name.trim()} - ${targetCompany}`,
        body_html: htmlBody,
        related_doc: form.customer_name.trim(),
        related_type: 'enquiry',
        created_by: salesRepDisplayName,
      });

      // Trigger Edge function
      fetch('https://pfqaeewmlwfayxbgmuaq.supabase.co/functions/v1/process-email-queue', {
        method: 'POST',
        headers: { 'Authorization': `Bearer sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).catch(e => console.log('Edge trigger silent catch:', e));

      setModalVisible(false);
      setForm({ customer_name: '', request_details: '', estimated_value: '', items: [blankItem()] });
      Alert.alert('Success', 'New enquiry submitted and notification emailed successfully!');
      fetchAll();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Submission error');
    } finally {
      setSubmitting(false);
    }
  };

  // Quote response time modal state
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [selectedEnquiryForQuote, setSelectedEnquiryForQuote] = useState<any | null>(null);
  const [quoteNumberInput, setQuoteNumberInput] = useState('');

  const calculateTimeToQuote = (createdAt: string, quotedAt?: string) => {
    if (!createdAt) return '—';
    const start = new Date(createdAt).getTime();
    const end = quotedAt ? new Date(quotedAt).getTime() : Date.now();
    const diffMs = Math.max(0, end - start);
    const totalMins = Math.floor(diffMs / 60_000);
    
    if (totalMins < 60) {
      return `${totalMins} min${totalMins !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours < 24) {
      return mins > 0 ? `${hours} hr${hours !== 1 ? 's' : ''} ${mins}m` : `${hours} hr${hours !== 1 ? 's' : ''}`;
    }
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return remHours > 0 ? `${days}d ${remHours}h` : `${days} day${days !== 1 ? 's' : ''}`;
  };

  const handleMarkQuoted = (item: any) => {
    setSelectedEnquiryForQuote(item);
    setQuoteNumberInput(item.quote_number || '');
    setQuoteModalVisible(true);
  };

  const confirmQuoteIssued = async () => {
    if (!selectedEnquiryForQuote) return;
    const nowIso = new Date().toISOString();
    const timeDisplay = calculateTimeToQuote(selectedEnquiryForQuote.created_at, nowIso);
    const startMs = new Date(selectedEnquiryForQuote.created_at).getTime();
    const secDiff = Math.floor((new Date(nowIso).getTime() - startMs) / 1000);

    const { error } = await supabase
      .from('customer_enquiries')
      .update({
        status: 'Quoted',
        quote_number: quoteNumberInput.trim() || null,
        quoted_at: nowIso,
        time_to_quote_display: timeDisplay,
        time_to_quote_seconds: secDiff,
        updated_at: nowIso,
      })
      .eq('id', selectedEnquiryForQuote.id);

    setQuoteModalVisible(false);
    if (!error) {
      Alert.alert('Quote Issued Recorded!', `Enquiry response time to quote: ${timeDisplay}`);
      fetchAll();
    } else {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteEnquiry = (item: any) => {
    Alert.alert(
      'Delete Enquiry',
      `Are you sure you want to delete the enquiry for "${item.customer_name}"? This action will be recorded in the audit trail.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.display_name;
              const formattedEmailName = (user?.email || '').split('@')[0].split(/[._-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
              const salesRepDisplayName = metaName?.trim() || formattedEmailName || 'Representative';

              // Audit Trail
              await logAuditTrail({
                entityType: 'enquiry',
                entityId: String(item.id),
                action: 'DELETE',
                performedBy: user?.id,
                performedByName: salesRepDisplayName,
                details: { customer_name: item.customer_name, request_details: item.request_details, items: item.items },
              });

              const { error } = await supabase
                .from('customer_enquiries')
                .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: salesRepDisplayName })
                .eq('id', item.id);

              if (error) {
                await supabase.from('customer_enquiries').delete().eq('id', item.id);
              }

              Alert.alert('Deleted', 'Enquiry deleted and recorded in audit trail.');
              fetchAll();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Deletion failed');
            }
          },
        },
      ]
    );
  };

  const handleFollowUp = async (item: any) => {
    const nowIso = new Date().toISOString();
    const { data: { user } } = await supabase.auth.getUser();
    const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.display_name;
    const formattedEmailName = (user?.email || '').split('@')[0].split(/[._-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    const salesRepDisplayName = metaName?.trim() || formattedEmailName || 'Representative';

    const daysOpen = getDaysOpen(item.created_at);
    const ageDisplay = calculateTimeToQuote(item.created_at, nowIso);

    await supabase.from('customer_enquiries').update({ updated_at: nowIso }).eq('id', item.id);

    await logAuditTrail({
      entityType: 'enquiry',
      entityId: String(item.id),
      action: 'FOLLOW_UP',
      performedBy: user?.id,
      performedByName: salesRepDisplayName,
      details: { customer: item.customer_name, daysOpen, ageDisplay },
    });

    const itemCompanies = (item.items || []).map((it: any) => it.company).filter(Boolean);
    const targetCompany = item.target_company || item.company || (itemCompanies.includes('Sinopower') ? 'Sinopower' : 'Machinery Exchange');
    const isSino = targetCompany.toLowerCase().includes('sino');

    const primaryToEmail = isSino ? 'trucks@sinopower.co.zw' : 'equipment@machinery-exchange.com';
    const companyCcList = isSino
      ? ['antony@industrial-exchange.group', 'brendan@industrial-exchange.group', 'jamie@sinopower.co.zw', 'rutendo@industrial-exchange.group', 'mathew@industrial-exchange.group', 'louis@industrial-exchange.group']
      : ['equipment@machinery-exchange.com', 'sales.humphrey@machinery-exchange.com', 'louis@industrial-exchange.group', 'mathew@industrial-exchange.group', 'rutendo@industrial-exchange.group', 'brendan@industrial-exchange.group', 'chetan.samji@machinery-exchange.com', 'antony@industrial-exchange.group'];

    const uniqueCcEmails = Array.from(new Set(companyCcList.map(e => e.trim().toLowerCase()).filter(Boolean)))
      .filter(e => e !== primaryToEmail.trim().toLowerCase());

    const itemsRows = (item.items || []).map((it: any) => `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${it.name}</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155; font-weight: 600;">${it.qty || 1}</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #475569;">${it.company || targetCompany}</td>
      </tr>
    `).join('');

    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px;">
      <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.04);">
        <div style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 24px 20px; text-align: center;">
          <div style="margin-bottom: 8px;">
            <img src="https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/omnis-logo-white.png" alt="OMNIS" style="max-height: 48px; width: auto;" />
          </div>
          <h2 style="color: #ffffff; font-size: 16px; margin: 4px 0 0 0; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
            ⚡ ENQUIRY FOLLOW-UP REMINDER — ${targetCompany}
          </h2>
          <p style="color: rgba(255,255,255,0.9); font-size: 12px; margin: 4px 0 0 0;">
            Request Age: <strong>${ageDisplay} (${daysOpen} day${daysOpen !== 1 ? 's' : ''} open)</strong>
          </p>
        </div>

        <div style="padding: 24px;">
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: 600;">
              Sales representative <strong>${salesRepDisplayName}</strong> logged a follow-up reminder on this open customer enquiry. This request has been open for <strong>${ageDisplay}</strong> and requires quote action.
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
            <tbody>
              <tr>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; width: 35%; background: #f8fafc; color: #475569;">Customer Name</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">${item.customer_name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; background: #f8fafc; color: #475569;">Enquiry Age</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #d97706; font-weight: 700;">${ageDisplay} (${daysOpen} days open)</td>
              </tr>
              <tr>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; background: #f8fafc; color: #475569;">Request Details</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; line-height: 1.5;">${item.request_details}</td>
              </tr>
            </tbody>
          </table>

          ${itemsRows ? `
          <h3 style="color: #b45309; font-size: 14px; margin: 16px 0 10px 0;">Requested Items:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #e2e8f0;">
            <thead>
              <tr style="background: #f8fafc; color: #475569; text-align: left;">
                <th style="padding: 8px 14px;">Item Description</th>
                <th style="padding: 8px 14px; text-align: center;">Qty</th>
                <th style="padding: 8px 14px;">Division</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>
          ` : ''}
        </div>
        <div style="background: #f8fafc; padding: 12px 20px; text-align: center; font-size: 11px; color: #94a3b8;">
          Omnis Follow-Up Automation System
        </div>
      </div>
    </body>
    </html>
    `;

    await supabase.from('omnis_email_queue').insert({
      system: 'fleetrack',
      to_email: primaryToEmail,
      cc_email: uniqueCcEmails.join(', ') || null,
      subject: `[ENQUIRY FOLLOW-UP] ${item.customer_name} - ${targetCompany}`,
      body_html: htmlBody,
      related_doc: item.customer_name,
      related_type: 'enquiry_followup',
      created_by: salesRepDisplayName,
    });

    fetch('https://pfqaeewmlwfayxbgmuaq.supabase.co/functions/v1/process-email-queue', {
      method: 'POST',
      headers: { 'Authorization': `Bearer sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(e => console.log('Edge trigger silent catch:', e));

    sendWhatsAppMessage({
      recipientPhone: primaryToEmail,
      message: `[ENQUIRY FOLLOW-UP] ${item.customer_name} (${targetCompany}). Open for ${ageDisplay}. Logged by ${salesRepDisplayName}.`,
    });

    Alert.alert('Follow-Up Email Dispatched!', `Follow-up notification sent to ${primaryToEmail}. Request age: ${ageDisplay}.`);
    fetchAll();
  };

  const handleToggleHotLead = async (item: any) => {
    const newHotState = !item.is_hot_lead;
    const { error } = await supabase
      .from('customer_enquiries')
      .update({ is_hot_lead: newHotState, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    logAuditTrail({
      entityType: 'enquiry',
      entityId: String(item.id),
      action: 'MARK_HOT',
      details: { is_hot_lead: newHotState, customer: item.customer_name },
    });

    if (!error) {
      Alert.alert(newHotState ? '🔥 Hot Lead!' : 'Priority Updated', `Enquiry marked as ${newHotState ? '🔥 HOT LEAD' : 'Standard Priority'}.`);
      fetchAll();
    }
  };

  // ── Render card ───────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: any }) => {
    const statusColor = STATUS_COLORS[item.status] || '#64748b';
    const days = getDaysOpen(item.created_at);
    const ageStyle = getAgeStyle(days, item.status);
    const date = new Date(item.created_at);
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const items: any[] = item.items || [];
    const showAge = !['Closed', 'Quoted'].includes(item.status);
    const responseTimeStr = item.time_to_quote_display || calculateTimeToQuote(item.created_at, item.quoted_at);

    return (
      <View style={styles.card}>
        {/* Card top accent by urgency */}
        <View style={[styles.cardAccent, { backgroundColor: item.is_hot_lead ? '#ef4444' : ageStyle.color }]} />

        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.customerName}>{item.customer_name}</Text>
              <TouchableOpacity onPress={() => handleToggleHotLead(item)}>
                <Text style={{ fontSize: 16 }}>{item.is_hot_lead ? '🔥' : '🔥'}</Text>
              </TouchableOpacity>
              {item.is_hot_lead && (
                <View style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#dc2626' }}>HOT LEAD</Text>
                </View>
              )}
            </View>
            <Text style={styles.dateText}>{dateStr} · {timeStr} {item.sales_rep_name ? `· Rep: ${item.sales_rep_name}` : ''}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status || 'Open'}</Text>
          </View>
        </View>

        {/* Response Time Badge or Download Quote PDF */}
        {item.status === 'Quoted' || item.pdf_url ? (
          <View style={styles.quoteResponseBadge}>
            <Ionicons name="flash" size={13} color="#7c3aed" />
            <Text style={styles.quoteResponseText}>
              Quoted from ERP {item.quote_number || item.quote_name ? `(#${item.quote_number || item.quote_name})` : ''} · Response Time: {responseTimeStr}
            </Text>
          </View>
        ) : (
          <View style={styles.pendingQuoteBadge}>
            <Ionicons name="timer-outline" size={13} color="#d97706" />
            <Text style={styles.pendingQuoteText}>
              Pending Quote (Open {responseTimeStr})
            </Text>
          </View>
        )}

        {/* Age indicator */}
        {showAge && (
          <View style={styles.ageBadge}>
            <Ionicons name="time-outline" size={12} color={ageStyle.color} />
            <Text style={[styles.ageText, { color: ageStyle.color }]}>
              Open {days} day{days !== 1 ? 's' : ''} {ageStyle.icon || ''}
            </Text>
          </View>
        )}

        {/* Request details */}
        <Text style={styles.requestText} numberOfLines={2}>{item.request_details}</Text>

        {/* Items with company tags */}
        {items.length > 0 && (
          <View style={styles.itemsList}>
            <Text style={styles.itemsLabel}>Items Requested</Text>
            {items.map((it: any, idx: number) => {
              const cc = COMPANY_COLORS[it.company] || { bg: '#1e293b', text: '#94a3b8' };
              const sug = it.suggestedPrice ? `$${Number(it.suggestedPrice).toLocaleString()}` : null;
              const last = it.lastQuotedPrice ? `$${Number(it.lastQuotedPrice).toLocaleString()}` : null;

              return (
                <View key={idx} style={{ marginBottom: 6 }}>
                  <View style={styles.itemRow}>
                    <View style={[styles.companyTag, { backgroundColor: cc.bg }]}>
                      <Text style={[styles.companyTagText, { color: cc.text }]}>
                        {it.company === 'Machinery Exchange' ? 'M/Exchange' : it.company}
                      </Text>
                    </View>
                    <Text style={styles.itemText}>
                      {it.name}{it.qty > 1 ? ` x${it.qty}` : ''}{it.isNew ? ' (New)' : ''}
                    </Text>
                  </View>
                  {(sug || last) && (
                    <View style={{ flexDirection: 'row', gap: 8, marginLeft: 6, marginTop: 2 }}>
                      {sug && <Text style={{ fontSize: 10, color: '#15803d', fontWeight: '700' }}>Suggested: {sug}</Text>}
                      {last && <Text style={{ fontSize: 10, color: '#7c3aed', fontWeight: '700' }}>Last Quoted: {last}</Text>}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Footer */}
        <View style={styles.cardFooter}>
          {item.estimated_value > 0 ? (
            <View style={styles.valueRow}>
              <Ionicons name="cash-outline" size={13} color="#10b981" />
              <Text style={styles.valueText}>Est. ${Number(item.estimated_value).toLocaleString()}</Text>
            </View>
          ) : <View />}
          <View style={styles.actionButtons}>
            {(item.pdf_url || item.quote_number) && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#f0f9ff', borderColor: '#0284c7', borderWidth: 1 }]}
                onPress={() => item.pdf_url ? Linking.openURL(item.pdf_url) : Alert.alert('Quote Issued', `Quote #${item.quote_number || item.quote_name} issued in ERP.`)}
              >
                <Ionicons name="download-outline" size={14} color="#0284c7" />
                <Text style={[styles.actionBtnText, { color: '#0284c7', fontWeight: '700' }]}>
                  {item.pdf_url ? 'Download Quote PDF' : `Quote #${item.quote_number}`}
                </Text>
              </TouchableOpacity>
            )}
            {!['Closed', 'Quoted'].includes(item.status) && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleFollowUp(item)}>
                <Ionicons name="mail-outline" size={14} color="#3b82f6" />
                <Text style={[styles.actionBtnText, { color: '#3b82f6' }]}>Follow Up</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fef2f2' }]} onPress={() => handleDeleteEnquiry(item)}>
              <Ionicons name="trash-outline" size={14} color="#ef4444" />
              <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { paddingTop: 0 }]}>
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
          <Text style={styles.headerTitle}>Customer Enquiries</Text>
          <TouchableOpacity onPress={fetchAll} style={styles.iconBtn}>
            <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.newEnquiryBtn}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.newEnquiryBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Row 2: stats strip */}
        <View style={styles.statsStrip}>
          {[
            { label: 'Total',     value: stats.total },
            { label: 'Open',      value: stats.openCount },
            { label: 'Avg Age',   value: `${stats.avgAge}d` },
            { label: 'Est. Open', value: `$${(stats.totalValue / 1000).toFixed(0)}k` },
          ].map((s, i) => (
            <View key={i} style={styles.statChip}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Row 3: company filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 6, paddingRight: 16 }}>
          {['All', ...COMPANIES].map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.filterChip, companyFilter === c && styles.filterChipActive]}
              onPress={() => setCompanyFilter(c)}
            >
              <Text style={[styles.filterChipText, companyFilter === c && styles.filterChipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.filterDivider} />
          {STATUS_OPTIONS.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
              onPress={() => setStatusFilter(prev => prev === s ? 'All' : s)}
            >
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[s] }]} />
              <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* ── Sort bar ── */}
      <View style={styles.sortBar}>
        <Text style={styles.sortBarCount}>{filtered.length} enquir{filtered.length !== 1 ? 'ies' : 'y'}</Text>
        <View style={styles.sortBtns}>
          {SORT_OPTIONS.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.sortBtn, sortBy === s && styles.sortBtnActive]}
              onPress={() => setSortBy(s)}
            >
              <Text style={[styles.sortBtnText, sortBy === s && styles.sortBtnTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── List ── */}
      {loading ? (
        <ActivityIndicator size="large" color="#8b2219" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="clipboard-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No enquiries match the current filter</Text>
            </View>
          }
          onRefresh={fetchAll}
          refreshing={loading}
        />
      )}

      {/* ── New Enquiry Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 12 }]}>
            <LinearGradient colors={['#4c110d', '#8b2219']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Customer Enquiry</Text>
              <View style={styles.headerBtnGroup}>
                <TouchableOpacity style={styles.headerCancelBtn} onPress={() => setModalVisible(false)} disabled={submitting}>
                  <Text style={styles.headerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerSubmitBtn} onPress={handleSubmit} disabled={submitting}>
                  {submitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.headerSubmitText}>Submit</Text>}
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
              <AutocompleteDropdown
                label="Customer Name *"
                placeholder="Search existing customer or type new name..."
                value={form.customer_name}
                onChangeText={v => setForm(f => ({ ...f, customer_name: v }))}
                fetchResults={fetchCustomers}
                style={{ zIndex: 2000 }}
              />

              <Text style={styles.fieldLabel}>Request Details *</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Describe what the customer is looking for..."
                placeholderTextColor="#94a3b8"
                multiline
                value={form.request_details}
                onChangeText={v => setForm(f => ({ ...f, request_details: v }))}
              />

              <Text style={styles.fieldLabel}>Items Requested</Text>
              {form.items.map((item, idx) => (
                <View key={idx} style={[styles.itemFormRow, { zIndex: 1000 - idx }]}>
                  <View style={styles.itemFormMain}>
                    <ItemAutocompleteDropdown
                      value={item.name}
                      placeholder="Search products or quote catalog..."
                      onChangeText={v => setForm(f => {
                        const items = [...f.items];
                        items[idx] = { ...items[idx], name: v };
                        return { ...f, items };
                      })}
                      onSelectItem={selected => setForm(f => {
                        const items = [...f.items];
                        items[idx] = {
                          ...items[idx],
                          name: selected.name,
                          company: selected.company || items[idx].company,
                          suggestedPrice: selected.suggestedPrice,
                          lastQuotedPrice: selected.lastQuotedPrice,
                          lastQuotedRef: selected.lastQuotedRef,
                        };
                        return { ...f, items };
                      })}
                    />
                    <TextInput
                      style={[styles.input, { width: 52, marginBottom: 0, textAlign: 'center', height: 42 }]}
                      placeholder="Qty"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={item.qty}
                      onChangeText={v => setForm(f => {
                        const items = [...f.items];
                        items[idx] = { ...items[idx], qty: v };
                        return { ...f, items };
                      })}
                    />
                  </View>

                  {(item.suggestedPrice || item.lastQuotedPrice) && (
                    <View style={styles.pricingBadgeStrip}>
                      {item.suggestedPrice ? (
                        <View style={styles.priceBadgeSug}>
                          <Ionicons name="pricetag-outline" size={11} color="#15803d" />
                          <Text style={styles.priceBadgeSugText}>Suggested: ${Number(item.suggestedPrice).toLocaleString()}</Text>
                        </View>
                      ) : null}
                      {item.lastQuotedPrice ? (
                        <View style={styles.priceBadgeLast}>
                          <Ionicons name="time-outline" size={11} color="#7c3aed" />
                          <Text style={styles.priceBadgeLastText}>
                            Last Quoted: ${Number(item.lastQuotedPrice).toLocaleString()} {item.lastQuotedRef ? `(${item.lastQuotedRef})` : ''}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {/* Company picker */}
                  <View style={styles.companyPickerRow}>
                    {COMPANIES.map(c => {
                      const cc = COMPANY_COLORS[c];
                      const selected = item.company === c;
                      return (
                        <TouchableOpacity
                          key={c}
                          style={[styles.companyPickerBtn, selected && { backgroundColor: cc.bg, borderColor: cc.text }]}
                          onPress={() => setForm(f => {
                            const items = [...f.items];
                            items[idx] = { ...items[idx], company: c };
                            return { ...f, items };
                          })}
                        >
                          <Text style={[styles.companyPickerText, selected && { color: cc.text }]}>
                            {c === 'Machinery Exchange' ? 'M/Exchange' : c}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity
                      style={[styles.companyPickerBtn, item.isNew && { backgroundColor: '#14532d', borderColor: '#4ade80' }]}
                      onPress={() => setForm(f => {
                        const items = [...f.items];
                        items[idx] = { ...items[idx], isNew: !items[idx].isNew };
                        return { ...f, items };
                      })}
                    >
                      <Text style={[styles.companyPickerText, item.isNew && { color: '#4ade80' }]}>New</Text>
                    </TouchableOpacity>
                    {form.items.length > 1 && (
                      <TouchableOpacity onPress={() => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}>
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.addItemBtn} onPress={() => setForm(f => ({ ...f, items: [...f.items, blankItem()] }))}>
                <Ionicons name="add-circle-outline" size={18} color="#8b2219" />
                <Text style={styles.addItemBtnText}>Add Another Item</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Estimated Value (USD)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 45000"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={form.estimated_value}
                onChangeText={v => setForm(f => ({ ...f, estimated_value: v }))}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Issue Quote Modal ── */}
      <Modal visible={quoteModalVisible} animationType="fade" transparent onRequestClose={() => setQuoteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 10 }]}>
            <LinearGradient colors={['#5b21b6', '#7c3aed']} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Quote Issued</Text>
              <TouchableOpacity onPress={() => setQuoteModalVisible(false)}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.modalBody}>
              <Text style={{ fontSize: 14, color: '#334155', fontWeight: '600', marginBottom: 12 }}>
                Record quote issuance for <Text style={{ fontWeight: '800' }}>{selectedEnquiryForQuote?.customer_name}</Text>. This will record response time and update status to Quoted.
              </Text>

              <Text style={styles.fieldLabel}>Quote Reference Number (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Q-10482"
                placeholderTextColor="#94a3b8"
                value={quoteNumberInput}
                onChangeText={setQuoteNumberInput}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setQuoteModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#7c3aed' }]} onPress={confirmQuoteIssued}>
                <Text style={styles.submitBtnText}>Confirm Quote Issued</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },

  // Header
  header: { paddingBottom: 8 },
  headerRow1: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 10, gap: 10 },
  backBtn: { padding: 4 },
  iconBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  newEnquiryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  newEnquiryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Stats strip
  statsStrip: { flexDirection: 'row', paddingHorizontal: 14, gap: 8, marginBottom: 10 },
  statChip: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10,
    paddingVertical: 6, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: { fontSize: 16, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', marginTop: 1 },

  // Filter chips
  filterRow: { paddingHorizontal: 14, marginBottom: 10 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  filterChipActive: { backgroundColor: '#fff' },
  filterChipText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: '#8b2219' },
  filterDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },

  // Sort bar
  sortBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  sortBarCount: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  sortBtns: { flexDirection: 'row', gap: 4 },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#f1f5f9' },
  sortBtnActive: { backgroundColor: '#8b2219' },
  sortBtnText: { fontSize: 11, color: '#64748b', fontWeight: '700' },
  sortBtnTextActive: { color: '#fff' },

  // List
  list: { padding: 12, gap: 10 },
  emptyBox: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center' },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    overflow: 'hidden',
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
    marginBottom: 2,
  },
  cardAccent: { height: 3, width: '100%' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, paddingBottom: 4, gap: 10 },
  customerName: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  dateText: { fontSize: 11, color: '#94a3b8' },
  statusBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '700' },
  ageBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingBottom: 6 },
  ageText: { fontSize: 11, fontWeight: '700' },
  requestText: { fontSize: 13, color: '#475569', lineHeight: 19, paddingHorizontal: 12, paddingBottom: 8 },

  quoteResponseBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f3e8ff', borderColor: '#ddd6fe', borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5, marginHorizontal: 12, borderRadius: 6, marginBottom: 8,
  },
  quoteResponseText: { fontSize: 12, color: '#6b21a8', fontWeight: '600' },

  pendingQuoteBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5, marginHorizontal: 12, borderRadius: 6, marginBottom: 8,
  },
  pendingQuoteText: { fontSize: 12, color: '#92400e', fontWeight: '600' },

  // Items in card
  itemsList: { backgroundColor: '#f8fafc', marginHorizontal: 12, borderRadius: 8, padding: 10, marginBottom: 8 },
  itemsLabel: { fontSize: 9, fontWeight: '700', color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  companyTag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  companyTagText: { fontSize: 9, fontWeight: '800' },
  itemText: { fontSize: 12, color: '#334155', flex: 1 },

  pricingBadgeStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  priceBadgeSug: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priceBadgeSugText: { fontSize: 11, fontWeight: '700', color: '#15803d' },
  priceBadgeLast: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f3e8ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priceBadgeLastText: { fontSize: 11, fontWeight: '700', color: '#7c3aed' },

  // Card footer
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  valueText: { fontSize: 13, fontWeight: '700', color: '#10b981' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#eff6ff', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  actionBtnText: { fontSize: 11, fontWeight: '700' },
  quoteBtn: { backgroundColor: '#f3e8ff' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  headerBtnGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerCancelBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  headerCancelText: { color: 'white', fontSize: 13, fontWeight: '700' },
  headerSubmitBtn: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4,
  },
  headerSubmitText: { color: '#8b2219', fontSize: 13, fontWeight: '900' },
  modalBody: { padding: 16 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', marginBottom: 4,
  },

  // Item form row
  itemFormRow: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  itemFormMain: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  companyPickerRow: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  companyPickerBtn: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff',
  },
  companyPickerText: { fontSize: 11, fontWeight: '700', color: '#64748b' },

  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addItemBtnText: { fontSize: 13, fontWeight: '700', color: '#8b2219' },

  cancelBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 14, borderWidth: 1,
    borderColor: '#e2e8f0', alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#64748b' },
  submitBtn: {
    flex: 2, borderRadius: 12, paddingVertical: 14,
    backgroundColor: '#8b2219', alignItems: 'center',
  },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
