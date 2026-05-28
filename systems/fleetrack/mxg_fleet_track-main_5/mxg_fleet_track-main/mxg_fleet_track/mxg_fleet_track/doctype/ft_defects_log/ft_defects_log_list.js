frappe.listview_settings['FT Defects Log'] = {
    add_fields: ['machine', 'defect_type', 'description', 'oem', 'customer', 'location', 'start_date', 'priority', 'defect_days'],
    filters: [],
    hide_name_column: true,
    has_indicator_for_draft: false,
    get_indicator(doc) {
        if (doc.defect_type === "Minor") {
            return [__("Minor"), "blue", "defect_type,=,Minor"];
        }
        {
            return [__("Major"), "red", "defect_type,=,Major"];
        }
    },
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
    onload: function (me) {
        me.page.set_title(__("Defects"));
    },
}