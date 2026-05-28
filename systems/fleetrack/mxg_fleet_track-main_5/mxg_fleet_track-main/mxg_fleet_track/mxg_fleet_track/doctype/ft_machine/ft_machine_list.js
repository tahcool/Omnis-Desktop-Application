frappe.listview_settings['FT Machine'] = {
    add_fields: [
        'customer',
        'model',
        'oem',
        'esn',
        'fleet_no',
        'sn',
        'location',
        'warranty_status',
        'type',
        'hours_remaining_to_service'
    ],
    filters: [
        ["fleetrack_managed", "=", "Yes"]
    ],
    hide_name_column: true,
    has_indicator_for_draft: false,
    get_indicator(doc) {
        if (doc.warranty_status === "N/A") {
            return [__("N/A"), "green", "warranty_status,=,N/A"];
        } else if (doc.warranty_status === "Under Warranty") {
            return [__("Under Warranty"), "blue", "warranty_status,=,Under Warranty"];
        } else {
            return [__("Out of Warranty"), "red", "warranty_status,=,Out of Warranty"];
        }
    },
    button: {
        show(doc) {
            return doc.name;
        },
        get_label() {
            return 'Customer';
        },
        get_description(doc) {
            return __('View {0}', [`${doc.customer}`])
        },
        action(doc) {
            frappe.set_route('Form', "FT Customer", encodeURIComponent(doc.customer));
        }
    },
    formatters: {
        hours_remaining_to_service(val) {
            val = parseFloat(val);
            if (val < 0) {
                return `<span style="border-radius: 2px; padding: 1px 0; display: block; text-align: center; background-color: red; color: #fff !important; font-weight: bold !important;">${val}</span>`;
            }
            if (val > 0 && val <= 10) {
                return `<span style="border-radius: 2px; padding: 1px 0;display: block; text-align: center;background-color: orange; color: #000 !important; font-weight: bold !important;">${val}</span>`;
            }

            if (val > 10) {
                return `<span style="border-radius: 2px;padding: 1px 0;display: block; text-align: center;background-color: green;color: #fff !important; font-weight: bold !important;">${val}</span>`;
            }
            return `<span>&dash;</span>`
        },
    },
    onload: function (me) {
        me.page.set_title(__("Machine Register"));
        frappe.breadcrumbs.clear();
        frappe.breadcrumbs.set_custom_breadcrumbs({
            "route": "/app",
            "label": "Home"
        });
        frappe.breadcrumbs.set_custom_breadcrumbs({
            "route": "javascript:void(0)",
            "label": "FT Machine"
        });
        $("div.list-sidebar.overlay-sidebar").parent().css("display", "none");
        $("#page-List\\/FT\\ Machine\\/List div.ellipsis.sub-heading.text-muted").html(`List of all machines in <b>EPR</b> database. Use filters to search.`);
    },
}