// Copyright (c) 2026, Fleetrack and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["FT Machine Register"] = {
    filters: [
        {
            fieldname: "region",
            label: __("Region"),
            fieldtype: "Link",
            options: "FT Region",
            reqd: 0,
        },
        {
            fieldname: "customer",
            label: __("Customer"),
            fieldtype: "Link",
            options: "Customer",
            reqd: 0,
        },
        {
            fieldname: "status",
            label: __("Status"),
            fieldtype: "Select",
            options: ["", "Active", "Inactive", "Under Maintenance", "Sold", "Scrapped"],
            reqd: 0,
        },
        {
            fieldname: "warranty_status",
            label: __("Warranty Status"),
            fieldtype: "Select",
            options: ["", "Under Warranty", "Out of Warranty", "Extended Warranty"],
            reqd: 0,
        },
    ],
};
