frappe.listview_settings['SEC Item'] = {
    add_fields: ['machine_model', 'ref', 'customer', 'oem', 'location',],
    filters: [],
    hide_name_column: true,
    has_indicator_for_draft: false,
    button: {
        show(doc) {
            return doc.name;
        },
        get_label() {
            return 'Recon. & Repairs';
        },
        get_description(doc) {
            return __('View repairs log')
        },
        action(doc) {
            frappe.set_route('List', "SEC Repair Log Entry", {sec_item_no: doc.name});
        }
    },
    formatters: {},
    onload: function(me) {
		me.page.set_title(__("SEC Items"));
        $("div.list-sidebar.overlay-sidebar").parent().css("display", "none");
        $("#page-List\\/SEC\\ Item\\/List div.ellipsis.sub-heading.text-muted").html(`List of all SEC Items in database. Use filters to search.`);
	},
}