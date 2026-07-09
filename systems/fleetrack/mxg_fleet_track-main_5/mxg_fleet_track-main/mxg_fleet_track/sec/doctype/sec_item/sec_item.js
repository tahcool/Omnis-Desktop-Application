// Copyright (c) 2023, Percival Rapha and contributors
// For license information, please see license.txt

frappe.ui.form.on('SEC Item', {
    onload: () => {
        frappe.realtime.off("list_update")
    },
    refresh: function (frm) {
        if (!frappe.user.has_role("MXG-CONTROLLER")) {
            $("div.form-sidebar.overlay-sidebar").css("visibility", "hidden");
        }


        if (frm.doc.creation) {
            frm.page.set_title(`${frm.doc.component_name}`);
            $("#page-SEC\\ Item div.ellipsis.sub-heading.text-muted").html(`[${frm.doc.ref}] — ${frm.doc.part_no}`);

            frm.add_custom_button(__('&plus; <b>Recon. & Repair</b> Log'), function () {
                let d = new frappe.ui.Dialog({
                    title: '<b>SEC</b> Recon. & Repair Log',
                    fields: [
                        {
                            label: 'Job Number',
                            fieldname: 'job_number',
                            fieldtype: 'Data',
                            bold: 1,
                            reqd: 1,
                        },
                        {
                            label: '',
                            fieldname: 'col_br_rted1w',
                            fieldtype: 'Column Break',
                        },
                        {
                            label: 'On Hold?',
                            fieldname: 'on_hold',
                            fieldtype: 'Check',
                            bold: 1,
                        },
                        {
                            label: '',
                            fieldname: 'col_br_rted1',
                            fieldtype: 'Column Break',
                        },
                        {
                            label: 'Ted Status',
                            fieldname: 'ted_status',
                            fieldtype: 'Select',
                            options: "\nAvailable\nTBA",
                            depends_on: "eval:!doc.on_hold",
                            mandatory_depends_on: "eval:!doc.on_hold",
                        },
                        {
                            label: '',
                            fieldname: 'sec_br2ted',
                            fieldtype: 'Section Break',
                            hide_border: 1,
                        },
                        {
                            label: 'Customer',
                            fieldname: 'customer',
                            fieldtype: 'Data',
                            read_only: 1,
                            bold: 1,
                        },
                        {
                            label: '',
                            fieldname: 'first_cb_4_space',
                            fieldtype: 'Column Break',
                        },
                        {
                            label: 'Location',
                            fieldname: 'location',
                            fieldtype: 'Link',
                            options: 'FT Location'
                        },
                        {
                            fieldname: 'col_1_22',
                            fieldtype: 'Column Break'
                        },
                        {
                            label: 'Tech. Assigned',
                            fieldname: 'technician_assigned',
                            fieldtype: 'Select',
                            options: '\nYes\nNo',
                            reqd: 1
                        },
                        {
                            label: '',
                            fieldname: 'sec_br2',
                            fieldtype: 'Section Break',
                            hide_border: 1,
                        },
                        {
                            label: 'Item No',
                            fieldname: 'sec_item_no',
                            fieldtype: 'Data',
                            reqd: 1,
                            read_only: 1,
                            bold: 1,
                        },
                        {
                            label: 'Recon. & Repair Description',
                            fieldname: 'description',
                            fieldtype: 'Data',
                            reqd: 1
                        },
                        {
                            label: 'Status',
                            fieldname: 'status',
                            fieldtype: 'Data',
                            reqd: 1,
                        },
                        {
                            fieldname: 'col_1',
                            fieldtype: 'Column Break'
                        },
                        {
                            label: 'Component Name',
                            fieldname: 'component_name',
                            fieldtype: 'Data',
                            read_only: 1,
                        },
                        {
                            label: 'Date',
                            fieldname: 'date_logged',
                            fieldtype: 'Date',
                            reqd: 1,

                        },
                        {
                            label: 'End Date',
                            fieldname: 'end_date',
                            fieldtype: 'Date',
                        },
                        {
                            label: '',
                            fieldname: 'last_sb_4_dates',
                            fieldtype: 'Section Break',
                            hide_border: 1,
                        },
                        {
                            label: 'TED',
                            fieldname: 'ted',
                            fieldtype: 'Date',
                            mandatory_depends_on: "eval:(!doc.on_hold && doc.ted_status !== 'TBA')"
                        },
                        {
                            label: '',
                            fieldname: 'last_cb_4_dates',
                            fieldtype: 'Column Break',
                        },
                        {
                            label: 'Parts ETA',
                            fieldname: 'parts_eta',
                            fieldtype: 'Date',
                        },
                        {
                            label: '',
                            fieldname: 'last_cb_4_oeta',
                            fieldtype: 'Column Break',
                        },
                        {
                            label: 'Outwork ETA',
                            fieldname: 'out_eta',
                            fieldtype: 'Date',
                        },
                    ],
                    primary_action_label: 'Submit',
                    primary_action(args) {
                        if (!args) return;

                        frappe.confirm(__(`Are you sure to make Recon. & Repair Entry: <b>${args.description}</b> (${args.date_logged})`), () => {
                            frappe.call({
                                method: "mxg_fleet_track.sec.doctype.sec_item.sec_item.repair_log_entry",
                                freeze_message: __("Making Recon. & Repair Log Entry ..."),
                                args: {
                                    "sec_item_no": frm.doc.name,
                                    "description": args.description,
                                    "date_logged": args.date_logged,
                                    "status": args.status,
                                    "end_date": args.end_date,
                                    "ted": args.ted,
                                    "technician_assigned": args.technician_assigned,
                                    "parts_eta": args.parts_eta,
                                    "out_eta": args.out_eta,
                                    "on_hold": args.on_hold,
                                    "ted_status": args.ted_status,
                                    "job_number": args.job_number,
                                },
                                freeze: true,
                                callback: function (r) {
                                    if (!r.exc) {

                                    }
                                }
                            }).done(() => {
                                frappe.show_alert({
                                    message: __(`Recon. & Repair logged for <b>${frm.doc.component_name}</b>`),
                                    indicator: 'green'
                                }, 8);
                                frm.refresh_fields();
                                d.hide();
                            });
                        })
                    }
                });
                d.set_values({
                    'sec_item_no': frm.doc.name,
                    'component_name': frm.doc.component_name,
                    'customer': frm.doc.customer,
                    'location': frm.doc.location,
                });
                d.show();
            }, __('&plus; New'));

            frm.add_custom_button(__('Recon. & Repair Log'), function () {
                frappe.route_options = {"machine": frm.doc.name,}
                frappe.set_route('List', 'SEC Repair Log Entry')
            }, __('View'));


            frm.page.set_inner_btn_group_as_primary(__('&plus; New'));

        } else {
            frm.page.set_title(`Enter details for <b>new</b> SEC item`);
            $("#page-SEC\\ Item div.ellipsis.sub-heading.text-muted").html(`Adding new machine to <b>SEC Item</b> database.`);
            frm.add_custom_button(__("&larr; Back to list"), function () {
                frappe.route_options = {};
                frappe.set_route("List", "SEC Item");
            })
        }
    },
});
