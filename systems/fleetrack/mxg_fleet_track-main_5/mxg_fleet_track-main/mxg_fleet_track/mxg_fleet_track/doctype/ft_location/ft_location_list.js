frappe.listview_settings['FT Location'] = {
    add_fields: ['location', 'country'],
    filters: [],
    hide_name_column: false,
    button: {
        show(doc) {
            return doc.name;
        },
        get_label() {
            return 'View Machines';
        },
        get_description(doc) {
            return __('View machines in Location')
        },
        action(doc) {
            frappe.route_options = {
                location: doc.name,
            }
            frappe.set_route('List', "FT Machine");
        }
    },
    formatters: {},
    onload: function (me) {
        me.page.set_title(__("Locations"));
    },
}