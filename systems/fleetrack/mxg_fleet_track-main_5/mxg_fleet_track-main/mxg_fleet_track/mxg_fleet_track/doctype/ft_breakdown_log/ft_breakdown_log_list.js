frappe.listview_settings['FT Breakdown Log'] = {
    add_fields: ['machine', 'model', 'description', 'oem', 'customer', 'location', 'breakdown_date', 'status', 'days_on_bd'],
    filters: [],
    hide_name_column: true,
    has_indicator_for_draft: false,
    button: {
        show(doc) {
            return doc.name;
        },
        get_label() {
            return 'View Machine Record';
        },
        get_description(doc) {
            return __('View {0}', [`${doc.machine}`])
        },
        action(doc) {
            frappe.set_route('Form', "FT Machine", doc.machine);
        }
    },
    formatters: {},
    onload: function(me) {
		me.page.set_title(__("Breakdowns"));
	},
}