import { supabase } from './supabaseClient';

export async function logAuditTrail(params: {
  entityType: 'enquiry' | 'visit' | 'aftersales';
  entityId: string;
  action: 'DELETE' | 'UPDATE' | 'FOLLOW_UP' | 'CREATE' | 'MARK_HOT' | 'QUOTE_ISSUED';
  performedBy?: string;
  performedByName?: string;
  details?: Record<string, any>;
}): Promise<void> {
  try {
    const { entityType, entityId, action, performedBy, performedByName, details } = params;
    await supabase.from('omnis_audit_trail').insert({
      entity_type: entityType,
      entity_id: entityId,
      action: action,
      performed_by: performedBy || null,
      performed_by_name: performedByName || null,
      details: details || {},
      created_at: new Date().toISOString(),
    }).catch(e => console.warn('[AuditTrail] Silent catch on insert:', e));
  } catch (e) {
    console.warn('[AuditTrail] Error logging audit trail:', e);
  }
}
