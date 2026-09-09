import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { supabase } from '../api/supabaseClient';
import { fetchCustomers, insertCustomerEnquirySafe } from '../api/customerApi';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AutocompleteDropdown from '../components/AutocompleteDropdown';
import ItemAutocompleteDropdown from '../components/ItemAutocompleteDropdown';

// ─── Constants & Fallback Recipient Lists ─────────────────────────────────────

const COMPANIES = ['Sinopower', 'Machinery Exchange'];

const COMPANY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Sinopower':          { bg: '#7f1d1d', text: '#fca5a5', border: '#fca5a5' },
  'Machinery Exchange': { bg: '#1e3a5f', text: '#93c5fd', border: '#93c5fd' },
};

export type DepartmentName = 'Fleetrack' | 'Engineering' | 'Parts';
export const DEPARTMENTS: DepartmentName[] = ['Fleetrack', 'Engineering', 'Parts'];

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

// ─── Item & Machine Types ─────────────────────────────────────────────────────

type EnquiryItem = {
  name: string;
  qty: string;
  isNew: boolean;
  company: string;
  imageUri?: string;
  suggestedPrice?: number | null;
  lastQuotedPrice?: number | null;
  lastQuotedRef?: string | null;
};

export type MachineInspectionItem = {
  id: string;
  name: string;
  model: string;
  serial_no: string;
  fleet_no: string;
  location: string;
  hmr: string | number;
  findings: string;
  departments: Record<DepartmentName, boolean>;
  selectedForEmail?: boolean;
};

const blankItem = (): EnquiryItem => ({
  name: '', qty: '1', isNew: false, company: COMPANIES[0],
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LogActivityScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [logType, setLogType] = useState<'visit' | 'enquiry'>('visit');
  const [visitType, setVisitType] = useState('CDV');

  // Visit fields
  const [customerName, setCustomerName]     = useState('');
  const [customerEmails, setCustomerEmails] = useState('');
  const [topics, setTopics]                 = useState('');
  const [opportunities, setOpportunities]   = useState('');
  const [actionRequired, setActionRequired] = useState(false);
  const [visitImages, setVisitImages]       = useState<string[]>([]);

  // PSV Machine fields & CC notifications
  const [psvMachines, setPsvMachines]                 = useState<MachineInspectionItem[]>([]);
  const [machineSearchQuery, setMachineSearchQuery]   = useState('');
  const [loadingMachines, setLoadingMachines]         = useState(false);
  const [selectedCcCompanies, setSelectedCcCompanies] = useState<string[]>([]);

  // Dynamic email configs (with fallback to default constants)
  const [deptEmails, setDeptEmails]           = useState(DEFAULT_DEPT_EMAILS);
  const [companyCcEmails, setCompanyCcEmails] = useState(DEFAULT_COMPANY_CC_EMAILS);

  // Enquiry fields
  const [requestDetails, setRequestDetails] = useState('');
  const [enquiryValue, setEnquiryValue]     = useState('');
  const [enquiryItems, setEnquiryItems]     = useState<EnquiryItem[]>([blankItem()]);

  const [submitting, setSubmitting] = useState(false);

  // ── Load Email Configs from Supabase (with fallback) ──────────────────────

  useEffect(() => {
    const fetchEmailConfigs = async () => {
      try {
        const { data, error } = await supabase
          .from('email_notification_configs')
          .select('category, name, emails')
          .eq('is_active', true);

        if (!error && data && data.length) {
          const depts: Record<string, string[]> = { ...DEFAULT_DEPT_EMAILS };
          const ccs: Record<string, string[]> = { ...DEFAULT_COMPANY_CC_EMAILS };
          data.forEach(item => {
            if (item.category === 'department') depts[item.name] = item.emails;
            if (item.category === 'company_cc') ccs[item.name] = item.emails;
          });
          setDeptEmails(depts);
          setCompanyCcEmails(ccs);
        }
      } catch (e) {
        console.log('[LogActivity] Using fallback default email recipient lists');
      }
    };
    fetchEmailConfigs();
  }, []);

  // ── Fetch Fleetrack Machines when Customer or Visit Type changes ──────────

  const fetchFleetrackMachines = async (customer: string) => {
    if (!customer || customer.trim().length < 2) {
      setPsvMachines([]);
      return;
    }
    setLoadingMachines(true);
    try {
      const res = await fetch(
        'https://fleetrack.machinery-exchange.com/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }
      );
      const json = await res.json();
      const allMachines = json?.data || json?.message?.data || [];
      const custLower = customer.toLowerCase().trim();
      const matched = allMachines.filter((m: any) => {
        const c = (m.customer || '').toLowerCase().trim();
        return c.includes(custLower) || custLower.includes(c);
      });

      setPsvMachines(matched.map((m: any) => ({
        id: m.name || m.serial_number || m.chassis_number || Math.random().toString(),
        name: m.name || '',
        model: m.model || 'Unknown Model',
        serial_no: m.sn || m.serial_number || m.serial_no || m.chassis_number || m.name || '—',
        fleet_no: m.mxg_fleet_no || m.fleet_no || m.fleet_number || m.fleet_no_ft || '—',
        location: m.location || '—',
        hmr: m.current_hmr != null ? m.current_hmr : '—',
        findings: '',
        departments: {
          Fleetrack: false,
          Engineering: false,
          Parts: false,
        },
        selectedForEmail: true,
      })));
    } catch (e) {
      console.error('[LogActivity] Error fetching Fleetrack machines:', e);
    } finally {
      setLoadingMachines(false);
    }
  };

  useEffect(() => {
    if (visitType === 'PSV' && customerName) {
      fetchFleetrackMachines(customerName);
    }
  }, [visitType, customerName]);

  // Auto-fetch customer email if available
  useEffect(() => {
    const fetchCustomerEmail = async (custName: string) => {
      if (!custName || custName.trim().length < 2) return;
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('email_id, email')
          .ilike('customer_name', custName.trim())
          .limit(1);
        if (!error && data?.length) {
          const em = data[0].email_id || data[0].email || '';
          if (em) setCustomerEmails(prev => (prev ? prev : em));
        }
      } catch (e) {}
    };
    if (customerName) {
      fetchCustomerEmail(customerName);
    }
  }, [customerName]);

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setCustomerName('');
    setCustomerEmails('');
    setTopics('');
    setOpportunities('');
    setActionRequired(false);
    setVisitImages([]);
    setPsvMachines([]);
    setSelectedCcCompanies([]);
    setRequestDetails('');
    setEnquiryValue('');
    setEnquiryItems([blankItem()]);
  };

  const handleTopicsChange = (text: string) => {
    if (text === '' && topics === '• ') {
      setTopics('');
      return;
    }
    let formattedText = text;
    if (formattedText.length > 0 && !formattedText.startsWith('• ')) {
      formattedText = '• ' + formattedText.replace(/^[-*•]\s*/, '');
    }
    formattedText = formattedText.replace(/\n([^•\n])/g, '\n• $1');
    setTopics(formattedText);
  };

  // ── Image pickers (Max 5 photos) ──────────────────────────────────────────

  const pickVisitImage = async () => {
    if (visitImages.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 5 photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.6,
    });
    if (!result.canceled && result.assets?.length) {
      setVisitImages(prev => (prev.length < 5 ? [...prev, result.assets[0].uri] : prev));
    }
  };

  const pickItemImage = async (idx: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.55,
    });
    if (!result.canceled && result.assets?.length) {
      updateItem(idx, { imageUri: result.assets[0].uri });
    }
  };

  // ── Autocomplete ──────────────────────────────────────────────────────────

  const handleCustomerSelect = (name: string) => {
    setCustomerName(name);
    fetchFleetrackMachines(name);
  };

  // ── Item helpers ──────────────────────────────────────────────────────────

  const updateItem = (idx: number, patch: Partial<EnquiryItem>) => {
    setEnquiryItems(prev => {
      const items = [...prev];
      items[idx] = { ...items[idx], ...patch };
      return items;
    });
  };

  const removeItem = (idx: number) => {
    setEnquiryItems(prev => prev.filter((_, i) => i !== idx));
  };

// ─── Visit Email Template Generator ──────────────────────────────────────────

const uploadVisitPhoto = async (uri: string): Promise<string | null> => {
  try {
    if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileName = `visit-photos/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

    const { data, error } = await supabase.storage
      .from('public-assets')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('[UploadPhoto] Error uploading photo to Supabase storage:', error);
      return null;
    }

    const { data: publicData } = supabase.storage
      .from('public-assets')
      .getPublicUrl(fileName);

    return publicData?.publicUrl || null;
  } catch (e) {
    console.error('[UploadPhoto] Exception uploading photo:', e);
    return null;
  }
};

const generateVisitEmailHtml = (params: {
  customerName: string;
  visitType: string;
  visitDate: string;
  salesperson: string;
  topics: string;
  opportunities: string;
  actionRequired: boolean;
  psvMachines: MachineInspectionItem[];
  visitImages?: string[];
}) => {
  const { customerName, visitType, visitDate, salesperson, topics, opportunities, actionRequired, psvMachines, visitImages } = params;

  // ── Expanded Visit Type Descriptions & Dedicated Thank-You Messages ──
  let fullVisitTypeName = 'Customer Visit';
  let headerReportTitle = 'CUSTOMER VISIT REPORT';
  let thankYouMessage = '';

  if (visitType === 'PSV') {
    fullVisitTypeName = 'Product Support Visit (PSV)';
    headerReportTitle = 'PRODUCT SUPPORT VISIT REPORT';
    thankYouMessage = `We would like to thank you for hosting our representative for this Product Support Visit (PSV). We appreciate your valued business and remain dedicated to maintaining your equipment productivity and support requirements.`;
  } else if (visitType === 'FCDV') {
    fullVisitTypeName = 'Customer Visit (Focused Customer Development Visit - FCDV)';
    headerReportTitle = 'CUSTOMER VISIT REPORT';
    thankYouMessage = `We would like to thank you for taking the time to meet with our representative for this Customer Visit. We appreciate your valuable feedback and ongoing business partnership with us.`;
  } else {
    fullVisitTypeName = 'Customer Visit (Customer Development Visit - CDV)';
    headerReportTitle = 'CUSTOMER VISIT REPORT';
    thankYouMessage = `We would like to thank you for taking the time to meet with our representative for this Customer Visit. We appreciate your valuable feedback and ongoing business partnership with us.`;
  }

  // Filter only machines explicitly selected for inclusion in the email report
  const selectedMachines = (psvMachines || []).filter(m => m.selectedForEmail !== false);

  let machinesHtml = '';
  if (visitType === 'PSV' && selectedMachines.length > 0) {
    const machineCards = selectedMachines.map(m => {
      const depts = DEPARTMENTS.filter(d => m.departments && m.departments[d]);
      const deptBadges = depts.map(d => `<span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-right: 4px;">${d}</span>`).join('');
      return `
        <div style="margin-bottom: 16px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #ffffff;">
          <div style="background: #f1f5f9; padding: 10px 16px; border-bottom: 1px solid #cbd5e1; font-weight: 700; color: #0f172a; font-size: 13px;">
            🚜 Machine: ${m.model} <span style="color: #64748b; font-weight: 400;">(SN: ${m.serial_no} | Fleet: ${m.fleet_no})</span>
          </div>
          <div style="padding: 12px 16px; font-size: 13px;">
            <p style="margin: 0 0 6px 0; color: #475569;"><strong>Location:</strong> ${m.location || '—'} | <strong>HMR:</strong> ${m.hmr} hrs</p>
            ${m.findings ? `<div style="margin: 8px 0; font-size: 13px; color: #0f172a; background: #f8fafc; padding: 10px 12px; border-radius: 6px; border-left: 3px solid #8b2219;"><strong>Findings / Observations:</strong><br>${m.findings}</div>` : '<p style="margin: 4px 0; font-size: 12px; color: #94a3b8; font-style: italic;">No specific machine issues logged.</p>'}
            ${depts.length > 0 ? `<div style="margin-top: 8px; font-size: 11px; color: #475569;"><strong>Target Departments Notified:</strong> ${deptBadges}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    machinesHtml = `
      <div style="margin-top: 24px;">
        <h3 style="color: #8b2219; font-size: 15px; margin-bottom: 12px; font-weight: 800; border-bottom: 2px solid #8b2219; padding-bottom: 4px;">
          Customer Fleet Machine Inspection Report (${selectedMachines.length} Units)
        </h3>
        ${machineCards}
      </div>
    `;
  }

  let photosHtml = '';
  if (visitImages && visitImages.length > 0) {
    const photoCards = visitImages.map(url => `
      <div style="display: inline-block; margin: 6px;">
        <a href="${url}" target="_blank" style="text-decoration: none;">
          <img src="${url}" alt="Visit Attachment" style="width: 160px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.08);" />
        </a>
      </div>
    `).join('');

    photosHtml = `
      <div style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        <h3 style="color: #8b2219; font-size: 14px; margin-bottom: 12px; font-weight: 700;">
          📸 Attached Visit Photos (${visitImages.length})
        </h3>
        <div style="text-align: left;">
          ${photoCards}
        </div>
      </div>
    `;
  }

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      :root { color-scheme: light dark; }
      .logo-dark { display: none !important; }
      @media (prefers-color-scheme: dark) {
        .logo-light { display: none !important; }
        .logo-dark { display: inline-block !important; }
      }
    </style>
  </head>
  <body style="font-family: Arial, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px;">
    <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.04);">
      
      <!-- Header Banner with IEG Logo -->
      <div style="background-color: #212121; padding: 26px 20px; text-align: center; border-bottom: 4px solid #8b2219;">
        <div style="margin-bottom: 16px;">
          <img src="https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/proudly-ieg-logo-white-3x.png" alt="IEG" style="max-height: 120px; width: auto; max-width: 100%;" />
        </div>
        <h2 style="color: #ffffff; font-size: 16px; margin: 6px 0 0 0; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
          ${headerReportTitle}
        </h2>
        <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0 0; font-weight: 600;">
          ${customerName} • ${visitDate}
        </p>
      </div>

      <div style="padding: 24px;">
        <p style="font-size: 14px; color: #334155; margin-top: 0;">
          Dear <strong>${customerName}</strong>,
        </p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          ${thankYouMessage}
        </p>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          Below is a summary of the <strong>${fullVisitTypeName}</strong> logged by <strong>${salesperson}</strong> on <strong>${visitDate}</strong>.
        </p>

        <!-- Summary Table -->
        <div style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background-color: #8b2219; color: #ffffff;">
                <th colspan="2" style="padding: 10px 16px; text-align: left; font-size: 14px; font-weight: 700;">Visit Details</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; width: 35%; background: #f8fafc; color: #475569;">Customer Name</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; background: #f8fafc; color: #475569;">Visit Type</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a;"><span style="background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">${fullVisitTypeName}</span></td>
              </tr>
              <tr>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; background: #f8fafc; color: #475569;">Logged Representative</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${salesperson}</td>
              </tr>
              <tr>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; background: #f8fafc; color: #475569;">Topics Discussed</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; line-height: 1.5;">
                  <ul style="margin: 0; padding-left: 20px; color: #0f172a;">
                    ${topics.split('\n').map(line => line.trim()).filter(line => line.length > 0).map(line => {
                      const text = line.replace(/^[•\-\*]\s*/, '');
                      return `<li style="margin-bottom: 4px;">${text}</li>`;
                    }).join('')}
                  </ul>
                </td>
              </tr>
              ${opportunities ? `
              <tr>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; background: #f8fafc; color: #475569;">Opportunities / Feedback</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; line-height: 1.5;">${opportunities}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px 16px; font-weight: 700; background: #f8fafc; color: #475569;">Action Required</td>
                <td style="padding: 10px 16px; color: #0f172a;">${actionRequired ? '<span style="color: #d97706; font-weight: 700;">Yes (Follow-up pending)</span>' : '<span style="color: #10b981; font-weight: 600;">No</span>'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${machinesHtml}
        ${photosHtml}

        <p style="font-size: 13px; color: #475569; margin-top: 20px;">
          Should you have any questions or require immediate support, please contact our Customer Support Division.
        </p>

        <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
          <div style="display: inline-block; background: #1e293b; padding: 6px 12px; border-radius: 4px; margin-bottom: 8px;">
            <img src="https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/omnis-logo-white.png" alt="OMNIS" style="max-height: 12px; width: auto; opacity: 0.9; vertical-align: middle;" />
          </div>
          <p style="margin: 0 0 4px 0; font-weight: 600;">Activity & Fleet Management System</p>
          <p style="margin: 0; color: #94a3b8;">Automated visit report dispatch</p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
};

  // ── Submit ────────────────────────────────────────────────────────────────

  const submitVisit = async () => {
    if (!customerName || !topics) {
      Alert.alert('Missing Fields', 'Please provide customer name and topics discussed.');
      return;
    }
    setSubmitting(true);
    try {
      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
      const anonKey = Constants.expoConfig?.extra?.supabaseAnonKey || '';
      const { data: { user } } = await supabase.auth.getUser();

      const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.display_name;
      const formattedEmailName = (user?.email || '').split('@')[0].split(/[._-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      const salesRepDisplayName = metaName?.trim() || formattedEmailName || 'Representative';

      // ── Upload Attached Visit Photos to Supabase Storage ──
      const uploadedImageUrls: string[] = [];
      if (visitImages.length > 0) {
        for (const localUri of visitImages) {
          const publicUrl = await uploadVisitPhoto(localUri);
          if (publicUrl) uploadedImageUrls.push(publicUrl);
        }
      }

      // Collect selected CC emails for companies
      const aggregatedCc = selectedCcCompanies.flatMap(co => companyCcEmails[co] || []);
      const uniqueCcEmails = Array.from(new Set(aggregatedCc));

      // Collect target departments from machine inspection cards
      const targetDeptSet = new Set<string>();
      psvMachines.forEach(m => {
        DEPARTMENTS.forEach(dept => {
          if (m.departments && m.departments[dept]) targetDeptSet.add(dept);
        });
      });
      const targetDepartments = Array.from(targetDeptSet);

      const payload: any = {
        email_sent:       true,
        visit_date:       new Date().toISOString().split('T')[0],
        salesperson:      salesRepDisplayName,
        customer:         customerName,
        topics_discussed: topics,
        opportunities:    opportunities || null,
        action_required:  actionRequired,
        visit_type:       visitType,
        status:           'Submitted',
      };

      if (uploadedImageUrls.length) payload.images = uploadedImageUrls;
      if (customerEmails.trim()) payload.customer_email_to = customerEmails.trim();
      if (selectedCcCompanies.length) payload.cc_companies = selectedCcCompanies;
      if (uniqueCcEmails.length) payload.cc_emails = uniqueCcEmails;

      let table = 'cdv_logs';
      if (visitType === 'PSV') {
        table = 'psv_logs';
        if (psvMachines.length) payload.machines_inspected = psvMachines;
        if (targetDepartments.length) payload.target_departments = targetDepartments;
      }

      // ── Smart Retry Loop for PostgREST PGRST204 Column Mismatches ──
      let res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify(payload),
      });

      let retries = 0;
      while (!res.ok && retries < 6) {
        const errText = await res.text();
        if (res.status === 400 && errText.includes('PGRST204')) {
          const match = errText.match(/Could not find the '([^']+)' column/);
          if (match && match[1]) {
            const missingCol = match[1];
            console.warn(`[LogActivity] Schema missing column '${missingCol}', stripping and retrying...`);
            if (missingCol === 'topics_discussed') {
              payload.findings = payload.topics_discussed;
            }
            delete payload[missingCol];
          } else {
            delete payload.opportunities;
            delete payload.topics_discussed;
            delete payload.images;
            delete payload.cc_companies;
            delete payload.cc_emails;
            delete payload.customer_email_to;
            delete payload.machines_inspected;
            delete payload.target_departments;
          }

          res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
              'Content-Type':  'application/json',
              'apikey':        anonKey,
              'Authorization': `Bearer ${anonKey}`,
              'Prefer':        'return=minimal',
            },
            body: JSON.stringify(payload),
          });
          retries++;
        } else {
          throw new Error(`${res.status} ${res.statusText}\n${errText}`);
        }
      }

      if (!res.ok) {
        const finalErrText = await res.text();
        throw new Error(`${res.status} ${res.statusText}\n${finalErrText}`);
      }

      // ── Dispatch Email via omnis_email_queue ──
      try {
        const custEmailsList = customerEmails
          .split(',')
          .map(e => e.trim())
          .filter(e => e.length > 3 && e.includes('@'));

        const mainToEmail = custEmailsList.length > 0
          ? custEmailsList[0]
          : (uniqueCcEmails[0] || user?.email || '');

        const secondaryCustEmails = custEmailsList.slice(1);
        const deptEmailsList = Array.from(targetDeptSet).flatMap(d => deptEmails[d] || []);

        const rawCc = [...secondaryCustEmails, ...uniqueCcEmails, ...deptEmailsList];
        const deduplicatedCc = Array.from(
          new Set(rawCc.map(e => e.trim().toLowerCase()).filter(Boolean))
        ).filter(e => e !== mainToEmail.trim().toLowerCase());

        const ccEmailString = deduplicatedCc.join(', ');

        if (mainToEmail) {
          const visitDate = new Date().toISOString().split('T')[0];
          const htmlBody = generateVisitEmailHtml({
            customerName,
            visitType,
            visitDate,
            salesperson: salesRepDisplayName,
            topics,
            opportunities,
            actionRequired,
            psvMachines,
            visitImages: uploadedImageUrls,
          });

          await supabase.from('omnis_email_queue').insert({
            system: 'fleetrack',
            to_email: mainToEmail,
            cc_email: ccEmailString || null,
            subject: `${visitType} Visit Report - ${customerName}`,
            body_html: htmlBody,
            related_doc: customerName,
            related_type: visitType.toLowerCase(),
            created_by: user?.email || 'Mobile User',
          });

          // Trigger edge function for immediate background sending and await result
          try {
            const edgeRes = await fetch(`${supabaseUrl}/functions/v1/process-email-queue`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${anonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({}),
            });
            if (edgeRes.ok) {
              Alert.alert('Success', `${visitType} visit logged and email dispatched successfully!`);
            } else {
              Alert.alert('Error', `${visitType} visit logged, but email dispatch failed. Please check your connection or contact support.`);
            }
          } catch (e) {
            console.log('Edge trigger silent catch:', e);
            Alert.alert('Error', `${visitType} visit logged, but email dispatch failed. Please check your connection or contact support.`);
          }
        } else {
          Alert.alert('Success', `${visitType} visit logged successfully!`);
        }
      } catch (e) {
        console.error('[LogActivity] Failed to queue visit email:', e);
        Alert.alert('Warning', `${visitType} visit logged, but email queuing failed.`);
      }

      resetForm();
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred during submission');
    } finally {
      setSubmitting(false);
    }
  };

const ENQUIRY_PRIMARY_EMAILS: Record<string, string> = {
  'Sinopower': 'trucks@sinopower.co.zw',
  'Machinery Exchange': 'equipment@machinery-exchange.com',
};

const generateEnquiryEmailHtml = (params: {
  customerName: string;
  requestDetails: string;
  estimatedValue: string;
  salesperson: string;
  targetCompany: string;
  items: EnquiryItem[];
  submitDate: string;
}) => {
  const { customerName, requestDetails, estimatedValue, salesperson, targetCompany, items, submitDate } = params;
  const isSino = targetCompany.toLowerCase().includes('sino');
  const brandName = isSino ? 'Sinopower' : 'Machinery Exchange';

  const itemsRows = items.map(it => `
    <tr>
      <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${it.name || 'Requested Item'}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155; font-weight: 600;">${it.qty || 1}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #475569;">${it.company || targetCompany}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; text-align: center;">${it.isNew ? '<span style="background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">NEW</span>' : 'Standard'}</td>
    </tr>
  `).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"></head>
  <body style="font-family: Arial, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px;">
    <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.04);">
      
      <!-- Header Banner with Omnis Logo -->
      <div style="background: linear-gradient(135deg, #4c110d 0%, #8b2219 50%, #6b1a14 100%); padding: 26px 20px; text-align: center;">
        <div style="margin-bottom: 8px;">
          <img src="https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/omnis-logo-white.png" alt="OMNIS" style="max-height: 48px; width: auto;" />
        </div>
        <h2 style="color: #ffffff; font-size: 16px; margin: 4px 0 0 0; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
          NEW CUSTOMER ENQUIRY — ${brandName}
        </h2>
        <p style="color: rgba(255,255,255,0.85); font-size: 12px; margin: 4px 0 0 0;">
          ${customerName} • ${submitDate}
        </p>
      </div>

      <div style="padding: 24px;">
        <p style="font-size: 14px; color: #334155; margin-top: 0;">
          A new customer enquiry has been logged by representative <strong>${salesperson}</strong>.
        </p>

        <!-- Details Table -->
        <div style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tbody>
              <tr>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; width: 35%; background: #f8fafc; color: #475569;">Customer Name</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; background: #f8fafc; color: #475569;">Target Division</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">${targetCompany}</td>
              </tr>
              <tr>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; background: #f8fafc; color: #475569;">Request Details</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; line-height: 1.5;">${requestDetails}</td>
              </tr>
              ${estimatedValue ? `
              <tr>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; background: #f8fafc; color: #475569;">Estimated Value</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #059669; font-weight: 700;">$${estimatedValue}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px 16px; font-weight: 700; background: #f8fafc; color: #475569;">Logged Representative</td>
                <td style="padding: 10px 16px; color: #0f172a;">${salesperson}</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${items.length > 0 ? `
        <h3 style="color: #8b2219; font-size: 14px; margin: 20px 0 10px 0; font-weight: 800;">
          Requested Items / Equipment (${items.length}):
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
};

  const submitEnquiry = async () => {
    if (!customerName || !requestDetails) {
      Alert.alert('Missing Fields', 'Please provide customer name and request details.');
      return;
    }
    setSubmitting(true);
    try {
      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
      const anonKey = Constants.expoConfig?.extra?.supabaseAnonKey || '';
      const { data: { user } } = await supabase.auth.getUser();

      const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.display_name;
      const formattedEmailName = (user?.email || '').split('@')[0].split(/[._-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      const salesRepDisplayName = metaName?.trim() || formattedEmailName || 'Representative';

      // Determine main target company from requested items or default to Machinery Exchange
      const itemCompanies = enquiryItems.map(it => it.company).filter(Boolean);
      const targetCompany = itemCompanies.includes('Sinopower') ? 'Sinopower' : 'Machinery Exchange';
      
      const primaryToEmail = ENQUIRY_PRIMARY_EMAILS[targetCompany] || 'equipment@machinery-exchange.com';

      // Collect company CC emails for all companies involved in items or selected CCs
      const involvedCompanies = Array.from(new Set([...itemCompanies, ...selectedCcCompanies, targetCompany]));
      const aggregatedCc = involvedCompanies.flatMap(co => companyCcEmails[co] || []);
      const uniqueCcEmails = Array.from(new Set(aggregatedCc.map(e => e.trim().toLowerCase()).filter(Boolean)))
        .filter(e => e !== primaryToEmail.trim().toLowerCase());

      const validItems = enquiryItems
        .filter(it => it.name.trim())
        .map(it => ({
          name:            it.name.trim(),
          qty:             parseInt(it.qty) || 1,
          isNew:           it.isNew,
          company:         it.company,
          imageUri:        it.imageUri,
          suggestedPrice:  it.suggestedPrice || null,
          lastQuotedPrice: it.lastQuotedPrice || null,
          lastQuotedRef:   it.lastQuotedRef || null,
        }));

      const nowIso = new Date().toISOString();

      const { error } = await insertCustomerEnquirySafe({
        submitted_by:    user?.id ?? null,
        customer_name:   customerName,
        request_details: requestDetails,
        estimated_value: parseFloat(enquiryValue) || 0,
        items:           validItems,
        target_company:  targetCompany,
        company:         targetCompany,
        sales_rep_name:  salesRepDisplayName,
        status:          'Open',
        created_at:      nowIso,
      });

      if (error) throw new Error(error.message);

      // Queue HTML email notification
      const submitDate = new Date().toISOString().split('T')[0];
      const htmlBody = generateEnquiryEmailHtml({
        customerName,
        requestDetails,
        estimatedValue: enquiryValue,
        salesperson: salesRepDisplayName,
        targetCompany,
        items: enquiryItems,
        submitDate,
      });

      await supabase.from('omnis_email_queue').insert({
        system: 'fleetrack',
        to_email: primaryToEmail,
        cc_email: uniqueCcEmails.join(', ') || null,
        subject: `[NEW ENQUIRY] ${customerName} - ${targetCompany}`,
        body_html: htmlBody,
        related_doc: customerName,
        related_type: 'enquiry',
        created_by: salesRepDisplayName,
      });

      // Trigger background dispatch and await result
      try {
        const edgeRes = await fetch(`${supabaseUrl}/functions/v1/process-email-queue`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (edgeRes.ok) {
          Alert.alert('Success', 'Customer enquiry saved and notification emailed successfully!');
        } else {
          Alert.alert('Error', 'Enquiry saved, but email dispatch failed. Please check your connection or contact support.');
        }
      } catch (e) {
        console.log('Edge trigger silent catch:', e);
        Alert.alert('Error', 'Enquiry saved, but email dispatch failed. Please check your connection or contact support.');
      }

      resetForm();
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred during enquiry submission');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => (logType === 'visit' ? submitVisit() : submitEnquiry());

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <LinearGradient colors={['#ffffff', '#f1f5f9']} style={[styles.container, { paddingTop: 0 }]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={['#4c110d', '#8b2219', '#6b1a14']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.navLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuIcon}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log Activity</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} disabled={submitting}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.submitBtnText}>Submit</Text>}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Tab Toggle ── */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleBtn, logType === 'visit' && styles.toggleActiveBtn]}
          onPress={() => setLogType('visit')}
        >
          <Ionicons name="briefcase-outline" size={16} color={logType === 'visit' ? '#fff' : '#64748b'} />
          <Text style={[styles.toggleText, logType === 'visit' && styles.toggleActiveText]}>Customer Visit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, logType === 'enquiry' && styles.toggleActiveBtn]}
          onPress={() => setLogType('enquiry')}
        >
          <Ionicons name="chatbubbles-outline" size={16} color={logType === 'enquiry' ? '#fff' : '#64748b'} />
          <Text style={[styles.toggleText, logType === 'enquiry' && styles.toggleActiveText]}>Customer Enquiry</Text>
        </TouchableOpacity>
      </View>

      {/* ── Form ── */}
      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ════════════════ VISIT TAB ════════════════ */}
        {logType === 'visit' ? (
          <>
            {/* Visit type chips */}
            <Text style={styles.label}>Visit Type</Text>
            <View style={styles.chipsRow}>
              {['CDV', 'PSV', 'FCDV'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, visitType === type && styles.chipActive]}
                  onPress={() => setVisitType(type)}
                >
                  <Text style={[styles.chipText, visitType === type && styles.chipActiveText]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Customer */}
            <AutocompleteDropdown
              label="Customer Name *"
              placeholder="e.g. Machinery Exchange"
              value={customerName}
              onChangeText={setCustomerName}
              fetchResults={fetchCustomers}
              style={{ zIndex: 2000 }}
            />

            {/* Customer Email(s) */}
            <Text style={styles.label}>Customer Recipient Email(s)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. manager@customer.com, fleet@customer.com"
              placeholderTextColor="#94a3b8"
              value={customerEmails}
              onChangeText={setCustomerEmails}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Topics */}
            <Text style={styles.label}>Topics Discussed *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What did you discuss?"
              placeholderTextColor="#94a3b8"
              multiline
              value={topics}
              onChangeText={handleTopicsChange}
            />

            {/* Opportunities */}
            <Text style={styles.label}>Opportunities or Feedback</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any potential sales or issues?"
              placeholderTextColor="#94a3b8"
              multiline
              value={opportunities}
              onChangeText={setOpportunities}
            />

            {/* Action required */}
            <TouchableOpacity style={styles.checkboxRow} onPress={() => setActionRequired(!actionRequired)} activeOpacity={0.7}>
              <View style={[styles.checkbox, actionRequired && styles.checkboxActive]}>
                {actionRequired && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.checkboxText}>Action Required (Follow-up needed)</Text>
            </TouchableOpacity>

            {/* ── Company CC Pills (Multi-Select: One, Both, or None) ── */}
            <Text style={[styles.label, { marginTop: 14 }]}>CC Company Notifications (Select any to CC)</Text>
            <View style={styles.companyPillRow}>
              {['Machinery Exchange', 'Sinopower'].map(company => {
                const isSelected = selectedCcCompanies.includes(company);
                const emailCount = (companyCcEmails[company] || []).length;
                return (
                  <TouchableOpacity
                    key={company}
                    style={[styles.companyPillBtn, isSelected && styles.companyPillBtnActive]}
                    onPress={() => {
                      setSelectedCcCompanies(prev =>
                        prev.includes(company)
                          ? prev.filter(c => c !== company)
                          : [...prev, company]
                      );
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={16}
                      color={isSelected ? '#0284c7' : '#64748b'}
                    />
                    <Text style={[styles.companyPillText, isSelected && styles.companyPillTextActive]}>
                      {company} ({emailCount})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ════════════════ PSV FLEETRACK MACHINES SECTION ════════════════ */}
            {visitType === 'PSV' && (
              <View style={styles.psvSectionContainer}>
                <View style={styles.psvHeaderRow}>
                  <Ionicons name="construct" size={18} color="#8b2219" />
                  <Text style={styles.psvHeaderTitle}>
                    Fleetrack Customer Machines {customerName ? `(${psvMachines.length})` : ''}
                  </Text>
                </View>

                {!customerName ? (
                  <View style={styles.psvInfoCard}>
                    <Ionicons name="information-circle-outline" size={18} color="#0369a1" />
                    <Text style={styles.psvInfoText}>Please select a customer above to view their Fleetrack machines.</Text>
                  </View>
                ) : loadingMachines ? (
                  <View style={styles.psvLoadingCard}>
                    <ActivityIndicator size="small" color="#8b2219" />
                    <Text style={styles.psvLoadingText}>Fetching Fleetrack machines for {customerName}...</Text>
                  </View>
                ) : psvMachines.length === 0 ? (
                  <View style={styles.psvInfoCard}>
                    <Ionicons name="alert-circle-outline" size={18} color="#d97706" />
                    <Text style={styles.psvInfoText}>
                      No Fleetrack machines found registered under "{customerName}". You can still log general PSV topics above.
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Machine Search Bar */}
                    <View style={styles.machineSearchContainer}>
                      <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.machineSearchInput}
                        placeholder="Search machines by model, SN or fleet..."
                        placeholderTextColor="#94a3b8"
                        value={machineSearchQuery}
                        onChangeText={setMachineSearchQuery}
                      />
                      {machineSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setMachineSearchQuery('')}>
                          <Ionicons name="close-circle" size={18} color="#94a3b8" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {psvMachines
                      .filter(m => {
                        if (!machineSearchQuery.trim()) return true;
                        const q = machineSearchQuery.toLowerCase().trim();
                        return (
                          (m.model || '').toLowerCase().includes(q) ||
                          (m.serial_no || '').toLowerCase().includes(q) ||
                          (m.fleet_no || '').toLowerCase().includes(q) ||
                          (m.location || '').toLowerCase().includes(q)
                        );
                      })
                      .map((machine) => {
                        const realIdx = psvMachines.findIndex(item => item.id === machine.id);
                        return (
                          <View key={machine.id} style={styles.machineCard}>
                            {/* Card Header */}
                            <View style={styles.machineHeaderRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.machineModelText}>{machine.model}</Text>
                                <Text style={styles.machineSubText}>
                                  SN: {machine.serial_no} | Fleet: {machine.fleet_no}
                                </Text>
                              </View>
                              <View style={styles.hmrBadge}>
                                <Text style={styles.hmrBadgeText}>{machine.hmr} hrs</Text>
                              </View>
                            </View>

                            {/* Include in Email Toggle */}
                            <TouchableOpacity
                              style={styles.includeEmailRow}
                              onPress={() => {
                                setPsvMachines(prev => {
                                  const updated = [...prev];
                                  if (realIdx !== -1) {
                                    const cur = updated[realIdx].selectedForEmail !== false;
                                    updated[realIdx] = { ...updated[realIdx], selectedForEmail: !cur };
                                  }
                                  return updated;
                                });
                              }}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name={machine.selectedForEmail !== false ? 'checkbox' : 'square-outline'}
                                size={18}
                                color={machine.selectedForEmail !== false ? '#8b2219' : '#94a3b8'}
                              />
                              <Text style={[styles.includeEmailText, machine.selectedForEmail === false && styles.includeEmailTextOff]}>
                                {machine.selectedForEmail !== false ? 'Include in Email Report' : 'Excluded from Email Report'}
                              </Text>
                            </TouchableOpacity>

                            {/* Location */}
                            {machine.location && machine.location !== '—' && (
                              <View style={styles.machineLocRow}>
                                <Ionicons name="location-outline" size={13} color="#64748b" />
                                <Text style={styles.machineLocText}>{machine.location}</Text>
                              </View>
                            )}

                            {/* Comment Input */}
                            <Text style={styles.subLabel}>Machine Specific Comments / Findings</Text>
                            <TextInput
                              style={[styles.input, styles.machineTextArea]}
                              placeholder="Notes on machine condition, defects or service needs..."
                              placeholderTextColor="#94a3b8"
                              multiline
                              value={machine.findings}
                              onChangeText={text => {
                                setPsvMachines(prev => {
                                  const updated = [...prev];
                                  if (realIdx !== -1) {
                                    updated[realIdx] = { ...updated[realIdx], findings: text };
                                  }
                                  return updated;
                                });
                              }}
                            />

                            {/* Department Routing Checkboxes */}
                            <Text style={styles.subLabel}>Notify Departments for Issues on this Machine:</Text>
                            <View style={styles.deptRow}>
                              {DEPARTMENTS.map(dept => {
                                const checked = machine.departments[dept];
                                return (
                                  <TouchableOpacity
                                    key={dept}
                                    style={[styles.deptChip, checked && styles.deptChipActive]}
                                    onPress={() => {
                                      setPsvMachines(prev => {
                                        const updated = [...prev];
                                        if (realIdx !== -1) {
                                          const updatedDepts = { ...updated[realIdx].departments };
                                          updatedDepts[dept] = !updatedDepts[dept];
                                          updated[realIdx] = { ...updated[realIdx], departments: updatedDepts };
                                        }
                                        return updated;
                                      });
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <Ionicons
                                      name={checked ? 'checkbox' : 'square-outline'}
                                      size={15}
                                      color={checked ? '#0369a1' : '#64748b'}
                                    />
                                    <Text style={[styles.deptChipText, checked && styles.deptChipTextActive]}>
                                      {dept}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        );
                      })}
                  </>
                )}
              </View>
            )}

            {/* ── Photos section (Up to 5 pictures) ── */}
            <View style={styles.photoHeaderRow}>
              <Text style={[styles.label, { marginTop: 12 }]}>Photos ({visitImages.length}/5)</Text>
              {visitImages.length >= 5 && (
                <Text style={styles.photoLimitTag}>Max 5 Reached</Text>
              )}
            </View>

            <View style={styles.photoGrid}>
              {visitImages.map((uri, idx) => (
                <View key={idx} style={styles.thumbWrap}>
                  <Image source={{ uri }} style={styles.visitThumb} />
                  <TouchableOpacity
                    style={styles.thumbRemoveBtn}
                    onPress={() => setVisitImages(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}

              {visitImages.length < 5 && (
                <TouchableOpacity style={styles.addPhotoBtn} onPress={pickVisitImage}>
                  <Ionicons name="camera-outline" size={24} color="#8b2219" />
                  <Text style={styles.addPhotoBtnText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          /* ════════════════ ENQUIRY TAB ════════════════ */
          <>
            {/* Customer */}
            <AutocompleteDropdown
              label="Customer Name *"
              placeholder="e.g. Acme Corp"
              value={customerName}
              onChangeText={setCustomerName}
              fetchResults={fetchCustomers}
              style={{ zIndex: 2000 }}
            />

            {/* Request details */}
            <Text style={styles.label}>Request Details *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="General requirements (e.g. Quote for Excavators)"
              placeholderTextColor="#94a3b8"
              multiline
              value={requestDetails}
              onChangeText={setRequestDetails}
            />

            {/* Estimated value */}
            <Text style={styles.label}>Estimated Value ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={enquiryValue}
              onChangeText={setEnquiryValue}
            />

            {/* ── Items ── */}
            <Text style={styles.label}>Requested Machines / Products</Text>

            {enquiryItems.map((item, idx) => {
              const cc = COMPANY_COLORS[item.company] || { bg: '#1e293b', text: '#94a3b8', border: '#334155' };
              return (
                <View key={idx} style={[styles.itemFormCard, { zIndex: 1000 - idx }]}>
                  {/* Name + Qty */}
                  <View style={styles.itemNameQtyRow}>
                    <ItemAutocompleteDropdown
                      value={item.name}
                      placeholder="Search products or item catalog..."
                      onChangeText={v => updateItem(idx, { name: v })}
                      onSelectItem={selected => {
                        updateItem(idx, {
                          name: selected.name,
                          company: selected.company || item.company,
                          suggestedPrice: selected.suggestedPrice,
                          lastQuotedPrice: selected.lastQuotedPrice,
                          lastQuotedRef: selected.lastQuotedRef,
                        });
                      }}
                    />
                    <TextInput
                      style={[styles.input, { width: 58, marginBottom: 0, textAlign: 'center', height: 42 }]}
                      placeholder="Qty"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={item.qty}
                      onChangeText={v => updateItem(idx, { qty: v })}
                    />
                  </View>

                  {(item.suggestedPrice || item.lastQuotedPrice) && (
                    <View style={styles.itemPricingStrip}>
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

                  {/* Company picker + flags + image + delete */}
                  <View style={styles.itemControlsRow}>
                    {/* Company buttons */}
                    {COMPANIES.map(c => {
                      const color = COMPANY_COLORS[c];
                      const selected = item.company === c;
                      return (
                        <TouchableOpacity
                          key={c}
                          style={[styles.controlTag, selected && { backgroundColor: color.bg, borderColor: color.border }]}
                          onPress={() => updateItem(idx, { company: c })}
                        >
                          <Text style={[styles.controlTagText, selected && { color: color.text }]}>
                            {c === 'Machinery Exchange' ? 'M/Exchange' : c}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    {/* New flag */}
                    <TouchableOpacity
                      style={[styles.controlTag, item.isNew && { backgroundColor: '#14532d', borderColor: '#4ade80' }]}
                      onPress={() => updateItem(idx, { isNew: !item.isNew })}
                    >
                      <Text style={[styles.controlTagText, item.isNew && { color: '#4ade80' }]}>New</Text>
                    </TouchableOpacity>

                    {/* Image attach */}
                    <TouchableOpacity
                      style={[styles.controlTag, item.imageUri && { backgroundColor: '#0c4a6e', borderColor: '#38bdf8' }]}
                      onPress={() => pickItemImage(idx)}
                    >
                      <Ionicons
                        name={item.imageUri ? 'image' : 'image-outline'}
                        size={14}
                        color={item.imageUri ? '#38bdf8' : '#64748b'}
                      />
                    </TouchableOpacity>

                    {/* Delete row */}
                    {enquiryItems.length > 1 && (
                      <TouchableOpacity onPress={() => removeItem(idx)} style={{ padding: 4, marginLeft: 4 }}>
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Image preview */}
                  {item.imageUri && (
                    <View style={styles.itemImgWrap}>
                      <Image source={{ uri: item.imageUri }} style={styles.itemImagePreview} />
                      <TouchableOpacity
                        style={styles.itemImgRemoveBtn}
                        onPress={() => updateItem(idx, { imageUri: undefined })}
                      >
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}

            <TouchableOpacity
              style={styles.addItemRowBtn}
              onPress={() => setEnquiryItems(prev => [...prev, blankItem()])}
            >
              <Ionicons name="add-circle-outline" size={18} color="#8b2219" />
              <Text style={styles.addItemRowBtnText}>Add Another Item</Text>
            </TouchableOpacity>

            {/* Info */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={16} color="#0284c7" style={{ marginRight: 8 }} />
              <Text style={styles.infoText}>
                Enquiries will be sent directly to the desktop portal as an Open Opportunity so Sales can generate a quote.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3a0c09',
  },
  navLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { marginRight: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff' },

  submitBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  toggleContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#f1f5f9',
    margin: 14,
    marginBottom: 0,
    borderRadius: 12,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  toggleActiveBtn: { backgroundColor: '#0f172a' },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#64748b', marginLeft: 6 },
  toggleActiveText: { color: '#ffffff' },

  formContainer: { padding: 14, paddingTop: 10 },

  label: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4, marginTop: 8 },
  subLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginTop: 8, marginBottom: 4 },

  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    color: '#0f172a',
  },
  textArea: { height: 48, textAlignVertical: 'top' },

  chipsRow: { flexDirection: 'row', gap: 10 },
  chip: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: '#ebf8ff', borderColor: '#0284c7' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  chipActiveText: { color: '#0284c7' },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 2,
    borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  checkboxActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  checkboxText: { fontSize: 14, fontWeight: '500', color: '#475569' },

  // ── Company CC Pills ───────────────────────────────────────────────────────
  companyPillRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 2 },
  companyPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  companyPillBtnActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  companyPillText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  companyPillTextActive: { color: '#0369a1', fontWeight: '700' },

  // ── PSV Section ─────────────────────────────────────────────────────────────
  psvSectionContainer: { marginTop: 14, marginBottom: 8 },
  psvHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  psvHeaderTitle: { fontSize: 14, fontWeight: '800', color: '#8b2219' },

  psvInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  psvInfoText: { flex: 1, fontSize: 12, color: '#0369a1', fontWeight: '500' },

  psvLoadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 14,
    marginTop: 4,
  },
  psvLoadingText: { fontSize: 13, color: '#64748b', fontWeight: '600' },

  machineSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  machineSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 0,
  },

  // ── Machine Card ────────────────────────────────────────────────────────────
  machineCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  machineHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  machineModelText: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  machineSubText: { fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 2 },
  hmrBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  hmrBadgeText: { fontSize: 11, fontWeight: '700', color: '#475569' },

  includeEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  includeEmailText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8b2219',
  },
  includeEmailTextOff: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },

  machineLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  machineLocText: { fontSize: 11, color: '#64748b' },

  machineTextArea: { height: 44, marginTop: 2, textAlignVertical: 'top' },

  // ── Department Chips Row ───────────────────────────────────────────────────
  deptRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 2 },
  deptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  deptChipActive: { backgroundColor: '#e0f2fe', borderColor: '#0284c7' },
  deptChipText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  deptChipTextActive: { color: '#0369a1', fontWeight: '700' },

  // ── Photo grid (visit) ──────────────────────────────────────────────────────
  photoHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoLimitTag: { fontSize: 11, fontWeight: '700', color: '#ef4444', marginTop: 12 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  thumbWrap: { position: 'relative' },
  visitThumb: { width: 88, height: 88, borderRadius: 10, backgroundColor: '#e2e8f0' },
  thumbRemoveBtn: { position: 'absolute', top: -8, right: -8 },
  addPhotoBtn: {
    width: 88, height: 88,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    gap: 4,
  },
  addPhotoBtnText: { fontSize: 10, color: '#8b2219', fontWeight: '700' },

  // ── Enquiry items ───────────────────────────────────────────────────────────
  itemFormCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  itemNameQtyRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  itemPricingStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  priceBadgeSug: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priceBadgeSugText: { fontSize: 11, fontWeight: '700', color: '#15803d' },
  priceBadgeLast: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f3e8ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priceBadgeLastText: { fontSize: 11, fontWeight: '700', color: '#7c3aed' },
  itemControlsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  controlTag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f1f5f9',
  },
  controlTagText: { fontSize: 11, fontWeight: '700', color: '#64748b' },

  itemImgWrap: { position: 'relative', marginTop: 8 },
  itemImagePreview: { width: '100%', height: 130, borderRadius: 8, resizeMode: 'cover' },
  itemImgRemoveBtn: { position: 'absolute', top: 6, right: 6 },

  addItemRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  addItemRowBtnText: { fontSize: 13, fontWeight: '700', color: '#8b2219' },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 12, color: '#0369a1', lineHeight: 18 },
});
