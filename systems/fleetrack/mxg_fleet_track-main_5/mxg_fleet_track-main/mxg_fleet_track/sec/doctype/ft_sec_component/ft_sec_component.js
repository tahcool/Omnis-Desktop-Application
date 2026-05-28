// Copyright (c) 2023, Percival Rapha and contributors
// For license information, please see license.txt

frappe.ui.form.on("FT SEC Component", {
  refresh: function (frm) {
    frappe.db.count("FT SEC Item", { filters: { component_reference: frm.doc.name, in_stock: 1 } }).then((count) => {
      frm.events.setup_inventory_label(frm, count);
    });
  },

  setup_inventory_label: function (frm, inventory) {
    //set df option for inventory field (HTML)
    const label = `
		<h3>In Stock - ${inventory}</h3>
	`;

    frm.set_df_property("inventory", "options", label);
  },
});
