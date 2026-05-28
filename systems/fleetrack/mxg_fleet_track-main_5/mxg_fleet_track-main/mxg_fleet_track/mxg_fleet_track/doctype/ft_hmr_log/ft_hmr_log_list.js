frappe.listview_settings["FT HMR Log"] = {
  add_fields: ["machine", "model", "customer", "hmr", "reading_date", "logger"],
  filters: [],
  hide_name_column: true,
  has_indicator_for_draft: false,
  button: {
    show(doc) {
      return doc.name;
    },
    get_label() {
      return "Goto Machine";
    },
    get_description(doc) {
      return __("View Machine");
    },
    action(doc) {
      frappe.set_route("Form", "FT Machine", doc.machine);
    },
  },
  formatters: {},
  onload: function (me) {
    me.page.set_title(__("HMR Journal"));
    $("div.list-sidebar.overlay-sidebar").parent().css("display", "none");
    $("#page-List\\/FT\\ HMR\\ Log\\/List div.ellipsis.sub-heading.text-muted").html(
      `HMR Log for all machines. Apply filters to find specific entries`
    );

    if (frappe.user.has_role("MXG-CONTROLLER")) {
      me.page.add_inner_button("Sync Total Running HRS for Machines", () => {
        frappe
          .call({
            method: "mxg_fleet_track.mxg_fleet_track.doctype.ft_hmr_log.ft_hmr_log.sync_machine_total_running_hours",
            args: {
              machine_sn: null,
            },
          })
          .done(() => {
            frappe.show_alert(
              {
                message: __(`Running Total Running Hours Sync task in background`),
                indicator: "green",
              },
              20
            );
          });
      });
    }
  },
};
