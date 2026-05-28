// Copyright (c) 2023, Percival Rapha and contributors
// For license information, please see license.txt

frappe.ui.form.on("FT SEC Repair", {
  refresh: function (frm) {
    if (!frm.is_new()) {
      frm.events.setup_inventory_actions(frm);
    }
  },
  setup_inventory_actions: function (frm) {
    frm.add_custom_button("Add to Inventory", () => {
      
    }, __("Close Log Entry"));

    frm.add_custom_button("Scrap Component", () => {
      frappe.confirm('Are you sure you want to scrap this component?', () => {
        frm.events.scrap_component(frm);
      });
    }, __("Close Log Entry"));

    // if (frm.doc.end_date) {
    //   const inventoryBtnLabel = __(`Add <b>${frm.doc.part_number}</b> to Inventory`);
    //   frm.page.set_primary_action(inventoryBtnLabel, () => {
    //     frappe.confirm(`Move this item to <b>Part No: ${frm.doc.part_number}</b> inventory?`, () => {
    //       frm.events.trigger_item_inventory_entry(frm).then((doc) => {
    //         frappe.show_alert(
    //           {
    //             message: __(`Fill up the the rest of the fields to complete inventory entry`),
    //             indicator: "yellow",
    //           },
    //           10
    //         );
    //       });
    //     });
    //   });
    // }
  },
  trigger_item_inventory_entry: function (frm) {
    const doc = frm.doc;
    return new Promise((resolve, reject) => {
      frappe
        .new_doc("FT SEC Item", {
          component_reference: doc.component,
          location: doc.location,
          repair_ref: doc.name,
        })
        .then(() => resolve());
    });
  },
  scrap_component(frm) {
    const doc = frm.doc;
    frappe.call({
      method: "mxg_fleet_track.sec.doctype.ft_sec_repair.ft_sec_repair.scrap_component",
      args: { repair: doc.name },
      callback: (r) => {
        if (r.message) {
          frappe.show_alert(
            {
              message: __("Component has been scrapped"),
              indicator: "green",
            },
            10
          );
          frm.reload_doc();
        }
      },
    });
  }
});
