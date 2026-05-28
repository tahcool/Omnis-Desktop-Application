// Copyright (c) 2022, Percival Rapha and contributors
// For license information, please see license.txt

frappe.ui.form.on("FT Customer", {
  before_load: (frm) => {},
  refresh: function (frm) {
    $("div.form-sidebar.overlay-sidebar").css("visibility", "hidden");
    if (!frm.is_new()) {
      frm.events.setup_maintenance_warning_btn(frm);
      frm.events.setup_report_view_button(frm);

      frm.page.set_primary_action(__("List <b>Machines</b>"), function () {
        frappe.set_route("List", "FT Machine", { customer: frm.doc.name });
      });

      $("#page-FT\\ Customer div.ellipsis.sub-heading.text-muted").html(
        `Customer Record. Click on name, fill both fields to change it.`
      );
    } else {
      frm.page.set_title(__("Add new Customer record"));
      $("#page-FT\\ Customer div.ellipsis.sub-heading.text-muted").html(
        `Enter customer name & contact details`
      );
    }
    frm.add_custom_button(__("Back to <b>Customer List</b>"), function () {
      frappe.set_route("List", "FT Customer");
    });
  },
  setup_report_view_button: function (frm) {
    if (frm.doc.on_fleetrack === "Yes") {
      frm.add_custom_button(
        __("Fleetrack&trade; <b>Report</b>"),
        function () {
          window.open(
            frappe.urllib.get_full_url(
              "/printview?doctype=" +
                encodeURIComponent(frm.doctype) +
                "&name=" +
                encodeURIComponent(frm.doc.name) +
                "&trigger_print=0" +
                "&format=" +
                encodeURIComponent("Fleetrack Report")
            )
          );
        },
        __("View")
      );
    }
  },
  setup_maintenance_warning_btn: function (frm) {
    frm.add_custom_button(
      __("New Maintance Warning Report"),
      function () {
        frappe.new_doc("FT Maintenance Warning Report", {
          customer: frm.doc.name,
          mwr_mode: "Multiple Machines",
        });
        frappe.show_alert(
          {
            message: __(
              "New FT Maintenance Warning Report (Multiple Machines) created. Fill in the rest :)"
            ),
          },
          10
        );
      },
      __("New Report")
    );
    frm.add_custom_button(
      __("New FT. Monthly Report"),
      function () {
        frappe.prompt(
          [
            {
              label: "From",
              fieldname: "date_from",
              fieldtype: "Date",
              reqd: 1,
            },
            {
              label: "Until",
              fieldname: "date_to",
              fieldtype: "Date",
              reqd: 1,
            },
          ],
          (values) => {
            if (!values) return;
            if (values.date_from > values.date_to) {
              frappe.msgprint("Date 'From' must be before 'Until' date");
              return;
            }

            frappe.new_doc("FT Monthly Report", {
              customer: frm.doc.name,
              date_from: values.date_from,
              date_to: values.date_to,
            });
            frappe.show_alert(
              {
                message: __(
                  "Save document to pull machine data and fill in the rest :)"
                ),
              },
              10
            );
          }
        );
      },
      __("New Report")
    );
  },
});
