frappe.listview_settings['FT Alert'] = {
    add_fields: [
        'machine',
        'date_issued',
        'model',
        'customer',
        'oem',
        'alert_type',
    ],
    filters: [
        ["status", "=", "Pending"],
    ],
    hide_name_column: true,
    get_indicator(doc) {
        if (doc.status === "Done") {
            return [__("Done"), "green", "status,=,Done"];
        } else {
            return [__("Pending"), "red", "status,=,Pending"];
        }
    },
    button: {
        show(doc) {
            return doc.name;
        },
        get_label() {
            return 'Open machine';
        },
        get_description(doc) {
            return __('View machine')
        },
        action(doc) {
            frappe.set_route('Form', "FT Machine", doc.machine);
        }
    },
    formatters: {},
    onload: function (me) {
        me.page.set_title(__("Alerts"));

        frappe.breadcrumbs.clear();
        frappe.breadcrumbs.set_custom_breadcrumbs({
            "route": "/app",
            "label": "Home"
        });
        frappe.breadcrumbs.set_custom_breadcrumbs({
            "route": "javascript:void(0)",
            "label": "Alerts"
        });

        $("div.list-sidebar.overlay-sidebar").parent().css("display", "none");
        $("#page-List\\/FT\\ Alert\\/List div.ellipsis.sub-heading.text-muted").html(`List of alerts that have been raised. Pending & Completed. Use filters to search.`);
    },
}