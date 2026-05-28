// Copyright (c) 2022, Percival Rapha and contributors
// For license information, please see license.txt

frappe.ui.form.on('FT Service Log', {
    refresh: function (frm) {
        frm.page.set_primary_action(__('Goto Machine'), function () {
            frappe.set_route("Form", "FT Machine", frm.doc.machine)
        });
        if (frm.doc.creation) {
            $("#page-FT\\ Service\\ Log div.ellipsis.sub-heading.text-muted").html(`<b>${frm.doc.service_type} HOUR</b> Service. Done by ${frm.doc.technician_name}`);
        }
    }
});
