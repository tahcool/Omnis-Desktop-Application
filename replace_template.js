const fs = require('fs');
const path = 'C:\\Users\\Administrator\\omnis\\systems\\salestrack\\create_quotation_logic.js';

let content = fs.readFileSync(path, 'utf8');

const newRenderFn = `
    function renderQuotationHTML(data) {
        const qtn = data.quotation;
        const customer = data.customer || {};
        const items = data.items || [];

        const formatCurr = (num) => (num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formatDate = (ds) => {
            if (!ds) return "";
            const d = new Date(ds);
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        };

        let itemsHtml = "";
        items.forEach(row => {
            const itemName = row.item_name || row.item_code;
            itemsHtml += \`
            <tr style="page-break-inside: avoid;">
                <td style="border: 1px solid #000; padding: 10px; text-align: center;">\${row.custom_equipment_type || 'Machine'}</td>
                <td style="border: 1px solid #000; padding: 10px; text-align: center;">\${row.item_code || '-'}</td>
                <td style="border: 1px solid #000; padding: 10px;">
                    <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">\${itemName}</div>
                    <div style="font-size: 10px; text-align: center; margin-bottom: 10px;">
                        \${row.description || 'Standard industrial specifications and performance features.'}
                    </div>
                    <div style="text-align: center; color: #cc0000; font-weight: bold;">Download Spec Sheet</div>
                </td>
                <td style="border: 1px solid #000; padding: 10px; text-align: center;">\${row.custom_lead_time || '14 - 16\\nWeeks'}</td>
                <td style="border: 1px solid #000; padding: 10px; text-align: center;">$ \${formatCurr(row.rate)}</td>
                <td style="border: 1px solid #000; padding: 10px; text-align: center; font-weight: bold;">$ \${formatCurr(row.amount)}</td>
            </tr>\`;
        });

        return \`
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; margin: 40px; padding: 0; color: #000; line-height: 1.4; }
                .header { margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
                .logo-section { width: 50%; }
                .company-details { width: 45%; text-align: right; font-size: 9px; line-height: 1.3; margin-top: 10px; }
                .title { text-align: center; font-size: 22px; font-weight: bold; margin: 30px 0 20px 0; }
                .info-table { width: 45%; border-collapse: collapse; margin-bottom: 25px; font-size: 10px; }
                .info-table td { border: 1px solid #000; padding: 4px 8px; }
                .main-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .main-table th { border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; }
                .section-title { font-weight: bold; margin-top: 20px; text-decoration: underline; font-size: 11px; }
                .footer-logos { margin-top: 50px; text-align: left; }
                .footer-logos-text { font-size: 9px; color: #888; margin-bottom: 5px; }
                .footer-images img { height: 30px; margin-right: 20px; vertical-align: middle; }
                ul { padding-left: 15px; margin-top: 5px; }
                li { margin-bottom: 4px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo-section">
                    <img src="https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/mxg-logo.png" style="max-width: 100%; height: 90px;" alt="Machinery Exchange">
                </div>
                <div class="company-details">
                    <strong>Machinery Exchange (Pvt) Ltd</strong><br>
                    5 Martin Drive, Msasa, Harare • Tel: +263 (024) 2447180-2 / 0782 191 490<br>
                    Cnr 16th Avenue, Fife Street Ext, Belmont, Bulawayo • Tel: (0)292 263191<br>
                    Email: info@machinery-exchange.com • Website: www.machinery-exchange.com<br>
                    Reg No: 584/1954 • VAT No: 220119780 • TIN No: 2001663680
                </div>
            </div>

            <div class="title">SHANTUI QUOTATION</div>

            <table class="info-table">
                <tr><td width="35%"><u>Date:</u></td><td width="65%">\${formatDate(qtn.transaction_date || qtn.creation)}</td></tr>
                <tr><td><u>Quotation Ref No:</u></td><td>\${qtn.name}</td></tr>
                <tr><td><u>Customer:</u></td><td>\${qtn.customer_name || qtn.customer || ''}</td></tr>
                <tr><td><u>Contact Person:</u></td><td>\${qtn.contact_display || qtn.customer_name || ''}</td></tr>
                <tr><td><u>Contact:</u></td><td>\${qtn.contact_mobile || qtn.contact_phone || ''}</td></tr>
                <tr><td><u>Email:</u></td><td>\${qtn.contact_email || ''}</td></tr>
            </table>

            <p>Dear Sir/Madam,</p>
            <p>We have pleasure in submitting our quotation for the requested equipment as follows:</p>

            <table class="main-table">
                <thead>
                    <tr>
                        <th width="12%"><u>Equipment</u></th>
                        <th width="10%"><u>Make/<br>Model</u></th>
                        <th width="40%"><u>Specification</u></th>
                        <th width="10%"><u>Lead<br>Time/<br>Pricing<br>Notes</u></th>
                        <th width="13%"><u>Unit Price</u></th>
                        <th width="15%"><u>Total Unit Price<br>(Excl. VAT) USD</u></th>
                    </tr>
                </thead>
                <tbody>
                    \${itemsHtml}
                    <tr>
                        <td colspan="3" style="border: 1px solid #000; padding: 6px 10px;"><u>Warranty</u> — 2000 hours or 1 year parts warranty</td>
                        <td colspan="3" style="border: 1px solid #000; padding: 6px 10px;"><u>Delivery</u> — Harare</td>
                    </tr>
                </tbody>
            </table>

            <div class="section-title">Price qualification</div>
            <ul>
                <li>Prices are subject to change as a result of deviations in the exchange rate, statutory regulations or for errors or omissions on behalf of Machinery Exchange (Pvt), it's employees and suppliers. Furthermore, the price of the equipment is subject to change if delivery is delayed by the customer beyond the delivery period. The price ruling at the date of delivery to the customer will then apply.</li>
            </ul>

            <div class="section-title">Payment terms</div>
            <ul>
                <li>Upon acceptance of this quotation, we will issue a proforma invoice. Payment terms to be discussed.</li>
                <li>Finance terms are available subject to customers meeting due diligence requirements. These are available upon request.</li>
            </ul>

            <div class="section-title">Validity</div>
            <ul>
                <li>The offer is valid for your acceptance for 30 days after the date of this quotation and thereafter subject to confirmation from us in writing.</li>
            </ul>

            <div style="page-break-before: always;"></div>
            
            <div class="header">
                <div class="logo-section">
                    <img src="https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/mxg-logo.png" style="max-width: 100%; height: 90px;" alt="Machinery Exchange">
                </div>
                <div class="company-details">
                    <strong>Machinery Exchange (Pvt) Ltd</strong><br>
                    5 Martin Drive, Msasa, Harare • Tel: +263 (024) 2447180-2 / 0782 191 490<br>
                    Cnr 16th Avenue, Fife Street Ext, Belmont, Bulawayo • Tel: (0)292 263191<br>
                    Email: info@machinery-exchange.com • Website: www.machinery-exchange.com<br>
                    Reg No: 584/1954 • VAT No: 220119780 • TIN No: 2001663680
                </div>
            </div>

            <div class="section-title">Product Support</div>
            <ul>
                <li>Machinery Exchange is the authorised distributor for Shantui, Hitachi, Wirtgen, Bobcat, Rokbak, Cummins, Baoli, Terex, Royal, Hangcha, Hamm, XCMG, John Deere, Weichai, Schwing Steter, Yanmar and Sleipner in Zimbabwe.</li>
                <li>All warranty, servicing, engineering and general support is provided by Machinery Exchange.</li>
                <li>All spares supply to be provided by Machinery Exchange</li>
            </ul>

            <p style="margin-top: 20px;">We trust this meets with your requirements.</p>

            <p style="margin-top: 20px;">Yours truly<br>For and on behalf of Machinery Exchange (Pvt) Ltd</p>

            <p style="margin-top: 20px;"><strong>Antony Dube</strong><br>
            National Equipment Sales Manager<br>
            Mobile: +263 772 294 246<br>
            Email: antony.dube@machinery-exchange.com</p>

            <div class="footer-logos">
                <div class="footer-logos-text">Proud Distributors of:</div>
                <div class="footer-images">
                    <img src="https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/shantui-logo.png" alt="Shantui">
                    <img src="https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/hitachi-logo.png" alt="Hitachi">
                </div>
            </div>

        </body>
        </html>\`;
    }`;

const regex = /function renderQuotationHTML\(data\) \{[\s\S]*?\n    \}/;
if (regex.test(content)) {
    content = content.replace(regex, newRenderFn.trim());
    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully replaced renderQuotationHTML.");
} else {
    console.log("Could not find renderQuotationHTML to replace.");
}
