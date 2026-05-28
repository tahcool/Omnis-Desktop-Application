// Copyright (c) 2022, Percival Rapha and contributors
// For license information, please see license.txt

frappe.ui.form.on('Fleetrack Settings', {
    refresh: function (frm) {
        $("div.form-sidebar.overlay-sidebar").css("visibility", "hidden");
        $("#page-Fleetrack\\ Settings div.ellipsis.sub-heading.text-muted").html(`Manage how <b>Fleetrack&trade;</b> works.`);
        if (frappe.user.has_role("System Manager")) {
            frm.add_custom_button(__("Upload <b>Fleetrack&trade;</b> Data"), () => {
                let d = new frappe.ui.Dialog({
                    title: `<b>Fleetrack&trade;</b> initial data upload`,
                    fields: [
                        {
                            label: "Master Data",
                            fieldname: 'master_file',
                            fieldtype: 'Link',
                            options: "File",
                            reqd: 1,
                        }
                    ],
                    primary_action_label: 'Upload',
                    primary_action(args) {
                        d.hide();
                        frappe.confirm(__("Confirm data upload?"), function () {
                            frappe.call({
                                method: "mxg_fleet_track.mxg_fleet_track.doctype.fleetrack_settings.fleetrack_settings.upload_data",
                                freeze_message: __("Uploading data ..."),
                                args: {master_file: args.master_file},
                                freeze: true,
                                callback: function (r) {
                                }
                            }).done(() => {
                                frappe.show_alert({
                                    message: __(`Data upload done.`),
                                    indicator: 'orange'
                                }, 10);
                                frm.refresh_fields();
                            });
                        })
                    }
                });
                d.show();
            }, __("Tasks"));

            frm.add_custom_button(__("Wipe <b>Fleetrack&trade;</b> Data"), () => {
                let d = new frappe.ui.Dialog({
                    title: `Wiping <b>Fleetrack&trade;</b> Data`,
                    fields: [
                        {
                            label: "Type in <b>'Wipe Data'</b> to confirm",
                            fieldname: 'confirm',
                            fieldtype: 'Data',
                            bold: 1,
                        }
                    ],
                    primary_action_label: 'Wipe Data',
                    primary_action(args) {
                        if (args.confirm !== "Wipe Data") {
                            frappe.throw(__("Confirmation failed!"));
                        }

                        d.hide();

                        frappe.confirm(__("Are you sure to wipe all system Data?"), function () {
                            frappe.call({
                                method: "mxg_fleet_track.mxg_fleet_track.doctype.fleetrack_settings.fleetrack_settings.wipe_data",
                                freeze_message: __("Wiping data ..."),
                                args: {},
                                freeze: true,
                                callback: function (r) {
                                }
                            }).done(() => {
                                frappe.show_alert({
                                    message: __(`All system data wiped successfully`),
                                    indicator: 'orange'
                                }, 10);
                                frm.refresh_fields();
                            });
                        })
                    }
                });
                d.show();
            }, __("Tasks"));
        }
    },
    dasr_1st: function(frm) {
        frm.set_df_property("dasr_1st", "label", `0 - ${frm.doc.dasr_1st} days`)
        frm.set_df_property("dasr_2nd", "label", `${frm.doc.dasr_1st + 1} - days`)
    },
    dasr_2nd: function(frm) {
        frm.set_df_property("dasr_2nd", "label", `${frm.doc.dasr_1st + 1} - ${frm.doc.dasr_2nd} days`)
        frm.set_df_property("dasr_3rd", "label", `${frm.doc.dasr_2nd + 1} - days`)
    },
    dasr_3rd: function(frm) {
        frm.set_df_property("dasr_3rd", "label", `${frm.doc.dasr_2nd + 1} - ${frm.doc.dasr_3rd} days`)
        frm.set_df_property("dasr_4th", "label", `${frm.doc.dasr_3rd + 1} - days`)
    },
    dasr_4th: function(frm) {
        frm.set_df_property("dasr_4th", "label", `${frm.doc.dasr_3rd + 1} - ${frm.doc.dasr_4th} days`)
    },
    basr_1st: function(frm) {
        frm.set_df_property("basr_1st", "label", `0 - ${frm.doc.basr_1st} days`)
        frm.set_df_property("basr_2nd", "label", `${frm.doc.basr_1st + 1} - days`)
    },
    basr_2nd: function(frm) {
        frm.set_df_property("basr_2nd", "label", `${frm.doc.basr_1st + 1} - ${frm.doc.basr_2nd} days`)
        frm.set_df_property("basr_3rd", "label", `${frm.doc.basr_2nd + 1} - days`)
    },
    basr_3rd: function(frm) {
        frm.set_df_property("basr_3rd", "label", `${frm.doc.basr_2nd + 1} - ${frm.doc.basr_3rd} days`)
        frm.set_df_property("basr_4th", "label", `${frm.doc.basr_3rd + 1} - days`)
    },
    basr_4th: function(frm) {
        frm.set_df_property("basr_4th", "label", `${frm.doc.basr_3rd + 1} - ${frm.doc.basr_4th} days`)
    },
});
