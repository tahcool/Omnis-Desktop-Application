// Copyright (c) 2023, Percival Rapha and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Technician Efficiency Report"] = {
  filters: [
    {
      fieldname: "technician",
      label: __("Technician"),
      fieldtype: "Link",
      options: "FT Technician",
    },
    {
      fieldname: "from_date",
      label: __("From Date"),
      fieldtype: "Date",
      default: frappe.datetime.add_months(frappe.datetime.get_today(), -1),
    },
    {
      fieldname: "to_date",
      label: __("To Date"),
      fieldtype: "Date",
      default: frappe.datetime.get_today(),
    },
  ],
};
