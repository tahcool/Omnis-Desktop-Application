// Copyright (c) 2022, Percival Rapha and contributors
// For license information, please see license.txt

frappe.ui.form.on('FT Machine Type', {
    refresh: function (frm) {
        if (frm.doc.creation) {
            $("#page-FT\\ Machine\\ Type div.ellipsis.sub-heading.text-muted").html(`Type name: <b>${frm.doc.type_name}</b>. Click on bold name to update`);

            frm.page.set_primary_action(__("View Machines"), () => {
               frappe.set_route("List", "FT Machine", {"type": frm.doc.name})
            });
        } else {
            $("#page-FT\\ Machine\\ Type div.ellipsis.sub-heading.text-muted").html(`Enter new Machine Type details`);
        }
    }
});
