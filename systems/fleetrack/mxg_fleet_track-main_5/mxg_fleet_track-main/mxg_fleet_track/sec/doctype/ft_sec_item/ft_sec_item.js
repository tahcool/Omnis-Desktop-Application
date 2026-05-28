// Copyright (c) 2023, Percival Rapha and contributors
// For license information, please see license.txt

frappe.ui.form.on("FT SEC Item", {
  refresh: function (frm) {
    $("div.form-sidebar.overlay-sidebar").css("visibility", "hidden");
    if (!frm.is_new()) {
      frm.events.setup_form_title(frm);
      frm.events.setup_inventory_btns(frm);
    }
  },
  setup_form_title: function (frm) {
    const doc = frm.doc;
    if (doc.in_stock) {
      frm.page.set_title(__(`${doc.part_number} [IN STOCK]`));
    } else {
      frm.page.set_title(__(`${doc.part_number} [ISSUED OUT]`));
    }
    $("#page-FT\\ SEC\\ Item div.ellipsis.sub-heading.text-muted").html(`Unique ID: ${doc.name}`);
  },
  setup_inventory_btns: function (frm) {
    frm.page.set_primary_action(`Issue Out`, () => {});
  },
});
