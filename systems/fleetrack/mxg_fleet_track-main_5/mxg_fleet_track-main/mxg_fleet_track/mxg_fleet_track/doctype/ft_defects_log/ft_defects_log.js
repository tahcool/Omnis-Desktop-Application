// Copyright (c) 2022, Percival Rapha and contributors
// For license information, please see license.txt

frappe.ui.form.on('FT Defects Log', {
    refresh: function (frm) {
        $("div.form-sidebar.overlay-sidebar").css("visibility", "hidden");

        if (frm.doc.creation) {
            frm.page.set_primary_action(__('Goto Machine'), function () {
                frappe.set_route("Form", "FT Machine", frm.doc.machine)
            });

            if (frm.doc.defect_type === "Major") {
                $("#page-FT\\ Defects\\ Log div.ellipsis.sub-heading.text-muted").html(`<b>MDR</b> Entry`);
            } else {
                $("#page-FT\\ Defects\\ Log div.ellipsis.sub-heading.text-muted").html(`<b>GDR</b> Entry`);
            }
        }


    }
});
