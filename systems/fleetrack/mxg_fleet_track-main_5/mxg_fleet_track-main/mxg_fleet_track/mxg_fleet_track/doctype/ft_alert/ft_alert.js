// Copyright (c) 2022, Percival Rapha and contributors
// For license information, please see license.txt

frappe.ui.form.on('FT Alert', {
    refresh: function (frm) {
        // $("div.form-sidebar.overlay-sidebar").css("visibility", "hidden");

        frappe.breadcrumbs.clear();
        frappe.breadcrumbs.set_custom_breadcrumbs({
            "route": "/app/ft-alert",
            "label": "Alerts"
        });
        frappe.breadcrumbs.set_custom_breadcrumbs({
            "route": "javascript:void(0)",
            "label": frm.doc.name
        });

        if (frm.doc.creation) {
            if ((frappe.user.has_role("MXG-CONTROLLER") || frappe.user.has_role("System Manager")) && frm.doc.status === "Pending") {
                frm.add_custom_button(__("Dismiss"), () => {
                    frappe.confirm(__("Dismiss this alert?"), function () {
                        frappe.call({
                            method: "mxg_fleet_track.mxg_fleet_track.doctype.ft_alert.ft_alert.clear",
                            freeze_message: __("Clearing alert ..."),
                            args: {
                                "name": frm.doc.name,
                            },
                            freeze: true,
                            callback: function (r) {
                                if (!r.exc) {
                                    d.hide();
                                }
                            }
                        }).done(() => {
                            frappe.show_alert({
                                message: __(`Alert cleared.`),
                                indicator: 'green'
                            }, 10);
                            frm.reload_doc();
                        });
                    })
                })
            }
            frm.page.set_primary_action(__('Goto Machine'), function () {
                frappe.set_route("Form", "FT Machine", frm.doc.machine)
            });
            frm.page.set_title(`${frm.doc.alert_type} - ${frm.page.title}`);

            if (frm.doc.alert_type === "Quote Alert" && frm.doc.status === "Pending") {
                let QDLable = __("&plus; Quote Details");
                frm.add_custom_button(QDLable, function () {
                    let d = new frappe.ui.Dialog({
                        title: `Enter Quote No. for <b>${frm.doc.on_service_type} HOUR Service</b>`,
                        fields: [
                            {
                                label: 'Customer',
                                fieldname: 'customer',
                                fieldtype: 'Data',
                                read_only: 1,
                                bold: 1,
                            },
                            {
                                label: '',
                                fieldname: 'sec_br2',
                                fieldtype: 'Section Break',
                                hide_border: 1,
                            },
                            {
                                label: 'SRN',
                                fieldname: 'machine_sn',
                                fieldtype: 'Data',
                                reqd: 1,
                                read_only: 1,
                                bold: 1,
                            },
                            {
                                label: 'Service Type',
                                fieldname: 'service_type',
                                fieldtype: 'Float',
                                read_only: 1,
                                precision: 2,
                                bold: 1,
                            },
                            {
                                fieldname: 'col_1',
                                fieldtype: 'Column Break'
                            },
                            {
                                label: 'Machine',
                                fieldname: 'machine',
                                fieldtype: 'Data',
                                read_only: 1,
                            },
                            {
                                label: 'Quote No',
                                fieldname: 'quote_no',
                                fieldtype: 'Data',
                                reqd: 1,

                            },
                        ],
                        primary_action_label: 'Submit',
                        primary_action(args) {
                            frappe.confirm(__("Are you sure to update quote number on this alert?"), function () {
                                frappe.call({
                                    method: "mxg_fleet_track.mxg_fleet_track.doctype.ft_alert.ft_alert.update_quote",
                                    freeze_message: __("Updating quotation info ..."),
                                    args: {
                                        "name": frm.doc.name,
                                        "quote_no": args.quote_no,
                                    },
                                    freeze: true,
                                    callback: function (r) {
                                        if (!r.exc) {
                                            d.hide();
                                        }
                                    }
                                }).done(() => {
                                    frappe.show_alert({
                                        message: __(`Quotation information updated for <b>${frm.doc.on_service_type} HOUR Service</b>`),
                                        indicator: 'green'
                                    }, 10);
                                    frm.reload_doc();
                                });
                            })
                        }
                    });
                    d.set_values({
                        'machine_sn': frm.doc.machine,
                        'machine': frm.doc.model + " [" + frm.doc.type + "]",
                        'customer': frm.doc.customer,
                        'service_type': frm.doc.on_service_type,
                    });
                    d.show();
                })
                frm.page.inner_toolbar.find(`[data-label="${encodeURIComponent(QDLable)}"]`)
                    .removeClass("btn-default")
                    .addClass("btn-danger");
            }

            if (frm.doc.alert_type === "Quote Follow Up" && frm.doc.status === "Pending") {
                let QDLable = __(`&check; Follow Up`);
                frm.add_custom_button(QDLable, function () {
                    let d = new frappe.ui.Dialog({
                        title: `Quote follow up confirmation for <b>${frm.doc.on_service_type} HOUR Service</b>`,
                        fields: [
                            {
                                label: 'Customer',
                                fieldname: 'customer',
                                fieldtype: 'Data',
                                read_only: 1,
                                bold: 1,
                            },
                            {
                                label: '',
                                fieldname: 'sec_br2',
                                fieldtype: 'Section Break',
                                hide_border: 1,
                            },
                            {
                                label: 'SRN',
                                fieldname: 'machine_sn',
                                fieldtype: 'Data',
                                reqd: 1,
                                read_only: 1,
                                bold: 1,
                            },
                            {
                                label: 'Service Type',
                                fieldname: 'service_type',
                                fieldtype: 'Float',
                                read_only: 1,
                                precision: 2,
                                bold: 1,
                            },
                            {
                                fieldname: 'col_1',
                                fieldtype: 'Column Break'
                            },
                            {
                                label: 'Machine',
                                fieldname: 'machine',
                                fieldtype: 'Data',
                                read_only: 1,
                            },
                            {
                                label: 'Confirm Quote No.',
                                fieldname: 'quote_no',
                                fieldtype: 'Data',
                                reqd: 1,

                            },
                        ],
                        primary_action_label: 'Submit',
                        primary_action(args) {
                            frappe.confirm(__("Confirm follow up done for this alert?"), function () {
                                frappe.call({
                                    method: "mxg_fleet_track.mxg_fleet_track.doctype.ft_alert.ft_alert.qfu_done",
                                    freeze_message: __("Updating alert ..."),
                                    args: {
                                        "name": frm.doc.name,
                                        "quote_no": args.quote_no,
                                    },
                                    freeze: true,
                                    callback: function (r) {
                                        if (!r.exc) {
                                            d.hide();
                                        }
                                    }
                                }).done(() => {
                                    frappe.show_alert({
                                        message: __(`Quote follow up alert marked as done for <b>${frm.doc.on_service_type} HOUR Service</b>`),
                                        indicator: 'green'
                                    }, 10);
                                    frm.reload_doc();
                                });
                            })
                        }
                    });
                    d.set_values({
                        'machine_sn': frm.doc.machine,
                        'machine': frm.doc.model + " [" + frm.doc.type + "]",
                        'customer': frm.doc.customer,
                        'service_type': frm.doc.on_service_type,
                    });
                    d.show();
                })
                frm.page.inner_toolbar.find(`[data-label="${encodeURIComponent(QDLable)}"]`)
                    .removeClass("btn-default")
                    .addClass("btn-success");
            }

            if (frm.doc.alert_type === "HMR Alert") {
                $("div.form-sidebar.overlay-sidebar").css("visibility", "hidden");
                if (frm.doc.status === "Pending") {
                    $("#page-FT\\ Alert div.ellipsis.sub-heading.text-muted").html(`Update this machine's <b>HMR</b> to clear this alert`);
                } else {
                    $("#page-FT\\ Alert div.ellipsis.sub-heading.text-muted").html(`This alert was cleared.`);
                }
            }
            if (frm.doc.alert_type === "Quote Alert") {
                $("#page-FT\\ Alert div.ellipsis.sub-heading.text-muted").html(`Attach Quotation or any file on the side bar`);
            }
            if (frm.doc.alert_type === "Quote Follow Up") {
                $("#page-FT\\ Alert div.ellipsis.sub-heading.text-muted").html(`This is a quote follow up alert. Mark as done if completed.`);
            }
            if (frm.doc.alert_type === "Maintenance Warning" || frm.doc.alert_type === "Stop Machine") {
                $("div.form-sidebar.overlay-sidebar").css("visibility", "hidden");
                $("#page-FT\\ Alert div.ellipsis.sub-heading.text-muted").html(`A <b>${frm.doc.alert_type}</b> alert for this machine was raised.`);
            }
            if (frm.doc.alert_type === "General") {
                $("div.form-sidebar.overlay-sidebar").css("visibility", "hidden");
                if (frm.doc.status === "Pending") {
                    $("#page-FT\\ Alert div.ellipsis.sub-heading.text-muted").html(`Action this alert to clear it`);
                } else {
                    $("#page-FT\\ Alert div.ellipsis.sub-heading.text-muted").html(`This alert was cleared.`);
                }
            }
        }
    },
    setup: function (frm) {
        frappe.breadcrumbs.clear();
        frappe.breadcrumbs.set_custom_breadcrumbs({
            "route": "/app",
            "label": "Home"
        });
        frappe.breadcrumbs.set_custom_breadcrumbs({
            "route": "javascript:void(0)",
            "label": "Alerts"
        });
    }
});
