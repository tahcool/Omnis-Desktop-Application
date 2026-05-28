// Copyright (c) 2022, Percival Rapha and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Major Defects Report (MDR)"] = {
  filters: [
    {
      fieldname: "region",
      label: __("Region"),
      fieldtype: "Link",
      options: "FT Region",
      reqd: 1,
    },
  ],
};
