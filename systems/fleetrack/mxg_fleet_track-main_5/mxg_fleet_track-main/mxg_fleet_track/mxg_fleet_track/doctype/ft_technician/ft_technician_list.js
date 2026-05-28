frappe.listview_settings["FT Technician"] = {
  add_fields: ["full_name", "mobile"],
  hide_name_column: true,
  button: {
    show(doc) {
      return doc.name;
    },
    get_label() {
      return "Service History";
    },
    get_description(doc) {
      return __("Service History");
    },
    action(doc) {
      frappe.route_options = {
        technician: doc.name,
      };
      frappe.set_route("List", "FT Service Log");
    },
  },
  formatters: {},
  onload: function (me) {
    me.page.set_title(__("Technicians"));
    me.page.add_inner_button(
      "Create New",
      () => {
        frappe.new_doc("FT Technician Efficiency Report", {});
        frappe.show_alert(
          {
            message: __("Fill in the rest of required fields and save"),
            indicator: "green",
          },
          10
        );
      },
      "Technician Efficiency Report"
    );
    me.page.add_inner_button(
      "View Reports",
      () => {
        frappe.set_route("List", "FT Technician Efficiency Report");
      },
      "Technician Efficiency Report"
    );
  },
};
