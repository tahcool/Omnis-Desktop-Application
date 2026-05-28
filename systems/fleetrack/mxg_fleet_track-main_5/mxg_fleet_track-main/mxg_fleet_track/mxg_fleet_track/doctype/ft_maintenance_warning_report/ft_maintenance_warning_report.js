// Copyright (c) 2023, Percival Rapha and contributors
// For license information, please see license.txt
const SECTION_BREAK = (label = "") => {
  return {
    fieldname: Math.random().toString(36).substring(7),
    fieldtype: "Section Break",
    label,
  };
};

frappe.ui.form.on("FT Maintenance Warning Report", {
  refresh: function (frm) {
    frm.events.set_title(frm);
    if (!frm.is_new()) {
      frm.add_custom_button(
        __("Upload Image"),
        function () {
          frm.events.show_image_upload_dialog(frm);
        },
        __("Image Gallery")
      );
      frm.add_custom_button(
        __("Preview Gallery"),
        function () {},
        __("Image Gallery")
      );
    }
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
      method:
        "mxg_fleet_track.mxg_fleet_track.doctype.upload_image_to_ft_gallery",
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
  set_title(frm) {
    if (!frm.is_new()) {
      if (frm.doc.mwr_mode === "Single Machine") {
        frm.page.set_title(`${frm.doc.name} - Single Machine`);
      } else {
        frm.page.set_title(`${frm.doc.name} - Multiple Machines`);
      }
    }
  },
  onload(frm) {
    frm.set_query("machine", "machines", function (doc, cdt, cdn) {
      return {
        filters: {
          customer: frm.doc.customer,
          name: ["not in", doc.machines.map((m) => m.machine)],
        },
      };
    });
  },
});
