import re

file_path = r"c:\Users\Administrator\omnis\systems\salestrack\create_quotation_logic.js"
with open(file_path, "r", encoding="utf-8") as f:
    js = f.read()

# Replace submitFullQuote's API call
old_full = r"""const res = await window.callFrappeSequenced\(CURRENT_SYSTEM\.baseUrl, "powerstar_salestrack\.omnis_dashboard\.save_omnis_quotation", data\);\s*const payload = res\.message \|\| res;"""
new_full = r"""if (!window.supabase) throw new Error("Supabase client not found");
            const qtnId = "SAL-QTN-" + new Date().getFullYear().toString().slice(-2) + "-" + Math.floor(1000 + Math.random() * 9000);
            
            // Insert parent
            const qtnRes = await window.supabase.from("omnis_quotations").insert([{
                name: qtnId,
                customer_name: data.customer,
                contact_person: data.contact_person,
                transaction_date: data.transaction_date || new Date().toISOString().split('T')[0],
                company: data.company,
                currency: data.currency,
                sales_person: data.sales_person,
                bank_account: data.bank_account,
                pfi_checked: data.pfi_checked,
                delivery: data.delivery,
                notes: data.notes
            }]).select();
            
            if (qtnRes.error) throw qtnRes.error;
            
            const dbQtnId = qtnRes.data[0].id;
            
            // Insert children
            const itemPayloads = data.items.map(i => ({
                quotation_id: dbQtnId,
                item_code: i.item_code,
                qty: i.qty,
                rate: i.rate,
                amount: i.qty * i.rate
            }));
            
            const itemRes = await window.supabase.from("omnis_quotation_items").insert(itemPayloads);
            if (itemRes.error) throw itemRes.error;
            
            const payload = { ok: true, name: qtnId };"""

js = re.sub(old_full, new_full, js)

# Replace submitQuickQuote's API call
old_quick = r"""const res = await window.callFrappeSequenced\(CURRENT_SYSTEM\.baseUrl, "powerstar_salestrack\.omnis_dashboard\.save_omnis_quotation", data\);\s*const payload = res\.message \|\| res;"""
new_quick = r"""if (!window.supabase) throw new Error("Supabase client not found");
            const qtnId = "SAL-QTN-" + new Date().getFullYear().toString().slice(-2) + "-" + Math.floor(1000 + Math.random() * 9000);
            
            const qtnRes = await window.supabase.from("omnis_quotations").insert([{
                name: qtnId,
                customer_name: data.customer,
                company: data.company,
                sales_person: data.sales_person,
                notes: data.notes,
                transaction_date: new Date().toISOString().split('T')[0]
            }]).select();
            
            if (qtnRes.error) throw qtnRes.error;
            
            const dbQtnId = qtnRes.data[0].id;
            
            const itemPayloads = data.items.map(i => ({
                quotation_id: dbQtnId,
                item_code: i.item_code,
                qty: i.qty,
                rate: 0,
                amount: 0
            }));
            
            const itemRes = await window.supabase.from("omnis_quotation_items").insert(itemPayloads);
            if (itemRes.error) throw itemRes.error;
            
            const payload = { ok: true, name: qtnId };"""

js = re.sub(old_quick, new_quick, js)


# Replace get_quotation_full_details
old_fetch = r"""const resData = await window.callFrappeSequenced\(CURRENT_SYSTEM\.baseUrl, "powerstar_salestrack\.omnis_dashboard\.get_quotation_full_details", \{ qtn_name: qtnId \}\);\s*const data = resData\.message \|\| resData;"""
new_fetch = r"""if (!window.supabase) throw new Error("Supabase client not found");
            const qtnRes = await window.supabase.from("omnis_quotations").select("*").eq("name", qtnId).single();
            if (qtnRes.error) throw qtnRes.error;
            
            const itemsRes = await window.supabase.from("omnis_quotation_items").select("*").eq("quotation_id", qtnRes.data.id);
            if (itemsRes.error) throw itemsRes.error;
            
            // Map to expected Frappe output shape
            const data = {
                ok: true,
                quotation: qtnRes.data,
                customer: { custom_primary_contact_name: qtnRes.data.contact_person },
                items: itemsRes.data.map(i => ({
                    item_code: i.item_code,
                    item_name: i.item_code,
                    qty: i.qty,
                    rate: i.rate,
                    amount: i.amount
                }))
            };"""
            
js = re.sub(old_fetch, new_fetch, js)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(js)
    
print("Updated create_quotation_logic.js")
