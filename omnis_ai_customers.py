# powerstar_salestrack/api/omnis_ai_customers.py

from __future__ import unicode_literals
import frappe

@frappe.whitelist(allow_guest=True)
def get_customers_by_location(location):
    """
    Finds customers in a specific city or territory.
    """
    if not location:
        return {"error": "Location parameter is required"}

    search_term = f"%{location}%"

    try:
        # We search Customer records where territory matches OR link to Address where city matches
        # The easiest approach is Frappe's ORM or raw SQL. Since standard Frappe `Address` links to `Customer`.
        customers = frappe.db.sql(
            """
            SELECT DISTINCT c.name, c.customer_name, c.customer_group, c.territory
            FROM `tabCustomer` c
            LEFT JOIN `tabDynamic Link` dl ON dl.link_name = c.name AND dl.link_doctype = 'Customer'
            LEFT JOIN `tabAddress` a ON a.name = dl.parent
            WHERE c.docstatus < 2
              AND (
                  c.territory LIKE %s 
                  OR a.city LIKE %s 
                  OR a.country LIKE %s
              )
            LIMIT 50
            """,
            (search_term, search_term, search_term),
            as_dict=True
        )
        return customers
    except Exception as e:
        return {"error": str(e)}
