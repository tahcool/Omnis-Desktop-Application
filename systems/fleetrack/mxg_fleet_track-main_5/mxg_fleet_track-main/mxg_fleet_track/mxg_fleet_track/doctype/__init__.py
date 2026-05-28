import frappe


class MachineStateMixin:
    @classmethod
    def get_state(cls, hours_to_service):
        """
        if (frm.doc.hours_remaining_to_service < 1) {
          // Red
          $("#page-FT\\ Machine div.layout-main-section div.form-page").css(
            "border-top",
            "10px solid red"
          );
            return "SERVICE DUE";
        } else if (
          frm.doc.hours_remaining_to_service >= 1 &&
          frm.doc.hours_remaining_to_service < 100
        ) {
          // Orange
          $("#page-FT\\ Machine div.layout-main-section div.form-page").css(
            "border-top",
            "10px solid orange"
          );
          return "NEAR SERVICE";
        } else {
          // green
          $("#page-FT\\ Machine div.layout-main-section div.form-page").css(
            "border-top",
            "10px solid green"
          );

          return "GOOD";
        }

        """
        if hours_to_service < 1:
            return "SERVICE DUE"
        elif hours_to_service >= 1 and hours_to_service < 100:
            return "NEAR SERVICE"
        else:
            return "GOOD"


@frappe.whitelist()
def upload_image_to_ft_gallery(image, caption, reference_name, reference_type):
    gallery_entry = frappe.get_doc(
        {
            "doctype": "FT Image Gallery",
            "image": image,
            "caption": caption,
            "reference_doctype": reference_type,
            "reference_name": reference_name,
        }
    )
    gallery_entry.insert()
    return gallery_entry.name
