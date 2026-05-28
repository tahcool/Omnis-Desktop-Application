frappe.listview_settings['FT Machine Model'] = {
    add_fields: ['oem', 'model_name', 'si_hours'],
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
            return __('View machines')
        },
        action(doc) {
            frappe.route_options = {
                model: doc.name,
            }
            frappe.set_route('List', "FT Machine");
        }
    },
    formatters: {},
    onload: function (me) {
        me.page.set_title(__("Machine Models"));
        $("div.list-sidebar.overlay-sidebar").parent().css("display", "none");
        $("#page-List\\/FT\\ Machine\\ Model\\/List div.ellipsis.sub-heading.text-muted").html(`Machine Model database.`);
    },
}