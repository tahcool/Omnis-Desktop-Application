frappe.listview_settings["FT JRV"] = {
  add_fields: ["name", "job_no", "machine", "customer", "machine_model", "responsibility", "nature"],
  hide_name_column: true,
  get_indicator(doc) {
    // if (doc.status === "Done") {
    //   return [__("Done"), "green", "status,=,Done"];
    // } else {
    //   return [__("Pending"), "red", "status,=,Pending"];
    // }
  },
  button: {
    show(doc) {
      return doc.name;
    },
    get_label(doc) {
      return doc.nature;
    },
    get_description(doc) {
      return __("JRV nature");
    },
    action(doc) {
      frappe.set_route("Form", "FT Machine", doc.machine);
    },
  },
  formatters: {},
  onload: function (me) {
    me.page.set_title(__("JRV Repository"));

    frappe.breadcrumbs.clear();
    frappe.breadcrumbs.set_custom_breadcrumbs({
      route: "/app",
      label: "Home",
    });
    frappe.breadcrumbs.set_custom_breadcrumbs({
      route: "javascript:void(0)",
      label: "JRVs",
    });
    me.page.add_inner_button(
      "Field Service Planner",
      () => {
        frappe.set_route("query-report", "Field Service Planner");
      },
      "Service Planners"
    );
    me.page.add_inner_button(
      "Workshop Planner",
      () => {
        frappe.set_route("query-report", "Workshop Planner");
      },
      "Service Planners"
    );
    me.page.add_inner_button("Lost Sales Report", () => {
      frappe.set_route("query-report", "Lost Sales Report (LSR)");
    });
    me.page.add_inner_button("Completion Queue", () => {
      frappe.set_route("query-report", "Jobs To Complete");
    });

    $("div.list-sidebar.overlay-sidebar").parent().css("display", "none");
    $("#page-List\\/FT\\ JRV\\/List div.ellipsis.sub-heading.text-muted").html(
      `List of all JRV's raised. Filter by workflow_state to see pending or completed JRV's.`
    );
  },
};
