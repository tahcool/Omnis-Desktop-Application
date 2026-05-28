frappe.listview_settings['FT Machine Type'] = {
    add_fields: ['type_name', ],
    filters: [],
    hide_name_column: false,
    has_indicator_for_draft: false,
    button: {
        show(doc) {
            return doc.name;
        },
        get_label() {
            return 'View all';
        },
        get_description(doc) {
            return __('View all machines with type: {0}', [`${doc.type_name}`])
        },
        action(doc) {
            frappe.route_options = {
                type: doc.type_name
            }
            frappe.set_route('List', "FT Machine");
        }
    },
    formatters: {},
    onload: function (me) {
        me.page.set_title(__("Machine Types"));
        $("div.list-sidebar.overlay-sidebar").parent().css("display", "none");
        $("#page-List\\/FT\\ Machine\\ Type\\/List div.ellipsis.sub-heading.text-muted").html(`Machine Type database.`);
    },
}