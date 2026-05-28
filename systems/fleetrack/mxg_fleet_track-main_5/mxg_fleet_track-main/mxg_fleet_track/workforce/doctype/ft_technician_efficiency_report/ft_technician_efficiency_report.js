// Copyright (c) 2023, Percival Rapha and contributors
// For license information, please see license.txt

frappe.ui.form.on("FT Technician Efficiency Report", {
  refresh: function (frm) {
    frm.events.hide_sidebar(frm);
    if (!frm.is_new()) {
      frm.events.set_log_fetch_button(frm);
      if (frm.doc.schedule.length) {
        frm.page.set_primary_action(__("PDF Printout"), function () {
          window.open(
            frappe.urllib.get_full_url(
              "/api/method/frappe.utils.print_format.download_pdf?doctype=" +
                encodeURIComponent(frm.doctype) +
                "&name=" +
                encodeURIComponent(frm.doc.name) +
                "&trigger_print=0" +
                "&format=" +
                encodeURIComponent("FT Technician Efficiency Report") +
                "&lang=en"
            )
          );
        });
      }
    }
  },
  hide_sidebar: function (frm) {
    frm.page.sidebar.hide();
  },
  set_log_fetch_button: function (frm) {
    frm.add_custom_button(__("Fetch Logs"), function () {
      frappe.confirm(
        "Are you sure you want to fetch logs? This will clear everything in the schedule below.",
        function () {
          frm.events.do_fetch_logs(frm);
        }
      );
    });
  },
  clear_schedule: function (frm) {
    return new Promise((resolve, reject) => {
      frm.clear_table("schedule");
      resolve();
    });
  },
  set_schedule: function (frm, items) {
    return new Promise((resolve, reject) => {
      items.forEach((item) => {
        const row = frm.add_child("schedule");
        row.technician = item[0];
        row.productive = item[1];
        row.travel = item[2];
        row.admin = item[3];
        row.house_keep = item[4];
        row.non_productive = item[5];
        row.total_billable = item[6];
        row.total_non_billable = item[7];
      });
      frm.refresh_field("schedule");
      resolve();
    });
  },
  do_fetch_logs: function (frm) {
    frappe.call({
      method:
        "mxg_fleet_track.workforce.doctype.ft_technician_efficiency_report.ft_technician_efficiency_report.get_efficiency_report_items",
      args: {
        name: frm.doc.name,
      },
      callback: function (r) {
        if (!r.exc) {
          if (r?.message?.length ?? null) {
            frm.events.clear_schedule(frm).then(() => {
              frm.events.set_schedule(frm, r.message);
            });
          } else {
            frappe.show_alert(
              {
                message: __("No logs found"),
                indicator: "red",
              },
              10
            );
          }
        }
      },
    });
  },
});

frappe.ui.form.on("FT Technician Efficiency Items", {
  billed: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    if ([row.billed, row.total_billable].every((item) => item > 0)) {
      row.efficiency = (row.billed / row.total_billable) * 100 || 0;
      frm.refresh_field("schedule");
    } else {
      row.efficiency = 0;
      frm.refresh_field("schedule");
    }
  },
});
