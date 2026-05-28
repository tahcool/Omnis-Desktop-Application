frappe.listview_settings['FT Service Log'] = {
    add_fields: [
        'machine',
        'service_date',
        'service_hmr',
        'technician_name',
        'service_type',
        'model',
    ],
    hide_name_column: true,
    has_indicator_for_draft: false,
    button: {
        show(doc) {
            return doc.name;
        },
        get_label() {
            return 'View Machine';
        },
        get_description(doc) {
            return __('Goto machine record');
        },
        action(doc) {
            frappe.set_route('Form', "FT Machine", doc.machine);
        }
    },
    formatters: {},
    onload: function (me) {
        me.page.set_title(__("Service History"));

        $("div.list-sidebar.overlay-sidebar").parent().css("display", "none");
        $("#page-List\\/FT\\ Service\\ Log\\/List div.ellipsis.sub-heading.text-muted").html(`Service history for all machines. Use filters to search.`);
    },
}