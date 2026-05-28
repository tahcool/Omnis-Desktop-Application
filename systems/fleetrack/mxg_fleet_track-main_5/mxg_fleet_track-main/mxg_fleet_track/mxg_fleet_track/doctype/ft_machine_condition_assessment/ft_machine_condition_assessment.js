// Copyright (c) 2023, Percival Rapha and contributors
// For license information, please see license.txt
const SECTION_BREAK = (label = "") => {
  return {
    fieldname: Math.random().toString(36).substring(7),
    fieldtype: "Section Break",
    label,
  };
};

frappe.ui.form.on("FT Machine Condition Assessment", {
  refresh: function (frm) {
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
  clear_checklist_btn: function (frm) {
    frappe.confirm(`Are you sure you want to clear the checklist?`, () => {
      frm.clear_table("checklist");
      frm.refresh_field("checklist");
    });
  },
  load_from_template_btn: function (frm) {
    let dialog = new frappe.ui.Dialog({
      title: __("Load from Template"),
      fields: [
        {
          fieldtype: "Link",
          fieldname: "template",
          label: __("Template"),
          options: "FT Inspection Checklist Template",
          reqd: 1,
        },
      ],
      primary_action_label: __("Load"),
      primary_action(values) {
        frm.events.load_checklist_from_template(frm, values.template);
        dialog.hide();
      },
    });
    dialog.show();
  },

  load_checklist_from_template(frm, template_name) {
    frappe.db
      .get_list("FT Inspection Template Items", {
        filters: {
          parent: template_name,
        },
        fields: ["name", "item"],
        limit: 1000,
      })
      .then((inspectionItems) => {
        inspectionItems.forEach((inspectionItem) => {
          if (
            !frm.doc?.checklist
              ?.map((d) => d.item)
              .includes(inspectionItem.item)
          ) {
            let inspectionItemObj = frm.add_child("checklist");
            inspectionItemObj.item = inspectionItem.item;
            inspectionItemObj.template = template_name;
          }
        });
        frm.refresh_field("checklist");
      });
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
        "mxg_fleet_track.mxg_fleet_track.doctype.ft_machine_condition_assessment.ft_machine_condition_assessment.upload_image",
      freeze_message: __("Uploading image ..."),
      args: {
        image,
        caption,
        mca: frm.doc.name,
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
