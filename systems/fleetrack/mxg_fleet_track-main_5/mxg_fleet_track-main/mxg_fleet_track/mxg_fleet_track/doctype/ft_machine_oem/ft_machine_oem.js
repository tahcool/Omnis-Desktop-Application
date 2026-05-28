// Copyright (c) 2022, Percival Rapha and contributors
// For license information, please see license.txt

frappe.ui.form.on('FT Machine OEM', {
    refresh: function (frm) {
        if (frm.doc.creation) {
            $("#page-FT\\ Machine\\ OEM div.ellipsis.sub-heading.text-muted").html(`OEM name: <b>${frm.doc.oem}</b>. Click on bold name to update`);

            frm.page.set_primary_action(__("View Models"), () => {
               frappe.set_route("List", "FT Machine Model", {"oem": frm.doc.name})
            });
        } else {
        	$("#page-FT\\ Machine\\ OEM div.ellipsis.sub-heading.text-muted").html(`Enter new OEM details`);
        }
    }
});
