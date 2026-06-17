import frappe

def execute():
    frappe.init(site="omnis")
    frappe.connect()

    # Update Group Sales for Machinery Exchange
    frappe.db.sql("""
        UPDATE `tabGroup Sales`
        SET company = 'Machinery Exchange'
        WHERE (company IS NULL OR company = '')
        AND (owner LIKE '%machinery%' OR owner LIKE '%mxg%' OR owner LIKE '%@machinery-exchange.com%' OR owner LIKE '%@mxg.co.zw%')
    """)

    # Update Group Sales for Sinopower
    frappe.db.sql("""
        UPDATE `tabGroup Sales`
        SET company = 'Sinopower'
        WHERE (company IS NULL OR company = '')
        AND (owner LIKE '%sinopower%' OR owner LIKE '%spz%' OR owner LIKE '%sino%' OR owner LIKE '%@sinopower.co.zw%')
    """)

    # Update Quotation for Machinery Exchange
    frappe.db.sql("""
        UPDATE `tabQuotation`
        SET company = 'Machinery Exchange'
        WHERE (company IS NULL OR company = '')
        AND (owner LIKE '%machinery%' OR owner LIKE '%mxg%' OR owner LIKE '%@machinery-exchange.com%' OR owner LIKE '%@mxg.co.zw%')
    """)

    # Update Quotation for Sinopower
    frappe.db.sql("""
        UPDATE `tabQuotation`
        SET company = 'Sinopower'
        WHERE (company IS NULL OR company = '')
        AND (owner LIKE '%sinopower%' OR owner LIKE '%spz%' OR owner LIKE '%sino%' OR owner LIKE '%@sinopower.co.zw%')
    """)

    frappe.db.commit()
    print("Database updated successfully.")
    frappe.destroy()

if __name__ == "__main__":
    execute()
