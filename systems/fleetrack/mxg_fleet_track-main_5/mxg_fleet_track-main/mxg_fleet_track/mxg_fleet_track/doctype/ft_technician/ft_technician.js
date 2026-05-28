// Copyright (c) 2022, Percival Rapha and contributors
// For license information, please see license.txt

frappe.ui.form.on("FT Technician", {
  refresh: function (frm) {
    frm.events.hide_sidebar(frm);
    if (!frm.is_new()) {
      frm.events.set_hour_log_buttons(frm);
      frm.events.set_report_buttons(frm);
    }
  },
  set_hour_log_buttons: function (frm) {
    frm.page.set_primary_action(__("Create <b>Hour Log</b>"), function () {
      frappe.new_doc("FT Technician Hour Log", {
        technician: frm.doc.name,
      });
    });
    frm.add_custom_button(__("Hour Log"), function () {
      frappe.set_route("List", "FT Technician Hour Log", {
        technician: frm.doc.name,
      });
    });
  },
  set_report_buttons: function (frm) {
    frm.page.set_secondary_action(
      __("New <b>Tech. Efficiency Report</b>"),
      () => {
        frappe.new_doc("FT Technician Efficiency Report", {});
        frappe.show_alert(
          {
            message: __("Fill in the rest of required fields and save"),
            indicator: "green",
          },
          10
        );
      }
    );
  },
  hide_sidebar: function (frm) {
    $("div.form-sidebar.overlay-sidebar").css("visibility", "hidden");
  },
});
