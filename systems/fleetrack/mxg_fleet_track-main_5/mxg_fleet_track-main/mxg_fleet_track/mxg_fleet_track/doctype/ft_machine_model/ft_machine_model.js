// Copyright (c) 2022, Percival Rapha and contributors
// For license information, please see license.txt

frappe.ui.form.on('FT Machine Model', {
    refresh: function (frm) {
        $("div.form-sidebar.overlay-sidebar").css("visibility", "hidden");
        if (frm.doc.creation) {
            $("#page-FT\\ Machine\\ Model div.ellipsis.sub-heading.text-muted").html(`Model name: <b>${frm.doc.name}</b>. Click on bold name to update`);
            frm.page.set_primary_action(__("View Machines"), () => {
               frappe.set_route("List", "FT Machine", {"model": frm.doc.name})
            });
        } else {
            $("#page-FT\\ Machine\\ Model div.ellipsis.sub-heading.text-muted").html(`Enter new Machine Model details`);
        }
    }
});
