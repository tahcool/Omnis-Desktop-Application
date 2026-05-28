frappe.listview_settings['FT Region'] = {
    add_fields: ['region_name',],
    filters: [],
    hide_name_column: false,
    button: {
        show(doc) {
            return doc.name;
        },
        get_label() {
            return 'View Machines in Region';
        },
        get_description(doc) {
            return __('View machines in {0}', [`${doc.region_name} region`])
        },
        action(doc) {
            frappe.route_options = {
                region: doc.name,
            }
            frappe.set_route('List', "FT Machine");
        }
    },
    formatters: {},
    onload: function (me) {
        me.page.set_title(__("MXG Regions"));
    },
}