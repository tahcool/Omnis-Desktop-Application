frappe.listview_settings['FT Machine OEM'] = {
    add_fields: ['oem',],
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
                oem: doc.name,
            }
            frappe.set_route('List', "FT Machine");
        }
    },
    formatters: {},
    onload: function (me) {
        me.page.set_title(__("Machine OEMs"));
        $("div.list-sidebar.overlay-sidebar").parent().css("display", "none");
        $("#page-List\\/FT\\ Machine\\ OEM\\/List div.ellipsis.sub-heading.text-muted").html(`OEM Database.`);
    },
}