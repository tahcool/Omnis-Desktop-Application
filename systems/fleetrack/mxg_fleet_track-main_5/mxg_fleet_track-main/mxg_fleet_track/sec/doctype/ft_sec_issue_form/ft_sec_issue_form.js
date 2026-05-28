// Copyright (c) 2023, Percival Rapha and contributors
// For license information, please see license.txt

frappe.ui.form.on("FT SEC Issue Form", {
  setup: function (frm) {
    frm.set_query("item_reference", "items_ref", function (doc, cdt, cdn) {
      let mainDoc = frm.doc;
      return {
        filters: {
          in_stock: 1,
          component_reference: mainDoc.component_name,
        },
      };
    });
  },
});

// frappe.ui.form.on("FT SEC Issue Items", {
//   setup: function (frm) {
//     frm.set_query("item_reference", "items_ref", function (doc, cdt, cdn) {
//       let row = locals[cdt][cdn];
//       let mainDoc = frm.doc;
//       return {
//         filters: {
//           in_stock: 1,
//           component_reference: mainDoc.component_name,
//         },
//       };
//     });
//   },
// });
