// Copyright (c) 2022, Percival Rapha and contributors
// For license information, please see license.txt

frappe.ui.form.on('FT HMR Log', {
    refresh: function(frm) {
        $("div.form-sidebar.overlay-sidebar").css("visibility", "hidden");
        if(frm.doc.creation) {
            $("#page-FT\\ HMR\\ Log div.ellipsis.sub-heading.text-muted").html(`Weekly HMR log entry for machine.`);
            frm.page.set_primary_action(__('Goto Machine'), function (){
                frappe.set_route("Form", "FT Machine", frm.doc.machine)
            });
        }
    },

    hmr: function (frm) {
        if (frm.doc.hmr > 0) {
            frm.set_value("op_hours", frm.doc.hmr - frm.doc.hmr_on_log)
        }
    },
    machine: function (frm) {
        if (frm.doc.hmr > 0) {
            frm.set_value("op_hours", frm.doc.hmr - frm.doc.hmr_on_log)
        }
    },
    fuel_consumed: function (frm) {
        if(frm.doc.op_hours > 0){
            frm.set_value("fuel_consumption", frm.doc.fuel_consumed / frm.doc.op_hours);
        }
    },
    op_hours: function (frm) {
        frm.set_value("fuel_consumption", frm.doc.fuel_consumed / frm.doc.op_hours);
    }
});
