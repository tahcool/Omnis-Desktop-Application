// Copyright (c) 2022, Percival Rapha and contributors
// For license information, please see license.txt
/* eslint-disable */

// noinspection JSDuplicatedDeclaration
frappe.query_reports["Fleetrack Machine Summary"] = {
    "filters": [],
    "formatter": function (value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);

        if (column.fieldname.includes('Hours to Service')) {
            let hrs2service = data[column.fieldname];

            if (hrs2service < 1) {
                value = "<span style='background-color:#f02510!important;font-weight:bold; display: block; color: #fff !important; padding-right: 7px !important;border-radius: 3px !important;'>" + value + "</span>";
            }

            if (hrs2service < 100 && hrs2service >= 1) {
                value = "<span style='background-color:#ffc000!important;font-weight:bold; display: block; color: #000 !important;padding-right: 7px !important;border-radius: 3px !important;'>" + value + "</span>";
            }
            if (hrs2service > 100) {
                value = "<span style='display:block; background-color:green!important;font-weight:bold; color: #fff !important;padding-right: 7px !important;border-radius: 3px !important;'>" + value + "</span>";
            }

        }

        return value;
    },

};
