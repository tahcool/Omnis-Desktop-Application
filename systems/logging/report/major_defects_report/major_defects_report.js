// Copyright (c) 2023, Bytes & Bots and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Major Defects Report"] = {
  filters: [
    {
      fieldname: "region",
      label: __("Region"),
      fieldtype: "Link",
      options: "PT Region",
      reqd: 1,
    },
  ],
};
