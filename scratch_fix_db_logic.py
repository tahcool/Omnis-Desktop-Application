import sys
import re

with open(r'c:\Users\Administrator\omnis\systems\salestrack\dashboard_logic.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

# Fix Email Select
js_content = js_content.replace(
    """table: 'omnis_equipment_orders', method: 'select', params: { columns: 'notified_email', filters: { id: reportId } }""",
    """table: 'omnis_salestrack_notifications', method: 'select', params: { columns: 'notified_email', filters: { report_id: reportId } }"""
)

# Fix WA Select
js_content = js_content.replace(
    """table: 'omnis_equipment_orders', method: 'select', params: { columns: 'notified_wa', filters: { id: reportId } }""",
    """table: 'omnis_salestrack_notifications', method: 'select', params: { columns: 'notified_wa', filters: { report_id: reportId } }"""
)

# Fix Email Upsert
js_content = js_content.replace(
    """table: 'omnis_equipment_orders', method: 'update',
                    params: { data: { notified_email: true }, filters: { id: item.payload.relatedDoc } }""",
    """table: 'omnis_salestrack_notifications', method: 'upsert',
                    params: { data: { report_id: item.payload.relatedDoc, notified_email: true } }"""
)

# Fix WA Upsert
js_content = js_content.replace(
    """table: 'omnis_equipment_orders', method: 'update',
                    params: { data: { notified_wa: true }, filters: { id: item.payload.report_id } }""",
    """table: 'omnis_salestrack_notifications', method: 'upsert',
                    params: { data: { report_id: item.payload.report_id, notified_wa: true } }"""
)

with open(r'c:\Users\Administrator\omnis\systems\salestrack\dashboard_logic.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Fixed DB logic in JS")
