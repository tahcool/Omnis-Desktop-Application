/**
 * AfterSalesScreen — Omnis Tablet v2
 * Fixes: keyboard dismiss bug, company DB autocomplete, product autocomplete + OEM auto-fill,
 *        unlimited CC emails (tag-based, single cc: param), compact two-column layout.
 */
import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, StatusBar, TextInput, Modal, ScrollView,
  KeyboardAvoidingView, Platform, Alert, Linking, RefreshControl,
} from 'react-native';
import { supabase } from '../api/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Pending:   { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  Completed: { bg: '#d1fae5', text: '#047857', border: '#10b981' },
};
const BG_PALETTE = ['#0f172a','#1e3a5f','#7c3aed','#064e3b','#92400e','#1a2e1a','#1e1b4b','#450a0a'];
const WARRANTY_OPTIONS = ['Yes','No','Limited'];
const TRAINING_OPTIONS = ['Yes','No','Scheduled'];

function getAvatar(name: string) {
  const initials = (name || '?').replace(/[^A-Za-z\s]/g,' ').trim()
    .split(/\s+/).slice(0,2).map((w: string) => w[0] || '').join('').toUpperCase() || '?';
  return { initials, bg: BG_PALETTE[initials.charCodeAt(0) % BG_PALETTE.length] || '#334155' };
}

function blankForm() {
  return {
    company:'', contact_person:'', cell_number:'', email_address:'',
    physical_address:'', date_of_sale:'', equipment_model:'', chassis_number:'',
    engine_number:'', oem:'', location:'', warranty_start_date:'',
    warranty_applicable:'Yes', warranty_end_date:'', service_plan:'',
    training_done:'No', training_date:'', training_operator:'',
    handover_salesperson:'', handover_date:'', notes:'',
  };
}

const DEFAULT_DEPT_EMAILS: Record<string, string[]> = {
  Fleetrack: [
    'barry@industrial-exchange.group',
    'mxgfleetrack.brighton@machinery-exchange.com',
    'mxgfleetrack.bruce@machinery-exchange.com',
  ],
  Engineering: [
    'engineering.clive@machinery-exchange.com',
  ],
  Parts: [
    'parts.gilbert@machinery-exchange.com',
    'parts.arnold@machinery-exchange.com',
    'parts.david@machinery-exchange.com',
  ],
};

const DEFAULT_COMPANY_CC_EMAILS: Record<string, string[]> = {
  'Machinery Exchange': [
    'equipment@machinery-exchange.com',
    'sales.humphrey@machinery-exchange.com',
    'louis@industrial-exchange.group',
    'mathew@industrial-exchange.group',
    'rutendo@industrial-exchange.group',
    'brendan@industrial-exchange.group',
    'chetan.samji@machinery-exchange.com',
    'antony@industrial-exchange.group',
  ],
  'Sinopower': [
    'antony@industrial-exchange.group',
    'brendan@industrial-exchange.group',
    'jamie@sinopower.co.zw',
    'rutendo@industrial-exchange.group',
    'mathew@industrial-exchange.group',
    'louis@industrial-exchange.group',
  ],
};

function buildHtmlEmail(rec: any, allCc: string[]) {
  const isSino = (rec.company || '').toLowerCase().includes('sino');
  const colour = isSino ? '#1e3a8a' : '#b91c1c';
  const brand = isSino ? 'Sino Plant' : 'Machinery Exchange';
  const logo = isSino
    ? 'https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/spz-logo.png'
    : 'https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/mxg-logo.png';

  const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const newProductBanner = rec.is_new_product ? `
    <div style="background:#fffbeb;border:2px dashed #d97706;border-radius:8px;padding:16px 24px;margin:20px 32px 0;text-align:center;">
        <div style="font-size:15px;font-weight:900;color:#b45309;letter-spacing:1px;text-transform:uppercase;">
          ⭐ NEW PRODUCT NOTIFICATION (FIRST TIME MACHINE SOLD BY US)
        </div>
        <div style="font-size:13px;color:#92400e;margin-top:4px;">
          This equipment model (${rec.equipment_model || 'New Machine'}) is being sold for the first time by our group. Engineering & Fleetrack teams have been notified.
        </div>
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="margin:0;padding:24px;font-family:Arial,'Helvetica Neue',sans-serif;background:#f0f4f8;">
    <div style="max-width:920px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.12);">
        <table style="width:100%;border-collapse:collapse;background:${colour};" cellpadding="0" cellspacing="0"><tr>
            <td style="padding:24px 32px;vertical-align:middle;width:45%;">
            <img src="${logo}" alt="${brand}" style="display:block;height:125px;width:auto;max-width:300px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
            </td>
            <td style="padding:24px 32px;vertical-align:middle;text-align:right;width:55%;">
            <div style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;">${brand}</div>
            <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:6px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">Aftersales Handover Report</div>
            <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:4px;">Date: ${currentDate}</div>
            </td>
        </tr></table>

        ${newProductBanner}

        <div style="padding:32px 32px 16px;">
            <p style="margin:0;font-size:16px;color:#0f172a;line-height:1.7;">
                Dear <strong>${rec.contact_person || 'Customer'}</strong>,<br><br>
                Thank you for your valued purchase! Your machine has been added to our Fleetrack Machine Management System. 
                <strong>@MXG | Fleetrack (Bruce)</strong> and the Fleetrack team will be your point of contact for any aftersales queries and service requirements.<br><br>
                A <strong>Customer Support WhatsApp Group</strong> will be created where you will be made an admin, allowing you to easily add your <strong>team members</strong> to report issues or request services.
            </p>
        </div>
        
        <div style="padding:16px 32px 36px;overflow-x:auto;">
            <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:15px;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);" cellpadding="0" cellspacing="0">
                <thead>
                    <tr style="background:${colour};">
                        <th colspan="2" style="padding:16px 20px;text-align:left;color:white;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid rgba(0,0,0,0.1);">Machine Details</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;width:40%;background:#f8fafc;">Machine Model</td>
                        <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">${rec.equipment_model || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">SN (Chassis Number)</td>
                        <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">${rec.chassis_number || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">OEM</td>
                        <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">${rec.oem || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Engine Number</td>
                        <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">${rec.engine_number || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Warranty Applicable</td>
                        <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">${rec.warranty_applicable || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Warranty Start</td>
                        <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">${rec.warranty_start_date || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Warranty End</td>
                        <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">${rec.warranty_end_date || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;font-weight:bold;background:#f8fafc;">Warranty</td>
                        <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;">${rec.service_plan || 'N/A'}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 28px;font-size:11px;color:#94a3b8;text-align:center;">
            Please feel free to contact us with any questions or queries.<br>
            Kind regards, <strong>${rec.handover_salesperson || 'Aftersales Team'}</strong><br><br>
            This is an automated update from ${brand}. Please do not reply to this email. &copy; ${brand} &mdash; Omnis Order Management System
        </div>
    </div></body></html>
  `;

  return {
    to: rec.email_address || '',
    cc: allCc.join(','),
    subject: `${rec.is_new_product ? '⭐ [NEW PRODUCT] ' : ''}Aftersales Handover Summary - ${rec.equipment_model || 'Equipment'}`,
    body: html,
  };
}

// ── Atomic form components — OUTSIDE parent component to prevent remounting ───
// This is the fix for the keyboard dismissing on every keystroke.

type FFProps = {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean; half?: boolean;
};
const FormField = memo(({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false, half = false }: FFProps) => (
  <View style={[fS.group, half && fS.half]}>
    <Text style={fS.label}>{label}</Text>
    <TextInput
      style={[fS.input, multiline && fS.multiline]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || label}
      placeholderTextColor="#94a3b8"
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
      textAlignVertical={multiline ? 'top' : 'center'}
      blurOnSubmit={false}
    />
  </View>
));

type DFProps = { label: string; value: string; onSelect: (v: string) => void; placeholder?: string; half?: boolean; };
const DateField = memo(({ label, value, onSelect, placeholder, half = false }: DFProps) => {
  const [show, setShow] = useState(false);
  return (
    <View style={[fS.group, half && fS.half]}>
      <Text style={fS.label}>{label}</Text>
      <TouchableOpacity style={[fS.input, { justifyContent: 'center', height: 38 }]} onPress={() => setShow(true)}>
        <Text style={{ fontSize: 13, color: value ? '#0f172a' : '#94a3b8', fontWeight: '500' }}>
          {value || placeholder || 'YYYY-MM-DD'}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode="date"
          display="default"
          onChange={(event: any, selectedDate?: Date) => {
            setShow(false);
            if (event.type === 'set' && selectedDate) {
              const y = selectedDate.getFullYear();
              const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
              const d = String(selectedDate.getDate()).padStart(2, '0');
              onSelect(`${y}-${m}-${d}`);
            }
          }}
        />
      )}
    </View>
  );
});

type TFProps = { label: string; value: string; onSelect: (v: string) => void; options: string[]; };
const ToggleField = memo(({ label, value, onSelect, options }: TFProps) => (
  <View style={fS.group}>
    <Text style={fS.label}>{label}</Text>
    <View style={fS.toggleRow}>
      {options.map((opt: string) => (
        <TouchableOpacity key={opt} style={[fS.toggleBtn, value === opt && fS.toggleBtnA]} onPress={() => onSelect(opt)}>
          <Text style={[fS.toggleBtnT, value === opt && fS.toggleBtnTA]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
));

type ACProps = {
  label: string; value: string; onChangeText: (v: string) => void;
  suggestions: string[]; onSelect: (v: string) => void; placeholder?: string;
};
const AutocompleteField = memo(({ label, value, onChangeText, suggestions, onSelect, placeholder }: ACProps) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={fS.group}>
      <Text style={fS.label}>{label}</Text>
      <TextInput
        style={fS.input}
        value={value}
        onChangeText={v => { onChangeText(v); setOpen(true); }}
        onFocus={() => { if (value.length >= 1) setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={placeholder || label}
        placeholderTextColor="#94a3b8"
        blurOnSubmit={false}
      />
      {open && suggestions.length > 0 && (
        <View style={acS.dropdown}>
          {suggestions.slice(0, 7).map((s, i) => (
            <TouchableOpacity key={i} style={acS.item} onPress={() => { onSelect(s); setOpen(false); }}>
              <Text style={acS.itemText} numberOfLines={1}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});

const fS = StyleSheet.create({
  group:      { marginBottom: 10 },
  half:       { flex: 1 },
  label:      { fontSize: 10, fontWeight: '700', color: '#475569', marginBottom: 3, letterSpacing: 0.2, textTransform: 'uppercase' },
  input:      { backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, color: '#0f172a', fontWeight: '500' },
  multiline:  { height: 64, textAlignVertical: 'top', paddingTop: 8 },
  toggleRow:  { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  toggleBtn:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: 'white' },
  toggleBtnA: { backgroundColor: '#4c110d', borderColor: '#4c110d' },
  toggleBtnT: { fontSize: 11, fontWeight: '700', color: '#475569' },
  toggleBtnTA:{ color: 'white' },
});
const acS = StyleSheet.create({
  dropdown: { position: 'absolute', top: 62, left: 0, right: 0, zIndex: 999, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 10, maxHeight: 220 },
  item:     { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemText: { fontSize: 13, color: '#0f172a', fontWeight: '500' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function AfterSalesScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [records, setRecords]           = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch]             = useState('');
  const [expandedId, setExpandedId]     = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editRecord, setEditRecord]     = useState<any | null>(null);
  const [form, setForm]                 = useState(blankForm());
  const [ccEmails, setCcEmails]             = useState<string[]>([]);
  const [newCcEmail, setNewCcEmail]         = useState('');
  const [selectedCcCompanies, setSelectedCcCompanies] = useState<string[]>([]);
  const [selectedDepts, setSelectedDepts]   = useState<Record<string, boolean>>({ Fleetrack: false, Engineering: false, Parts: false });
  const [isNewProduct, setIsNewProduct]     = useState(false);
  const [submitting, setSubmitting]         = useState(false);

  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [allProducts, setAllProducts]   = useState<any[]>([]);
  const [custSugg, setCustSugg]         = useState<string[]>([]);
  const [prodSugg, setProdSugg]         = useState<string[]>([]);

  // ── Load master data ─────────────────────────────────────────────────────

  useEffect(() => {
    supabase.from('customers').select('customer_name').order('customer_name')
      .then(({ data }) => { if (data) setAllCustomers(data); });
    supabase.from('products').select('item_name,brand_name').order('item_name')
      .then(({ data }) => { if (data) setAllProducts(data); });
  }, []);

  // ── Records ──────────────────────────────────────────────────────────────

  const fetchRecords = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('aftersales_handover').select('*').order('created_at', { ascending: false });
      if (!error) setRecords(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchRecords(); }, []);
  useFocusEffect(useCallback(() => { fetchRecords(); }, [fetchRecords]));

  const stats = useMemo(() => ({
    pending:   records.filter(r => (r.status || 'Pending') === 'Pending').length,
    completed: records.filter(r => r.status === 'Completed').length,
    total:     records.length,
  }), [records]);

  const filtered = useMemo(() => {
    let list = [...records];
    if (statusFilter !== 'All') list = list.filter(r => (r.status || 'Pending') === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        [r.company, r.equipment_model, r.chassis_number, r.oem, r.contact_person, r.handover_salesperson]
          .some(v => (v || '').toLowerCase().includes(q))
      );
    }
    return list;
  }, [records, statusFilter, search]);

  // ── Stable callbacks (don't recreate on each render) ─────────────────────

  const setField = useCallback((key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const onCompanyChange = useCallback((v: string) => {
    setField('company', v);
    if (v.length >= 1) {
      const q = v.toLowerCase();
      setCustSugg(allCustomers.filter(c => c.customer_name.toLowerCase().includes(q)).map(c => c.customer_name));
    } else setCustSugg([]);
  }, [allCustomers, setField]);

  const onCompanySelect = useCallback((name: string) => {
    setField('company', name); setCustSugg([]);
  }, [setField]);

  const onModelChange = useCallback((v: string) => {
    setField('equipment_model', v);
    if (v.length >= 1) {
      const q = v.toLowerCase();
      setProdSugg(allProducts.filter(p => p.item_name.toLowerCase().includes(q)).map(p => p.item_name));
    } else setProdSugg([]);
  }, [allProducts, setField]);

  const onModelSelect = useCallback((name: string) => {
    const prod = allProducts.find(p => p.item_name === name);
    setField('equipment_model', name);
    if (prod?.brand_name) setField('oem', prod.brand_name);
    setProdSugg([]);
  }, [allProducts, setField]);

  const addCcEmail = useCallback(() => {
    const t = newCcEmail.trim();
    if (!t) return;
    if (!/\S+@\S+\.\S+/.test(t)) { Alert.alert('Invalid Email', 'Enter a valid email address.'); return; }
    if (ccEmails.includes(t)) { Alert.alert('Duplicate', 'Already in CC list.'); return; }
    setCcEmails(prev => [...prev, t]);
    setNewCcEmail('');
  }, [newCcEmail, ccEmails]);

  const removeCcEmail = useCallback((email: string) => {
    setCcEmails(prev => prev.filter(e => e !== email));
  }, []);

  const openNew = useCallback(async () => {
    setEditRecord(null);
    const bf = blankForm();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const metaName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name;
        const formattedEmailName = (user.email || '').split('@')[0].split(/[._-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        bf.handover_salesperson = metaName?.trim() || formattedEmailName || '';
      }
    } catch(e) {}
    setForm(bf);
    setCcEmails([]);
    setSelectedCcCompanies([]);
    setSelectedDepts({ Fleetrack: false, Engineering: false, Parts: false });
    setIsNewProduct(false);
    setNewCcEmail('');
    setModalVisible(true);
  }, []);

  const openEdit = useCallback((item: any) => {
    setEditRecord(item);
    setForm({
      company: item.company||'', contact_person: item.contact_person||'',
      cell_number: item.cell_number||'', email_address: item.email_address||'',
      physical_address: item.physical_address||'', date_of_sale: item.date_of_sale||'',
      equipment_model: item.equipment_model||'', chassis_number: item.chassis_number||'',
      engine_number: item.engine_number||'', oem: item.oem||'', location: item.location||'',
      warranty_start_date: item.warranty_start_date||'', warranty_applicable: item.warranty_applicable||'Yes',
      warranty_end_date: item.warranty_end_date||'', service_plan: item.service_plan||'',
      training_done: item.training_done||'No', training_date: item.training_date||'',
      training_operator: item.training_operator||'', handover_salesperson: item.handover_salesperson||'',
      handover_date: item.handover_date||'', notes: item.notes||'',
    });
    const existing = (item.additional_email || '').split(',').map((e: string) => e.trim()).filter(Boolean);
    setCcEmails(existing);
    setSelectedCcCompanies([]);
    setSelectedDepts({ Fleetrack: false, Engineering: false, Parts: false });
    setIsNewProduct(!!item.is_new_product);
    setNewCcEmail('');
    setModalVisible(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.company.trim() && !form.equipment_model.trim()) {
      Alert.alert('Required', 'Enter Company or Equipment Model.'); return;
    }
    setSubmitting(true);
    try {
      const companyCcList = selectedCcCompanies.flatMap(co => DEFAULT_COMPANY_CC_EMAILS[co] || []);
      const deptCcList = Object.keys(selectedDepts).filter(d => selectedDepts[d]).flatMap(d => DEFAULT_DEPT_EMAILS[d] || []);
      const newProdCcList = isNewProduct ? [...(DEFAULT_DEPT_EMAILS['Engineering'] || []), ...(DEFAULT_DEPT_EMAILS['Fleetrack'] || [])] : [];

      const allCcSet = new Set([...ccEmails, ...companyCcList, ...deptCcList, ...newProdCcList]);
      const finalCcString = Array.from(allCcSet).join(',');

      const payload: any = {
        ...form,
        additional_email: finalCcString,
      };
      
      // Clean empty dates to prevent Supabase "invalid input syntax for type date: ''" errors
      ['date_of_sale', 'warranty_start_date', 'warranty_end_date', 'training_date', 'handover_date'].forEach(f => {
        if (payload[f] === '') payload[f] = null;
      });

      if (editRecord) {
        const { error } = await supabase.from('aftersales_handover')
          .update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('aftersales_handover').insert({ ...payload, status: 'Pending' });
        if (error) throw error;
      }
      setModalVisible(false); fetchRecords();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSubmitting(false); }
  }, [form, ccEmails, selectedCcCompanies, selectedDepts, isNewProduct, editRecord, fetchRecords]);

  const handleMarkComplete = useCallback((item: any) => {
    Alert.alert('Mark Completed', `Mark "${item.company || 'this record'}" as Completed?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Done', onPress: async () => {
          const { error } = await supabase.from('aftersales_handover')
            .update({ status: 'Completed', updated_at: new Date().toISOString() }).eq('id', item.id);
          if (error) Alert.alert('Error', error.message); else fetchRecords();
        },
      },
    ]);
  }, [fetchRecords]);

  const handleSendEmail = useCallback(async (item: any, extraCc: string[] = []) => {
    if (!item.email_address) { Alert.alert('No Email', 'No email address on file.'); return; }
    
    const existing = (item.additional_email || '').split(',').map((e: string) => e.trim()).filter(Boolean);
    const companyCcList = selectedCcCompanies.flatMap(co => DEFAULT_COMPANY_CC_EMAILS[co] || []);
    const deptCcList = Object.keys(selectedDepts).filter(d => selectedDepts[d]).flatMap(d => DEFAULT_DEPT_EMAILS[d] || []);
    const newProdCcList = isNewProduct ? [...(DEFAULT_DEPT_EMAILS['Engineering'] || []), ...(DEFAULT_DEPT_EMAILS['Fleetrack'] || [])] : [];

    const rawCc = [...existing, ...extraCc, ...companyCcList, ...deptCcList, ...newProdCcList];
    const deduplicatedCc = Array.from(new Set(rawCc.map(e => e.trim().toLowerCase()).filter(Boolean)))
      .filter(e => e !== (item.email_address || '').trim().toLowerCase());

    const itemWithNewProd = { ...item, is_new_product: isNewProduct };
    const emailObj = buildHtmlEmail(itemWithNewProd, deduplicatedCc);

    try {
      const { error } = await supabase.from('omnis_email_queue').insert({
        to_email: emailObj.to,
        cc_email: emailObj.cc,
        subject: emailObj.subject,
        body_html: emailObj.body,
        body_text: 'Your email client does not support HTML. Please view this email on a supported client.',
        status: 'pending',
        related_type: 'aftersales',
        system: 'fleetrack',
        created_by: item.handover_salesperson || 'Tablet App'
      });
      
      if (error) throw error;
      await supabase.from('aftersales_handover').update({ email_sent: true }).eq('id', item.id);
      Alert.alert('Email Queued', 'The HTML handover report has been queued and will be sent shortly.');
      fetchRecords();
    } catch (e: any) {
      Alert.alert('Error Queuing Email', e.message);
    }
  }, [selectedCcCompanies, selectedDepts, isNewProduct, fetchRecords]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    const av  = getAvatar(item.company || '');
    const sc  = STATUS_COLORS[item.status || 'Pending'];
    const isExp  = expandedId === item.id;
    const isPend = (item.status || 'Pending') === 'Pending';
    const hDate  = item.handover_date
      ? new Date(item.handover_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.95} onPress={() => setExpandedId(isExp ? null : item.id)}>
        <View style={[styles.cardStripe, { backgroundColor: sc.border }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.avatar, { backgroundColor: av.bg }]}>
              <Text style={styles.avatarText}>{av.initials}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardCompany} numberOfLines={1}>{item.company || 'Unknown Company'}</Text>
                {item.email_sent && (
                  <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 }}>
                    <Text style={{ color: '#15803d', fontSize: 9, fontWeight: 'bold' }}>Email Sent</Text>
                  </View>
                )}
                <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border, marginLeft: item.email_sent ? 6 : 0 }]}>
                  <Text style={[styles.statusText, { color: sc.text }]}>{item.status || 'Pending'}</Text>
                </View>
              </View>
              {item.equipment_model ? (
                <Text style={styles.cardModel} numberOfLines={1}>{item.oem ? `${item.oem} · ` : ''}{item.equipment_model}</Text>
              ) : null}
              <View style={styles.cardMeta}>
                {item.chassis_number ? (
                  <View style={styles.metaChip}>
                    <Ionicons name="barcode-outline" size={10} color="#64748b" />
                    <Text style={styles.metaText}>{item.chassis_number}</Text>
                  </View>
                ) : null}
                {hDate ? (
                  <View style={styles.metaChip}>
                    <Ionicons name="calendar-outline" size={10} color="#3b82f6" />
                    <Text style={[styles.metaText, { color: '#3b82f6' }]}>Handover: {hDate}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <Ionicons name={isExp ? 'chevron-up' : 'chevron-down'} size={16} color="#94a3b8" style={{ marginLeft: 8 }} />
          </View>

          {isExp && (
            <View style={styles.expandedSection}>
              <View style={styles.detailsGrid}>
                {[
                  ['Contact', item.contact_person], ['Cell', item.cell_number],
                  ['Email', item.email_address], ['CC', item.additional_email],
                  ['Address', item.physical_address], ['Date of Sale', item.date_of_sale],
                  ['Warranty', item.warranty_applicable], ['Start', item.warranty_start_date],
                  ['End', item.warranty_end_date], ['Warranty', item.service_plan],
                  ['Training', item.training_done], ['Salesperson', item.handover_salesperson],
                  ['Location', item.location],
                ].map(([l, v]) => v ? (
                  <View key={l as string} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{l}</Text>
                    <Text style={styles.detailValue}>{v as string}</Text>
                  </View>
                ) : null)}
                {item.notes ? (
                  <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, marginTop: 4 }]}>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <Text style={[styles.detailValue, { flex: 1 }]}>{item.notes}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleSendEmail(item)}>
                  <Ionicons name="mail-outline" size={14} color="#3b82f6" />
                  <Text style={[styles.actionBtnText, { color: '#3b82f6' }]}>Email</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
                  <Ionicons name="create-outline" size={14} color="#8b5cf6" />
                  <Text style={[styles.actionBtnText, { color: '#8b5cf6' }]}>Edit</Text>
                </TouchableOpacity>
                {isPend && (
                  <TouchableOpacity style={[styles.actionBtn, styles.completeBtn]} onPress={() => handleMarkComplete(item)}>
                    <Ionicons name="checkmark-circle-outline" size={14} color="#047857" />
                    <Text style={[styles.actionBtnText, { color: '#047857' }]}>Mark Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [expandedId, handleSendEmail, openEdit, handleMarkComplete]);

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient colors={['#4c110d','#8b2219','#6b1a14']} start={{ x:0,y:0 }} end={{ x:1,y:1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="white" />
          </TouchableOpacity>
          <View style={{ flex:1, marginLeft:8 }}>
            <Text style={styles.headerTitle}>Aftersales Handover</Text>
            <Text style={styles.headerSubtitle}>Machines handed over awaiting documentation</Text>
          </View>
          <TouchableOpacity onPress={openNew} style={styles.addBtn}>
            <Ionicons name="add" size={18} color="white" />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.pillsRow}>
          {(['All','Pending','Completed'] as const).map(f => (
            <TouchableOpacity key={f}
              style={[styles.pill,
                f==='All'&&statusFilter==='All'&&styles.pillActive,
                f==='Pending'&&{ borderColor:'#f59e0b' },
                statusFilter==='Pending'&&f==='Pending'&&styles.pillPending,
                f==='Completed'&&{ borderColor:'#10b981' },
                statusFilter==='Completed'&&f==='Completed'&&styles.pillCompleted,
              ]}
              onPress={() => setStatusFilter(f)}>
              {f==='Pending' && <Ionicons name="time-outline" size={11} color={statusFilter==='Pending'?'#78350f':'#f59e0b'} />}
              {f==='Completed' && <Ionicons name="checkmark-circle-outline" size={11} color={statusFilter==='Completed'?'#047857':'#10b981'} />}
              <Text style={[styles.pillText,
                f==='Pending'&&{ color: statusFilter==='Pending'?'#78350f':'#f59e0b' },
                f==='Completed'&&{ color: statusFilter==='Completed'?'#047857':'#10b981' },
                f==='All'&&statusFilter==='All'&&styles.pillTextActive,
              ]}>
                {f==='All'?`${stats.total} All`:f==='Pending'?`${stats.pending} Pending`:`${stats.completed} Completed`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={14} color="#94a3b8" style={{ marginRight:6 }} />
          <TextInput style={styles.searchInput} placeholder="Search company, model, chassis..." placeholderTextColor="#94a3b8" value={search} onChangeText={setSearch} />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={14} color="#94a3b8" /></TouchableOpacity> : null}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color="#8b2219" />
          <Text style={styles.stateText}>Loading handover records...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRecords(); }} tintColor="#8b2219" />
          }
          ListEmptyComponent={
            <View style={styles.centeredState}>
              <Ionicons name="clipboard-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>
                {statusFilter==='Completed' ? 'No completed handovers' : 'All clear — no pending handovers'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {statusFilter==='All' ? 'Tap + New to log the first handover' : 'Switch to All to see all records'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Form Modal ── */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalRoot, { paddingBottom: insets.bottom }]}>
          <LinearGradient colors={['#4c110d','#6b1a14']} style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editRecord ? 'Edit Handover' : 'New Handover'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.topHeaderCancelBtn} disabled={submitting}>
                <Text style={styles.topHeaderCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.topHeaderSaveBtn, submitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={submitting}>
                {submitting
                  ? <ActivityIndicator size="small" color="#8b2219" />
                  : <Text style={styles.topHeaderSaveText}>Save Record</Text>
                }
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex:1 }}>
            <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">

              {/* ── Customer Details ── */}
              <Text style={styles.sectionHeading}>Customer Details</Text>

              <AutocompleteField
                label="Company / Customer *"
                value={form.company}
                onChangeText={onCompanyChange}
                onSelect={onCompanySelect}
                suggestions={custSugg}
                placeholder="Start typing company name..."
              />

              <View style={styles.row}>
                <FormField label="Contact Person" value={form.contact_person} onChangeText={v => setField('contact_person', v)} placeholder="Full name" half />
                <View style={styles.rowGap} />
                <FormField label="Cell Number" value={form.cell_number} onChangeText={v => setField('cell_number', v)} placeholder="+263..." keyboardType="phone-pad" half />
              </View>

              <FormField label="Primary Email (To)" value={form.email_address} onChangeText={v => setField('email_address', v)} placeholder="customer@company.com" keyboardType="email-address" />

              {/* CC Emails — unlimited, tag-based */}
              <View style={fS.group}>
                <Text style={fS.label}>CC Emails{ccEmails.length > 0 ? ` (${ccEmails.length} added)` : ''}</Text>
                {ccEmails.length > 0 && (
                  <View style={styles.ccTagsRow}>
                    {ccEmails.map(email => (
                      <View key={email} style={styles.ccTag}>
                        <Text style={styles.ccTagText} numberOfLines={1}>{email}</Text>
                        <TouchableOpacity onPress={() => removeCcEmail(email)} style={styles.ccTagRemove}>
                          <Ionicons name="close" size={11} color="#64748b" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                <View style={styles.ccInputRow}>
                  <TextInput
                    style={[fS.input, styles.ccInput]}
                    value={newCcEmail}
                    onChangeText={setNewCcEmail}
                    placeholder="Add CC address..."
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    blurOnSubmit={false}
                    onSubmitEditing={addCcEmail}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={styles.ccAddBtn} onPress={addCcEmail}>
                    <Ionicons name="add" size={18} color="white" />
                  </TouchableOpacity>
                </View>
                {ccEmails.length > 0 && (
                  <Text style={styles.ccHint}>All {ccEmails.length} address{ccEmails.length !== 1 ? 'es' : ''} appear in a single CC field on the email.</Text>
                )}

                {/* Company CC Pills */}
                <Text style={[fS.label, { marginTop: 10 }]}>Company Internal CC Notifications:</Text>
                <View style={styles.companyPillRow}>
                  {['Machinery Exchange', 'Sinopower'].map(company => {
                    const isSelected = selectedCcCompanies.includes(company);
                    return (
                      <TouchableOpacity
                        key={company}
                        style={[styles.companyPillBtn, isSelected && styles.companyPillBtnActive]}
                        onPress={() => {
                          setSelectedCcCompanies(prev =>
                            prev.includes(company) ? prev.filter(c => c !== company) : [...prev, company]
                          );
                        }}
                        activeOpacity={0.75}
                      >
                        <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={15} color={isSelected ? '#0369a1' : '#64748b'} />
                        <Text style={[styles.companyPillText, isSelected && styles.companyPillTextActive]}>{company}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Department Notifications */}
                <Text style={[fS.label, { marginTop: 10 }]}>Department CC Notifications:</Text>
                <View style={styles.companyPillRow}>
                  {['Fleetrack', 'Engineering', 'Parts'].map(dept => {
                    const isSelected = !!selectedDepts[dept];
                    return (
                      <TouchableOpacity
                        key={dept}
                        style={[styles.companyPillBtn, isSelected && styles.companyPillBtnActive]}
                        onPress={() => {
                          setSelectedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
                        }}
                        activeOpacity={0.75}
                      >
                        <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={15} color={isSelected ? '#0369a1' : '#64748b'} />
                        <Text style={[styles.companyPillText, isSelected && styles.companyPillTextActive]}>{dept}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* New Product Notification Checkbox */}
              <TouchableOpacity
                style={styles.newProductCheckRow}
                onPress={() => setIsNewProduct(!isNewProduct)}
                activeOpacity={0.7}
              >
                <Ionicons name={isNewProduct ? 'checkbox' : 'square-outline'} size={20} color={isNewProduct ? '#b45309' : '#64748b'} />
                <Text style={[styles.newProductCheckText, isNewProduct && styles.newProductCheckTextActive]}>
                  ⭐ New Product Notification (First time sold by us - Auto-notifies Engineering &amp; Fleetrack)
                </Text>
              </TouchableOpacity>

              <FormField label="Physical Address" value={form.physical_address} onChangeText={v => setField('physical_address', v)} placeholder="Street, City" multiline />

              {/* ── Equipment Details ── */}
              <Text style={styles.sectionHeading}>Equipment Details</Text>

              <AutocompleteField
                label="Equipment Model *"
                value={form.equipment_model}
                onChangeText={onModelChange}
                onSelect={onModelSelect}
                suggestions={prodSugg}
                placeholder="Start typing model — OEM auto-fills..."
              />

              <View style={styles.row}>
                <FormField label="OEM / Brand" value={form.oem} onChangeText={v => setField('oem', v)} placeholder="e.g. SHANTUI" half />
                <View style={styles.rowGap} />
                <DateField label="Date of Sale" value={form.date_of_sale} onSelect={v => setField('date_of_sale', v)} placeholder="YYYY-MM-DD" half />
              </View>

              <View style={styles.row}>
                <FormField label="Chassis / Serial No." value={form.chassis_number} onChangeText={v => setField('chassis_number', v)} placeholder="Chassis No." half />
                <View style={styles.rowGap} />
                <FormField label="Engine Number" value={form.engine_number} onChangeText={v => setField('engine_number', v)} placeholder="Engine No." half />
              </View>

              <FormField label="Deployment Location" value={form.location} onChangeText={v => setField('location', v)} placeholder="Site / city" />

              {/* ── Warranty & Service ── */}
              <Text style={styles.sectionHeading}>Warranty &amp; Service</Text>
              <ToggleField label="Warranty Applicable" value={form.warranty_applicable} onSelect={v => setField('warranty_applicable', v)} options={WARRANTY_OPTIONS} />
              <View style={styles.row}>
                <DateField label="Warranty Start" value={form.warranty_start_date} onSelect={v => setField('warranty_start_date', v)} placeholder="YYYY-MM-DD" half />
                <View style={styles.rowGap} />
                <DateField label="Warranty End" value={form.warranty_end_date} onSelect={v => setField('warranty_end_date', v)} placeholder="YYYY-MM-DD" half />
              </View>
              <FormField label="Warranty" value={form.service_plan} onChangeText={v => setField('service_plan', v)} placeholder="e.g. 1000hr / 12-month" />

              {/* ── Training ── */}
              <Text style={styles.sectionHeading}>Training</Text>
              <ToggleField label="Training Completed" value={form.training_done} onSelect={v => setField('training_done', v)} options={TRAINING_OPTIONS} />
              {form.training_done === 'Yes' && (
                <View style={styles.row}>
                  <DateField label="Training Date" value={form.training_date} onSelect={v => setField('training_date', v)} placeholder="YYYY-MM-DD" half />
                  <View style={styles.rowGap} />
                  <FormField label="Operator Trained" value={form.training_operator} onChangeText={v => setField('training_operator', v)} placeholder="Operator name" half />
                </View>
              )}

              {/* ── Handover Info ── */}
              <Text style={styles.sectionHeading}>Handover Info</Text>
              <View style={styles.row}>
                <FormField label="Handover Salesperson" value={form.handover_salesperson} onChangeText={v => setField('handover_salesperson', v)} placeholder="Name" half />
                <View style={styles.rowGap} />
                <DateField label="Handover Date" value={form.handover_date} onSelect={v => setField('handover_date', v)} placeholder="YYYY-MM-DD" half />
              </View>
              <FormField label="Notes" value={form.notes} onChangeText={v => setField('notes', v)} placeholder="Additional notes..." multiline />

              {/* ── Form Actions ── */}
              <View style={styles.formActions}>
                {editRecord && (
                  <TouchableOpacity style={styles.emailBtn} onPress={() => {
                    setModalVisible(false);
                    setTimeout(() => handleSendEmail({ ...editRecord, ...form }, ccEmails), 300);
                  }}>
                    <Ionicons name="mail-outline" size={16} color="white" />
                    <Text style={styles.emailBtnText}>
                      Send Email{ccEmails.length > 0 ? ` (${ccEmails.length + 1} recipients)` : ''}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.saveBtn, submitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={submitting}>
                  {submitting
                    ? <ActivityIndicator size="small" color="white" />
                    : <><Ionicons name="save-outline" size={16} color="white" /><Text style={styles.saveBtnText}>Save Record</Text></>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex:1, backgroundColor:'#f8fafc' },
  header: { paddingHorizontal:16, paddingBottom:14 },
  headerRow: { flexDirection:'row', alignItems:'center', marginBottom:12 },
  backBtn: { padding:8, borderRadius:10, backgroundColor:'rgba(255,255,255,0.15)' },
  headerTitle: { fontSize:17, fontWeight:'900', color:'white', letterSpacing:-0.3 },
  headerSubtitle: { fontSize:11, color:'rgba(255,255,255,0.65)', marginTop:1 },
  addBtn: { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'rgba(255,255,255,0.2)', paddingHorizontal:12, paddingVertical:7, borderRadius:20 },
  addBtnText: { fontSize:13, fontWeight:'700', color:'white' },
  pillsRow: { flexDirection:'row', gap:8, marginBottom:10 },
  pill: { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:10, paddingVertical:5, borderRadius:20, borderWidth:1, borderColor:'rgba(255,255,255,0.3)', backgroundColor:'rgba(255,255,255,0.1)' },
  pillActive: { backgroundColor:'rgba(255,255,255,0.25)', borderColor:'white' },
  pillPending: { backgroundColor:'#fef3c7', borderColor:'#f59e0b' },
  pillCompleted: { backgroundColor:'#d1fae5', borderColor:'#10b981' },
  pillText: { fontSize:11, fontWeight:'700', color:'rgba(255,255,255,0.85)' },
  pillTextActive: { color:'white' },
  searchRow: { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(255,255,255,0.12)', borderRadius:10, paddingHorizontal:10, paddingVertical:7 },
  searchInput: { flex:1, fontSize:13, color:'white', padding:0 },
  list: { padding:12, gap:10 },
  card: { flexDirection:'row', backgroundColor:'white', borderRadius:14, overflow:'hidden', shadowColor:'#000', shadowOpacity:0.07, shadowRadius:6, shadowOffset:{width:0,height:2}, elevation:3 },
  cardStripe: { width:4 },
  cardContent: { flex:1, padding:12 },
  cardHeader: { flexDirection:'row', alignItems:'center' },
  avatar: { width:44, height:44, borderRadius:11, alignItems:'center', justifyContent:'center', flexShrink:0 },
  avatarText: { fontSize:13, fontWeight:'900', color:'white', letterSpacing:0.5 },
  cardTitleRow: { flexDirection:'row', alignItems:'center', gap:8, flexWrap:'wrap' },
  cardCompany: { fontSize:15, fontWeight:'900', color:'#0f172a', letterSpacing:-0.2, flex:1 },
  cardModel: { fontSize:12, fontWeight:'700', color:'#334155', marginTop:2 },
  statusBadge: { paddingHorizontal:8, paddingVertical:2, borderRadius:20, borderWidth:1 },
  statusText: { fontSize:9, fontWeight:'800', letterSpacing:0.5 },
  cardMeta: { flexDirection:'row', gap:10, marginTop:4, flexWrap:'wrap' },
  metaChip: { flexDirection:'row', alignItems:'center', gap:3 },
  metaText: { fontSize:10, color:'#64748b' },
  expandedSection: { marginTop:12, paddingTop:12, borderTopWidth:1, borderTopColor:'#f1f5f9' },
  detailsGrid: { gap:6, marginBottom:12 },
  detailRow: { flexDirection:'row', alignItems:'flex-start' },
  detailLabel: { fontSize:11, fontWeight:'700', color:'#64748b', width:110, flexShrink:0 },
  detailValue: { fontSize:12, color:'#334155', fontWeight:'600', flex:1 },
  actionRow: { flexDirection:'row', gap:8, flexWrap:'wrap' },
  actionBtn: { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:12, paddingVertical:6, backgroundColor:'#f8fafc', borderRadius:8, borderWidth:1, borderColor:'#e2e8f0' },
  actionBtnText: { fontSize:12, fontWeight:'700' },
  completeBtn: { backgroundColor:'#f0fdf4', borderColor:'#86efac' },
  centeredState: { flex:1, alignItems:'center', justifyContent:'center', padding:40, gap:12, marginTop:80 },
  stateText: { fontSize:14, color:'#94a3b8', fontWeight:'600' },
  emptyTitle: { fontSize:16, fontWeight:'800', color:'#334155', textAlign:'center' },
  emptySubtitle: { fontSize:13, color:'#94a3b8', textAlign:'center' },
  modalRoot: { flex:1, backgroundColor:'#f8fafc' },
  modalHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:14, paddingTop:48 },
  modalTitle: { fontSize:17, fontWeight:'900', color:'white' },
  topHeaderCancelBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  topHeaderCancelText: { color: 'white', fontSize: 13, fontWeight: '700' },
  topHeaderSaveBtn: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4,
  },
  topHeaderSaveText: { color: '#8b2219', fontSize: 13, fontWeight: '900' },
  modalClose: { padding:6, borderRadius:8, backgroundColor:'rgba(255,255,255,0.2)' },
  modalScroll: { flex:1, paddingHorizontal:16, paddingTop:16 },
  sectionHeading: { fontSize:11, fontWeight:'900', color:'#8b2219', letterSpacing:0.8, textTransform:'uppercase', marginTop:20, marginBottom:10, paddingBottom:6, borderBottomWidth:1.5, borderBottomColor:'#fee2e2' },
  row: { flexDirection:'row', alignItems:'flex-start' },
  rowGap: { width:10 },
  ccTagsRow: { flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:8 },
  ccTag: { flexDirection:'row', alignItems:'center', backgroundColor:'#f1f5f9', borderRadius:20, paddingLeft:10, paddingRight:6, paddingVertical:5, borderWidth:1, borderColor:'#e2e8f0', gap:6, maxWidth:260 },
  ccTagText: { fontSize:12, fontWeight:'600', color:'#334155', flex:1 },
  ccTagRemove: { backgroundColor:'#e2e8f0', borderRadius:10, padding:2 },
  ccInputRow: { flexDirection:'row', alignItems:'center', gap:8 },
  ccInput: { flex:1 },
  ccAddBtn: { width:36, height:36, borderRadius:10, backgroundColor:'#4c110d', alignItems:'center', justifyContent:'center' },
  ccHint: { fontSize:10, color:'#94a3b8', marginTop:5, fontStyle:'italic' },
  companyPillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  companyPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  companyPillBtnActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  companyPillText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  companyPillTextActive: { color: '#0369a1', fontWeight: '700' },

  newProductCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    padding: 10,
    marginTop: 14,
    marginBottom: 4,
  },
  newProductCheckText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#78350f',
  },
  newProductCheckTextActive: {
    color: '#b45309',
    fontWeight: '800',
  },

  formActions: { marginTop:20, gap:10 },
  emailBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, backgroundColor:'#3b82f6', borderRadius:12, paddingVertical:14 },
  emailBtnText: { fontSize:14, fontWeight:'800', color:'white', letterSpacing:0.3 },
  saveBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, backgroundColor:'#4c110d', borderRadius:12, paddingVertical:14 },
  saveBtnText: { fontSize:14, fontWeight:'800', color:'white', letterSpacing:0.3 },
});
