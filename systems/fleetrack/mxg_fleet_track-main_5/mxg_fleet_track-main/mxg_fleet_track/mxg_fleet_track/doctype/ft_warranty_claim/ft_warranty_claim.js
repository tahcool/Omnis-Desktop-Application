// Copyright (c) 2022, Percival Rapha and contributors
// For license information, please see license.txt

frappe.ui.form.on('FT Warranty Claim', {
	refresh: function(frm) {
	    $("div.form-sidebar.overlay-sidebar").css("visibility", "hidden");
	    if (frm.doc.creation){

        }else{
	        frm.page.set_title(__("Create new Warranty Claim"));
	        $("#page-FT\\ Warranty\\ Claim div.ellipsis.sub-heading.text-muted").html(`Fill up the form below to add a claim to the DB.`);
        }
	}
});
