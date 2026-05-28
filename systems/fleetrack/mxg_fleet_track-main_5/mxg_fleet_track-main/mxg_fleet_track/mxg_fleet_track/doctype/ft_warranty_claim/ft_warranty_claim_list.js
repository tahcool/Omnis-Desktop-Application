frappe.listview_settings['FT Warranty Claim'] = {
    add_fields: ['machine_srn', 'date', 'model', 'customer', 'job_no', 'description', 'status', 'approval_status'],
    filters: [],
    hide_name_column: true,
    button: {
        show(doc) {
            return doc.name;
        },
        get_label() {
            return 'Machine';
        },
        get_description(doc) {
            return __('View Record')
        },
        action(doc) {
            frappe.set_route('Form', "FT Machine", doc.machine_srn);
        }
    },
    formatters: {},
    onload: function (me) {
        me.page.set_title(__("Warranty Claims"));

        $("div.list-sidebar.overlay-sidebar").parent().css("display", "none");
        $("#page-List\\/FT\\ Warranty\\ Claim\\/List div.ellipsis.sub-heading.text-muted").html(`List of warranty claims. Use filters to search.`);
    },
}