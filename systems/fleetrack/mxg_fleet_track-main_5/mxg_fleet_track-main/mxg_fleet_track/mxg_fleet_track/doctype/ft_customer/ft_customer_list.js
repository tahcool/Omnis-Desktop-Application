frappe.listview_settings['FT Customer'] = {
    add_fields: ['customer_name', 'management_email', 'technical_email',],
    filters: [],
    hide_name_column: true,
    button: {
        show(doc) {
            return doc.customer_name;
        },
        get_label() {
            return 'Machines';
        },
        get_description(doc) {
            return __('View {0}', [`${doc.customer_name}'s machines`])
        },
        action(doc) {
            frappe.set_route('List', "FT Machine", {"customer": doc.name});
        }
    },
    formatters: {},
    onload: function (me) {
        me.page.set_title(__("Customers DB"));

        $("div.list-sidebar.overlay-sidebar").parent().css("display", "none");
        $("#page-List\\/FT\\ Customer\\/List div.ellipsis.sub-heading.text-muted").html(`List of all customers. Use filters to search.`);
        $(".btn.primary-action").removeClass("btn-primary").addClass("btn-danger").html("Add Customer");
    },
}