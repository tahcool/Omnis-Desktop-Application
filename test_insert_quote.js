const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc');

async function testInsert() {
    const quoteId = "SAL-QTN-TEST-123";
    const qtnRecord = {
        name: quoteId,
        customer_name: "Test",
        grand_total: 100,
        status: 'Draft',
        docstatus: 0,
        transaction_date: new Date().toISOString().split('T')[0]
    };

    console.log("Inserting quotation...");
    const { error: qErr } = await supabase.from('quotations').insert(qtnRecord);
    if (qErr) {
        console.error("Quotation Insert Error:", qErr);
        return;
    }

    const itemsData = [{
        parent: quoteId,
        item_code: "TEST-ITEM",
        qty: 1,
        rate: 100,
        amount: 100,
        custom_lead_time: "test",
        custom_delivery: "test",
        custom_warranty: "test"
    }];

    console.log("Inserting quotation_items...");
    const { error: itemErr } = await supabase.from('quotation_items').insert(itemsData);
    if (itemErr) {
        console.error("Quotation Items Insert Error:", itemErr);
    } else {
        console.log("Success!");
    }

    await supabase.from('quotation_items').delete().eq('parent', quoteId);
    await supabase.from('quotations').delete().eq('name', quoteId);
}

testInsert();
