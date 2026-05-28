frappe.listview_settings['SEC Repair Log Entry'] = {
    add_fields: ['sec_item_no', 'machine_model', 'description', 'oem', 'customer', 'location', 'date_logged', 'status', 'days_since_logged'],
    filters: [],
    hide_name_column: true,
    has_indicator_for_draft: false,
    button: {
        show(doc) {
            return doc.name;
        },
        get_label() {
            return 'View Item Record';
        },
        get_description(doc) {
            return __('View {0}', [`${doc.sec_item_no}`])
        },
        action(doc) {
            frappe.set_route('Form', 'SEC Item', doc.sec_item_no);
        }
    },
    formatters: {},
    onload: function(me) {
		me.page.set_title(__("SEC Recon. & Repair Log"));
        $("div.list-sidebar.overlay-sidebar").parent().css("display", "none");
	},
}