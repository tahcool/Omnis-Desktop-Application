// Copyright (c) 2023, Percival Rapha and contributors
// For license information, please see license.txt
//

const SECTION_BREAK = (label = "") => {
  return {
    fieldname: Math.random().toString(36).substring(7),
    fieldtype: "Section Break",
    label,
  };
};
const COLUMN_BREAK = (name = Math.random().toString(36).substring(7)) => {
  return {
    fieldname: name,
    fieldtype: "Column Break",
  };
};
frappe.ui.form.on("FT JRV", {
  refresh: function (frm) {
    if (!frm.is_new()) {
      frm.events.setup_image_gallery(frm);
    }
  },

  pick_description_from(frm) {
    let dialog = new frappe.ui.Dialog({
      title: __("Pick Description From"),
      fields: [
        {
          fieldname: "pick_description_from",
          fieldtype: "Link",
          options: "DocType",
          label: __("Pick Description From"),
          reqd: 1,
          get_query: function () {
            return {
              filters: {
                name: ["in", ["FT Defects Log", "FT Breakdown Log"]],
              },
            };
          },
        },
        COLUMN_BREAK(),
        {
          fieldname: "pick_description_from_name",
          fieldtype: "Dynamic Link",
          options: "pick_description_from",
          label: __("Pick Description From Name"),
          reqd: 1,
          get_query() {
            return {
              filters: {
                machine: frm.doc.machine,
                end_date: ["is", "not set"],
              },
            };
          },
        },
      ],
      primary_action_label: __("Pick"),
      primary_action(values) {
        frappe.db
          .get_doc(values.pick_description_from, values.pick_description_from_name)
          .then((doc) => {
            let newDesc = frm.add_child("detailed_description");
            newDesc.description = doc.description;
            newDesc.type = values.pick_description_from == "FT Defect Log" ? "Defect" : "Breakdown";
            frm.refresh_field("detailed_description");
          })
          .finally(() => {
            dialog.hide();
          });
      },
    });
    dialog.show();
  },

  setup_image_gallery(frm) {
    frm.add_custom_button(
      __("Upload Image"),
      function () {
        frm.events.show_image_upload_dialog(frm);
      },
      __("Image Gallery")
    );
    frm.add_custom_button(__("Preview Gallery"), function () {}, __("Image Gallery"));
  },
  show_image_upload_dialog(frm) {
    let dialog = new frappe.ui.Dialog({
      title: __("Upload Image"),
      fields: [
        {
          fieldname: "caption",
          fieldtype: "Data",
          label: __("Caption"),
          reqd: 1,
        },
        SECTION_BREAK(),
        {
          fieldtype: "Attach Image",
          fieldname: "image",
          label: __("Image"),
          reqd: 1,
        },
      ],
      primary_action_label: __("Upload"),
      primary_action(values) {
        frm.events.upload_image(frm, values.image, values.caption);
        dialog.hide();
      },
    });
    dialog.show();
  },
  upload_image(frm, image, caption) {
    frappe.call({
      method: "mxg_fleet_track.mxg_fleet_track.doctype.upload_image_to_ft_gallery",
      freeze_message: __("Uploading image ..."),
      args: {
        image,
        caption,
        reference_name: frm.doc.name,
        reference_type: frm.doc.doctype,
      },
      freeze: true,
      freeze_message: __("Uploading image ..."),
      callback: function (r) {
        frm.reload_doc();
        console.log(r);
      },
    });
  },
});
