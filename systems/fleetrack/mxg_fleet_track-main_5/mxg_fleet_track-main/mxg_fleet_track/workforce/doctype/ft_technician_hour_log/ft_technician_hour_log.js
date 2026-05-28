// Copyright (c) 2023, Percival Rapha and contributors
// For license information, please see license.txt

frappe.ui.form.on("FT Technician Hour Log", {
  refresh: function (frm) {
    frm.events.hide_sidebar(frm);
    if (!frm.is_new()) {
      frm.events.set_technician_view_button(frm);
    }
  },
  set_technician_view_button: function (frm) {
    frm.page.set_primary_action(__("View <b>Technician</b>"), function () {
      frappe.set_route("Form", "FT Technician", frm.doc.technician);
    });
  },
  hide_sidebar: function (frm) {
    $("div.form-sidebar.overlay-sidebar").css("visibility", "hidden");
  },
});
