// Copyright (c) 2023, Percival Rapha and contributors
// For license information, please see license.txt

frappe.ui.form.on("FT Monthly Report", {
  refresh: function (frm) {
    if (!frm.is_new()) {
      frm.add_custom_button(__("Reset Report"), function () {
        frm.events.do_reset_report(frm);
      });
      frm.add_custom_button(__("Calc. Metrics"), function () {
        frm.events.do_report_calc(frm);
      });
      frm.add_custom_button(
        __("Regenerate Util. Graphs"),
        function () {
          frm.events.do_regenerate_utilization_graph(frm);
        },
        "Visuals"
      );
      frm.add_custom_button(__("PDF Printout"), function () {
        frm.events.do_pdf_printout(frm);
      });
    }
  },
  do_pdf_printout: function (frm) {
    window.open(
      frappe.urllib.get_full_url(
        "/api/method/frappe.utils.print_format.download_pdf?doctype=" +
          encodeURIComponent(frm.doctype) +
          "&name=" +
          encodeURIComponent(frm.doc.name) +
          "&trigger_print=0" +
          "&format=" +
          encodeURIComponent("FT Monthly Report")
      )
    );
  },
  do_reset_report: function (frm) {
    //run frappe.call to method (mxg_fleet_track.mxg_fleet_track.doctype.ft_monthly_report.ft_monthly_report.reset_ft_monthly_report) supplying only the report_name
    frappe.call({
      method: "mxg_fleet_track.mxg_fleet_track.doctype.ft_monthly_report.ft_monthly_report.reset_ft_monthly_report",
      args: {
        report_name: frm.doc.name,
      },
      callback: function (r) {
        //if successful, refresh the form
        if (r.message) {
          frappe.show_alert({
            message: __("Report has been reset"),
            indicator: "green",
          });
          frm.reload_doc();
        }
      },
    });
  },
  do_report_calc: function (frm) {
    // run_ft_monthly_report_calc
    //run frappe.call to method (mxg_fleet_track.mxg_fleet_track.doctype.ft_monthly_report.ft_monthly_report.reset_ft_monthly_report) supplying only the report_name
    frappe.call({
      method: "mxg_fleet_track.mxg_fleet_track.doctype.ft_monthly_report.ft_monthly_report.run_ft_monthly_report_calc",
      args: {
        report_name: frm.doc.name,
      },
      callback: function (r) {
        //if successful, refresh the form
        if (r.message) {
          frappe.show_alert({
            message: __("Report calc. done"),
            indicator: "green",
          });
          frm.reload_doc();
        }
      },
    });
  },
  do_regenerate_utilization_graph: function (frm) {
    //run frappe.call to method (mxg_fleet_track.mxg_fleet_track.doctype.ft_monthly_report.ft_monthly_report.regenerate_utilization_graph) supplying only the report_name
    frappe.call({
      method:
        "mxg_fleet_track.mxg_fleet_track.doctype.ft_monthly_report.ft_monthly_report.regenerate_utilization_graph",
      args: {
        report_name: frm.doc.name,
      },
      callback: function (r) {
        //if successful, refresh the form
        if (r.message) {
          frappe.show_alert({
            message: __("Utilization Graph has been regenerated"),
            indicator: "green",
          });
          frm.reload_doc();
        }
      },
    });
  },
  validate: function (frm) {
    if (frm.doc.date_from > frm.doc.date_to) {
      frappe.msgprint("Date 'From' must be before 'Until' date");
      validated = false;
    }
  },
});
