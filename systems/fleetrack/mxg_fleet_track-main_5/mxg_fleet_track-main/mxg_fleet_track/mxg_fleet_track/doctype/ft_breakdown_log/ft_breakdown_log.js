// Copyright (c) 2022, Percival Rapha and contributors
// For license information, please see license.txt
/*



Engine HRS (from HMR Log) Largest - Smallest (+ own data field)
Total Running (sum of HMR)
BD Hours - Less than shift duration

On close BD - add new field BD Duration (0-3hrs, 3 - 6, 6 -9. 9 -12, 12, 2 days, 3 days, 4 days, 5 days, 6 days, 7 +  ==> + actual hour field Formula: (No of days * shift duration (12) only for day+)
Shift Duration => New field under HMR on Machine (set per machine on report - 12 as default)
Idling - manual (default: 0.0)

Add option to use Weekday Count or Default total (Until - From) - On report

Loads, Tonnes (Manual) - Fill N/A for 0 values

STD Fuel Consumption (Per Machine/Model - Light Duty, Moderate & heavy duty) 

New Machine welcome report (add field for status) N/A, Yes, No, add another for specifying if sending is needed


*/

const durationOptions = ["0-3 hrs", "3-6 hrs", "6-9 hrs", "9-12 hrs"];

const getDayCount = (starts, ends) => {
  const startsDate = new Date(starts);
  const endsDate = new Date(ends);
  const diffTime = Math.abs(endsDate - startsDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const getFilteredDurationOptions = (frm, close_date, dialog) => {
  const start_date = new Date(frm.doc.breakdown_date);
  const end_date = new Date(close_date);

  let filteredDurationOptions = [];

  const diffDays = getDayCount(start_date, end_date);

  if (diffDays > 0) {
    // set options for duration
    durationOptions.forEach((option) => {
      if (option.includes("days")) {
        const dayCount = parseInt(option.split(" ")[0]);
        if (diffDays < 7) {
          filteredDurationOptions.push(option);
        } else if (diffDays >= 7 && dayCount >= 7) {
          filteredDurationOptions.push(option);
        }
      }
    });
  } else {
    filteredDurationOptions = [];
    durationOptions.forEach((option) => {
      if (!option.includes("days")) {
        filteredDurationOptions.push(option);
      }
    });
  }
  return filteredDurationOptions;
};

frappe.ui.form.on("FT Breakdown Log", {
  refresh: function (frm) {
    frm.page.set_primary_action(__("Goto Machine"), function () {
      frappe.set_route("Form", "FT Machine", frm.doc.machine);
    });
    if (!frm.is_new()) {
      frm.events.set_close_actions(frm);
    }
  },
  set_close_actions: function (frm) {
    if (!frm.doc.end_date) {
      frm.add_custom_button(__("Close BD Entry"), function () {
        frm.events.show_close_bd_dialog(frm);
      });
    }
  },
  show_close_bd_dialog: function (frm) {
    let dialog = new frappe.ui.Dialog({
      title: __("Close BD Entry"),
      fields: [
        {
          fieldname: "Sec_1",
          label: __(""),
          fieldtype: "Section Break",
        },
        {
          fieldname: "start_date",
          label: __("BD Date"),
          fieldtype: "Date",
          read_only: 1,
        },
        {
          fieldname: "col_1",
          label: __(""),
          fieldtype: "Column Break",
        },
        {
          fieldname: "close_date",
          label: __("Close Date"),
          fieldtype: "Date",
          reqd: 1,
          default: frappe.datetime.nowdate(),
          onchange: function () {
            let dayCount = getDayCount(frm.doc.breakdown_date, this.value || frappe.datetime.nowdate());
            dialog.set_value("day_count", dayCount);
            dialog.fields_dict.day_count.refresh();
          },
        },
        {
          fieldname: "Sec_1",
          label: __(""),
          fieldtype: "Section Break",
        },
        {
          fieldname: "day_count",
          label: __("Day Count"),
          fieldtype: "Int",
          mandatory_depends_on: "eval:doc.duration == '7 +days'",
          onchange: function () {
            let bd_duration_hrs = 12 * this.value;

            dialog.set_value("bd_duration", bd_duration_hrs);

            dialog.fields_dict.bd_duration.refresh();
          },
        },
        {
          fieldname: "col_1",
          label: __(""),
          fieldtype: "Column Break",
        },
        {
          fieldname: "test1",
          label: __("Estimated BD Duration"),
          fieldtype: "Select",
          depends_on: "eval:!doc.day_count",
          mandatory_depends_on: "eval:!doc.day_count",
          options: durationOptions.join("\n"),
          onchange: function () {
            let bd_duration_hrs = 0;
            if (this.value) {
              bd_duration_hrs = parseInt(this.value.split(" ")[0].split("-")[1]);
            }
            dialog.set_value("bd_duration", bd_duration_hrs);

            dialog.fields_dict.bd_duration.refresh();
          },
        },
        {
          fieldname: "bd_duration",
          label: __("Breakdown Duration (hrs)"),
          fieldtype: "Int",
          reqd: 1,
          read_only: 1,
        },
      ],
      primary_action: function (args) {
        if (!args) return;
        console.log("args : ", args);

        frm.set_value({ end_date: args.close_date, bd_duration: args.bd_duration }).then(() => {
          frm.save().then(() => {
            frappe.confirm(`Are you sure you want to close this BD Entry?`, function () {
              dialog.hide();
              frm.reload_doc();
            });
          });
        });
      },
    });

    let daysElapsed = getDayCount(frm.doc.breakdown_date, frappe.datetime.nowdate());

    dialog.set_values({ day_count: daysElapsed, start_date: frm.doc.breakdown_date });
    dialog.fields_dict.day_count.refresh();

    dialog.show();
  },
});
