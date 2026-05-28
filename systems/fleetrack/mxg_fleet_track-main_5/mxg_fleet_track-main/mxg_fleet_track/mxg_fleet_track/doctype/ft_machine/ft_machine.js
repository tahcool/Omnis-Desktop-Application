// Copyright (c) 2022, Percival Rapha and contributors
// For license information, please see license.txt

const SECTION_BREAK = (label, options) => {
  return {
    label,
    fieldname: "sec_br" + Math.random().toString(36).substring(7),
    fieldtype: "Section Break",
    ...options,
  };
};

const COLUMN_BREAK = () => {
  return {
    fieldname: "col_br" + Math.random().toString(36).substring(7),
    fieldtype: "Column Break",
  };
};

frappe.ui.form.on("FT Machine", {
  onload: () => {
    frappe.realtime.off("list_update");
    frappe.breadcrumbs.add("Test", "FT Machine");
  },
  refresh: function (frm) {
    if (!frappe.user.has_role("MXG-CONTROLLER")) {
      console.log("Not controller!");
      $("div.form-sidebar.overlay-sidebar").css("visibility", "hidden");
      $('a[data-action="clear_attachment"]').hide();
    }

    frm.events.set_sub_heading(frm);
    frm.events.set_fleetrack_actions_button(frm);
    frm.events.set_logger_btns(frm);
    frm.events.set_reports_btn(frm);
    frm.events.set_madr_btn(frm);

    if (!frm.is_new()) {
      if (frm.doc.fleetrack_managed === "No") {
      } else {
        $(
          "#page-FT\\ Machine div.layout-main-section div.form-page .ribbon-wrapper"
        ).remove();

        if (frm.doc.hours_remaining_to_service < 1) {
          // Red
          $("#page-FT\\ Machine div.layout-main-section div.form-page").css(
            "border-top",
            "10px solid red"
          );
        } else if (
          frm.doc.hours_remaining_to_service >= 1 &&
          frm.doc.hours_remaining_to_service < 100
        ) {
          // Orange
          $("#page-FT\\ Machine div.layout-main-section div.form-page").css(
            "border-top",
            "10px solid orange"
          );
        } else {
          // green
          $("#page-FT\\ Machine div.layout-main-section div.form-page").css(
            "border-top",
            "10px solid green"
          );
        }
      }

      frm.add_custom_button(
        __("Service Log"),
        function () {
          frappe.route_options = { machine: frm.doc.name };
          frappe.set_route("List", "FT Service Log");
        },
        __("View")
      );
      frm.add_custom_button(
        __("Weekly HMR Log"),
        function () {
          frappe.route_options = { machine: frm.doc.name };
          frappe.set_route("List", "FT HMR Log");
        },
        __("View")
      );
      frm.add_custom_button(
        __("Defects Log"),
        function () {
          frappe.route_options = { machine: frm.doc.name };
          frappe.set_route("List", "FT Defects Log");
        },
        __("View")
      );
      frm.add_custom_button(
        __("Breakdown Log"),
        function () {
          frappe.route_options = { machine: frm.doc.name };
          frappe.set_route("List", "FT Breakdown Log");
        },
        __("View")
      );
      frm.add_custom_button(
        __("Alert Log"),
        function () {
          frappe.set_route("List", "FT Alert", {
            machine: frm.doc.name,
            status: "Pending",
          });
        },
        __("View")
      );

      frm.page.set_primary_action(__(`Cust..`), function () {
        frappe.set_route("Form", "FT Customer", frm.doc.customer);
      });
    } else {
      frm.page.set_title(`Enter details for <b>new</b> machine`);
      $("#page-FT\\ Machine div.ellipsis.sub-heading.text-muted").html(
        `Adding new machine to <b>EPR</b> database.`
      );
      frm.add_custom_button(__("&larr; Back to list"), function () {
        frappe.route_options = {};
        frappe.set_route("List", "FT Machine");
      });
    }
  },
  set_madr_btn(frm) {
    const madrConfigBtnLabel = __("MADR Config.");
    const madrQueryBtnLabel = __("Query MADR");
    frm.add_custom_button(
      "Mobility (TUR etc.)",
      () => {
        frm.events.do_show_madr_mobility_config(frm);
      },
      madrConfigBtnLabel
    );
    frm.add_custom_button(
      "Upload GET Component Image",
      () => {
        frm.events.do_upload_get_component_image(frm);
      },
      madrConfigBtnLabel
    );
    frm.add_custom_button(
      "GET Components",
      () => {
        frm.events.do_show_madr_get_components_config(frm);
      },
      madrConfigBtnLabel
    );
    frm.add_custom_button(
      "Filters & Belts",
      () => {
        frm.events.do_show_madr_filters_and_belts_config(frm);
      },
      madrConfigBtnLabel
    );
    frm.add_custom_button(
      "Add Named Component",
      () => {
        frappe.new_doc("FT Machine Named Component", {
          machine: frm.doc.name,
        });
      },
      madrConfigBtnLabel
    );
    frm.add_custom_button(
      "View Named Components",
      () => {
        frappe.set_route("List", "FT Machine Named Component", {
          machine: frm.doc.name,
        });
      },
      madrQueryBtnLabel
    );

    frm.add_custom_button(
      "Add Unique Attachment",
      () => {
        frappe.new_doc("FT Machine Unique Attachment", {
          machine: frm.doc.name,
        });
      },
      madrConfigBtnLabel
    );
    frm.add_custom_button(
      "Add Electrical Component",
      () => {
        frappe.new_doc("FT Machine Component", {
          machine: frm.doc.name,
          component_group: "Electrical",
        });
      },
      madrConfigBtnLabel
    );
    frm.add_custom_button(
      "Add Motors",
      () => {
        frappe.new_doc("FT Machine Component", {
          machine: frm.doc.name,
          component_group: "Motors",
        });
      },
      madrConfigBtnLabel
    );
    frm.add_custom_button(
      "Add Filter (+Special)",
      () => {
        frappe.new_doc("FT Machine Filter", {
          machine: frm.doc.name,
        });
      },
      madrConfigBtnLabel
    );
    frm.add_custom_button(
      "View Unique Attachments",
      () => {
        frappe.set_route("List", "FT Machine Unique Attachment", {
          machine: frm.doc.name,
        });
      },
      madrQueryBtnLabel
    );
    frm.add_custom_button(
      "View Electrical Components",
      () => {
        frappe.set_route("List", "FT Machine Component", {
          machine: frm.doc.name,
          component_group: "Electrical",
        });
      },
      madrQueryBtnLabel
    );
    frm.add_custom_button(
      "View Motors",
      () => {
        frappe.set_route("List", "FT Machine Component", {
          machine: frm.doc.name,
          component_group: "Motors",
        });
      },
      madrQueryBtnLabel
    );
  },
  do_show_madr_mobility_config(frm) {
    let dialog = new frappe.ui.Dialog({
      title: __("MADR Configuration | Mobility"),
      size: "large",
      fields: [
        {
          label: "Mobility",
          fieldname: "mobility",
          fieldtype: "Select",
          options: "\nWheeled\nTracked",
          reqd: 1,
        },
        COLUMN_BREAK(),
        COLUMN_BREAK(),
        SECTION_BREAK("Undercarriage", {
          collapsible: 0,
          hide_border: 0,
          depends_on: "eval: doc.mobility === 'Tracked'",
        }),
        {
          label: "Chain Make",
          fieldname: "chain_make",
          fieldtype: "Data",
        },
        COLUMN_BREAK(),
        {
          label: "Length (mm)",
          fieldname: "chain_length",
          fieldtype: "Float",
        },
        COLUMN_BREAK(),
        {
          label: "Width (mm)",
          fieldname: "chain_width",
          fieldtype: "Float",
        },
        SECTION_BREAK("Sproket", {
          collapsible: 0,
          hide_border: 0,
          depends_on: "eval: doc.mobility === 'Tracked'",
        }),
        {
          label: "LHS No. of Teeth",
          fieldname: "sproket_lhs_teeth",
          fieldtype: "Int",
        },
        {
          label: "LHS No. of Holes",
          fieldname: "sproket_lhs_holes",
          fieldtype: "Int",
        },
        COLUMN_BREAK(),
        {
          label: "RHS No. of Teeth",
          fieldname: "sproket_rhs_teeth",
          fieldtype: "Int",
        },
        {
          label: "RHS No. of Holes",
          fieldname: "sproket_rhs_holes",
          fieldtype: "Int",
        },
        SECTION_BREAK("Track Components", {
          depends_on: "eval: doc.mobility === 'Tracked'",
        }),
        {
          label: "",
          fieldname: "components",
          fieldtype: "Table",
          fields: [
            {
              label: "Component",
              fieldname: "component",
              fieldtype: "Link",
              options: "FT Track Component",
              reqd: 1,
              in_list_view: 1,
              columns: 2,
            },
            COLUMN_BREAK(),
            {
              label: "Measurement at PDI (mm)",
              fieldname: "measurement_at_pdi",
              fieldtype: "Float",
              in_list_view: 1,
              columns: 2,
            },
          ],
        },
        {
          label: "Other U/C Information",
          fieldname: "other_uc_info",
          fieldtype: "Small Text",
        },
      ],
      primary_action_label: __("Save"),
      primary_action: function () {},
    });
    dialog.show();
  },
  do_show_madr_get_components_config(frm) {
    let dialog = new frappe.ui.Dialog({
      title: __("MADR Configuration | GET Components"),
      size: "extra-large",
      fields: [
        SECTION_BREAK(),
        {
          label: "Load from Repository",
          fieldname: "load_from_repo",
          fieldtype: "Button",
          click: function () {
            frappe.confirm(
              __("Load from repository? This will clear everything!"),
              () => {
                frappe.db
                  .get_list("FT GET Component", {})
                  .then((r) => {
                    dialog.fields_dict["get_components"].df.data = r.map(
                      (row) => {
                        return {
                          component: row.name,
                        };
                      }
                    );
                  })
                  .finally(() => {
                    dialog.get_field("get_components").refresh();
                  });
              }
            );
          },
        },
        {
          label: "GET Components",
          fieldname: "get_components",
          fieldtype: "Table",
          fields: [
            {
              label: "Component",
              fieldname: "component",
              fieldtype: "Link",
              reqd: 1,
              in_list_view: 1,
              columns: 2,
              options: "FT GET Component",
            },
            COLUMN_BREAK(),
            {
              label: "Qty",
              fieldname: "qty",
              fieldtype: "Int",
              reqd: 1,
              in_list_view: 1,
              columns: 1,
            },
            SECTION_BREAK(),
            {
              label: "OEM Part No.",
              fieldname: "oem_part_no",
              fieldtype: "Data",
              in_list_view: 1,
              reqd: 1,
            },
            COLUMN_BREAK(),
            {
              label: "Alt. Part No.",
              fieldname: "alt_part_no",
              fieldtype: "Data",
              in_list_view: 1,
            },
            COLUMN_BREAK(),
            {
              label: "Alt. Part No.",
              fieldname: "alt_part_no_1",
              fieldtype: "Data",
              in_list_view: 1,
            },
            COLUMN_BREAK(),
            {
              label: "Alt. Part No.",
              fieldname: "alt_part_no_2",
              fieldtype: "Data",
              in_list_view: 1,
              columns: 1,
            },
          ],
        },
      ],
      primary_action_label: __("Save GET Config"),
      primary_action: function () {},
    });
    dialog.show();
  },
  do_generate_fleet_no(frm) {
    frappe.confirm(`Generate fleet no. for this machine?`, () => {
      frappe
        .call({
          method:
            "mxg_fleet_track.mxg_fleet_track.doctype.ft_machine.ft_machine.generate_fleet_no",
          freeze_message: __("Generating fleet number ..."),
          args: {
            sn: frm.doc.name,
          },
          freeze: true,
          callback: function (r) {},
        })
        .done((r) => {
          frappe.show_alert(
            {
              message: __(r.message),
              indicator: "green",
            },
            5
          );
          frm.reload_doc();
        });
    });
  },
  do_refresh_hours_remaining_to_service(frm) {
    frappe.call({
      doc: frm.doc,
      method: "set_hours_remaining_to_service",
      args: {
        commit: true,
      },
      callback: function (r) {
        frm.reload_doc();
      },
    });
  },
  do_show_madr_filters_and_belts_config(frm) {
    let dialog = new frappe.ui.Dialog({
      title: __("MADR Configuration | Filters & Belts"),
      size: "extra-large",
      fields: [
        SECTION_BREAK(),
        {
          label: "Load from Repository",
          fieldname: "load_from_repo",
          fieldtype: "Button",
          click: function () {
            frappe.confirm(
              __("Load from repository? This will clear everything!"),
              () => {
                frappe.db
                  .get_list("FT Machine Service Item", {})
                  .then((r) => {
                    dialog.fields_dict["filters_and_belts"].df.data = r.map(
                      (row) => {
                        return {
                          item: row.name,
                        };
                      }
                    );
                  })
                  .finally(() => {
                    dialog.get_field("filters_and_belts").refresh();
                  });
              }
            );
          },
        },
        {
          label: "Filters & Belts",
          fieldname: "filters_and_belts",
          fieldtype: "Table",
          fields: [
            {
              label: "Description",
              fieldname: "item",
              fieldtype: "Data",
              reqd: 1,
              in_list_view: 1,
              columns: 2,
              options: "FT Machine Service Item",
            },
            COLUMN_BREAK(),
            {
              label: "Qty",
              fieldname: "qty",
              fieldtype: "Int",
              reqd: 1,
              in_list_view: 1,
              columns: 1,
            },
            SECTION_BREAK(),
            {
              label: "OEM Part No.",
              fieldname: "oem_part_no",
              fieldtype: "Data",
              in_list_view: 1,
              reqd: 1,
            },
            COLUMN_BREAK(),
            {
              label: "Alt. Part No.",
              fieldname: "alt_part_no",
              fieldtype: "Data",
              in_list_view: 1,
            },
            COLUMN_BREAK(),
            {
              label: "Alt. Part No.",
              fieldname: "alt_part_no_1",
              fieldtype: "Data",
              in_list_view: 1,
            },
            COLUMN_BREAK(),
            {
              label: "Alt. Part No.",
              fieldname: "alt_part_no_2",
              fieldtype: "Data",
              in_list_view: 1,
              columns: 1,
            },
          ],
        },
      ],
      primary_action_label: __("Save Filters & Belts Config"),
      primary_action: function () {},
      secondary_action_label: __("Cancel"),
      secondary_action: function () {
        dialog.hide();
      },
    });
    dialog.show();
  },
  last_service_hmr: function (frm) {
    frm.set_value(
      "next_service_hmr",
      frm.doc.last_service_hmr + frm.doc.service_interval_hours
    );
  },
  last_service_type: function (frm) {
    frm.set_value(
      "next_service_type",
      frm.doc.last_service_type + frm.doc.service_interval_hours
    );
  },
  set_logger_btns(frm) {
    const btnGroupLabel = __("Logger");
    frm.add_custom_button(
      __("&plus; <b>Service</b> Log"),
      function () {
        frm.events.do_show_new_service_log_dialog(frm);
      },
      btnGroupLabel
    );
    frm.add_custom_button(
      __("&plus; <b>HMR</b> Log"),
      function () {
        frm.events.do_show_new_hmr_log_dialog(frm);
      },
      btnGroupLabel
    );
    frm.add_custom_button(
      __("&plus; <b>Breakdown</b> Log"),
      function () {
        frm.events.do_show_new_breakdown_log_dialog(frm);
      },
      btnGroupLabel
    );
    frm.add_custom_button(
      __("&plus; <b>Defects</b> Log"),
      function () {
        frm.events.do_show_new_defects_log_dialog(frm);
      },
      btnGroupLabel
    );
    frm.page.set_inner_btn_group_as_primary(btnGroupLabel);
  },
  do_upload_get_component_image(frm) {
    let dialog = new frappe.ui.Dialog({
      title: __("Upload GET Component Image"),
      fields: [
        {
          label: "Component",
          fieldname: "component",
          fieldtype: "Link",
          options: "FT GET Component",
          reqd: 1,
          get_query: function () {
            return {
              filters: {
                name: ["in", frm.doc.get_components.map((d) => d.component)],
              },
            };
          },
        },
        {
          label: "Image",
          fieldname: "image",
          fieldtype: "Attach",
          reqd: 1,
        },
      ],
      primary_action_label: __("Upload"),
      primary_action: function () {
        let values = dialog.get_values();
        if (!values) return;
        const { component, image } = values;
        frappe.call({
          method:
            "mxg_fleet_track.mxg_fleet_track.doctype.ft_machine.ft_machine.upload_get_component_image",
          args: {
            sn: frm.doc.name,
            component,
            image,
          },
          callback: function (r) {
            if (!r.exc) {
              frappe.show_alert({
                message: __("Image uploaded successfully"),
                indicator: "green",
              });
              dialog.hide();
            }
          },
        });
      },
    });
    dialog.show();
  },
  do_show_new_defects_log_dialog(frm) {
    let d = new frappe.ui.Dialog({
      title:
        "<b>Fleetrack&trade;</b> Defects Log <br> <small>Warranty Status will be updated automatically.</small>",
      fields: [
        {
          label: "On Hold?",
          fieldname: "on_hold",
          fieldtype: "Check",
          bold: 1,
        },
        {
          label: "",
          fieldname: "sec_br2ted",
          fieldtype: "Section Break",
          hide_border: 1,
        },
        {
          label: "Customer",
          fieldname: "customer",
          fieldtype: "Data",
          read_only: 1,
          bold: 1,
        },
        {
          label: "",
          fieldname: "col_br_rn",
          fieldtype: "Column Break",
        },
        {
          label: "Defect Level",
          fieldname: "defect_type",
          fieldtype: "Select",
          reqd: 1,
          options: "\nMinor\nMajor",
        },
        {
          label: "",
          fieldname: "col_br_rted1",
          fieldtype: "Column Break",
        },
        {
          label: "Ted Status",
          fieldname: "ted_status",
          fieldtype: "Select",
          options: "\nAvailable\nTBA",
          depends_on: "eval:!doc.on_hold",
          mandatory_depends_on: "eval:!doc.on_hold",
        },
        {
          label: "",
          fieldname: "sec_br2",
          fieldtype: "Section Break",
          hide_border: 1,
        },
        {
          label: "Machine SN",
          fieldname: "machine_sn",
          fieldtype: "Data",
          reqd: 1,
          read_only: 1,
          bold: 1,
        },
        {
          label: "Start Date",
          fieldname: "start_date",
          fieldtype: "Date",
          reqd: 1,
        },
        {
          label: "Category",
          fieldname: "category",
          fieldtype: "Link",
          options: "FT Defect Category",
          reqd: 1,
        },
        {
          fieldname: "col_1",
          fieldtype: "Column Break",
        },
        {
          label: "Machine",
          fieldname: "machine",
          fieldtype: "Data",
          read_only: 1,
        },
        {
          label: "End Date",
          fieldname: "end_date",
          fieldtype: "Date",
        },
        {
          label: "Description",
          fieldname: "description",
          fieldtype: "Data",
          reqd: 1,
        },
        {
          label: "",
          fieldname: "sec_br",
          fieldtype: "Section Break",
          hide_border: 1,
        },
        {
          label: "Priority",
          fieldname: "priority",
          fieldtype: "Select",
          reqd: 1,
          options: "\nLow\nMedium\nHigh",
        },
        {
          label: "",
          fieldname: "cll2",
          fieldtype: "Column Break",
        },
        {
          label: "Parts ETA",
          fieldname: "parts_eta",
          fieldtype: "Date",
        },
        {
          label: "",
          fieldname: "cll",
          fieldtype: "Column Break",
        },
        {
          label: "TED",
          fieldname: "ted",
          fieldtype: "Date",
          mandatory_depends_on:
            "eval:(!doc.on_hold && doc.ted_status !== 'TBA')",
        },
        {
          label: "",
          fieldname: "sec_brl",
          fieldtype: "Section Break",
          hide_border: 1,
        },
        {
          label: "Solution",
          fieldname: "solution",
          fieldtype: "Data",
          reqd: 1,
        },
      ],
      primary_action_label: "Submit",
      primary_action(args) {
        if (!args) return;
        frappe.confirm(
          `Log <b>${args.defect_type} defect</b> - <i>${args.description}</i>?`,
          () => {
            frappe
              .call({
                method:
                  "mxg_fleet_track.mxg_fleet_track.doctype.ft_machine.ft_machine.defects_log_entry",
                freeze_message: __("Making Defects Log Entry ..."),
                args: {
                  machine: frm.doc.name,
                  defect_type: args.defect_type,
                  category: args.category,
                  description: args.description,
                  start_date: args.start_date,
                  priority: args.priority,
                  solution: args.solution,
                  end_date: args.end_date,
                  parts_eta: args.parts_eta,
                  ted: args.ted,
                  on_hold: args.on_hold,
                  ted_status: args.ted_status,
                },
                freeze: true,
                callback: function (r) {
                  if (!r.exc) {
                  }
                },
              })
              .done(() => {
                frappe.show_alert(
                  {
                    message: __(`Defect logged for <b>${frm.doc.name}</b>`),
                    indicator: "green",
                  },
                  8
                );
                frm.refresh_fields();
                d.hide();
              });
          }
        );
      },
    });
    d.set_values({
      machine_sn: frm.doc.sn,
      machine: frm.doc.model + " [" + frm.doc.type + "]",
      customer: frm.doc.customer,
    });
    d.show();
  },
do_show_new_breakdown_log_dialog(frm) {
  let d = new frappe.ui.Dialog({
    title:
      '<b>Fleetrack&trade;</b> Breakdown Log <br> <small class="text-muted">Warranty Status will be updated automatically.</small>',
    fields: [
      {
        label: "On Hold?",
        fieldname: "on_hold",
        fieldtype: "Check",
        bold: 1,
      },
      {
        label: "Urgent",
        fieldname: "urgent",
        fieldtype: "Check"
      },
      {
        label: "Quote Sent Date",
        fieldname: "quote_sent_date",
        fieldtype: "Date"
      },

      COLUMN_BREAK(),
      {
        label: "Ted Status",
        fieldname: "ted_status",
        fieldtype: "Select",
        options: "\nAvailable\nTBA",
        depends_on: "eval:!doc.on_hold",
        mandatory_depends_on: "eval:!doc.on_hold",
      },
      SECTION_BREAK("", { hide_border: 1 }),
      {
        label: "BD Category",
        fieldname: "category",
        fieldtype: "Link",
        options: "FT BD Category",
        reqd: 1,
      },
      SECTION_BREAK("", { hide_border: 1 }),
      {
        label: "Customer",
        fieldname: "customer",
        fieldtype: "Data",
        read_only: 1,
        bold: 1,
      },
      COLUMN_BREAK(),
      {
        label: "Location",
        fieldname: "location",
        fieldtype: "Link",
        options: "FT Location",
      },
      COLUMN_BREAK(),
      {
        label: "Responsibility",
        fieldname: "resp",
        fieldtype: "Select",
        options: "\nFSD\nWSD",
        reqd: 1,
      },
      SECTION_BREAK("", { hide_border: 1 }),
      {
        label: "Machine SN",
        fieldname: "machine_sn",
        fieldtype: "Data",
        reqd: 1,
        read_only: 1,
        bold: 1,
      },
      {
        label: "Breakdown Description",
        fieldname: "description",
        fieldtype: "Data",
        reqd: 1,
      },
      {
        label: "Status",
        fieldname: "status",
        fieldtype: "Data",
        reqd: 1,
      },
      COLUMN_BREAK(),
      {
        label: "Machine",
        fieldname: "machine",
        fieldtype: "Data",
        read_only: 1,
      },
      {
        label: "Breakdown Date",
        fieldname: "breakdown_date",
        fieldtype: "Date",
        reqd: 1,
      },
      {
        label: "Breakdown End Date",
        fieldname: "end_date",
        fieldtype: "Date",
      },
      SECTION_BREAK("", { hide_border: 1 }),
      {
        label: "TED",
        fieldname: "ted",
        fieldtype: "Date",
        mandatory_depends_on:
          "eval:(!doc.on_hold && doc.ted_status !== 'TBA')",
      },
      COLUMN_BREAK(),
      {
        label: "Parts ETA",
        fieldname: "parts_eta",
        fieldtype: "Date",
      },
      COLUMN_BREAK(),
      {
        label: "Outwork ETA",
        fieldname: "out_eta",
        fieldtype: "Date",
      },
    ],
    primary_action_label: "Submit",
    primary_action(args) {
      if (!args) return;

      frappe.confirm(
        __(
          `Are you sure to make Breakdown Entry: <b>${args.description}</b> (${args.breakdown_date})`
        ),
        () => {
          frappe
            .call({
              method:
                "mxg_fleet_track.mxg_fleet_track.doctype.ft_machine.ft_machine.breakdown_log_entry",
              freeze_message: __("Making Breakdown Log Entry ..."),
              args: {
                resp: args.resp,
                machine: frm.doc.name,
                description: args.description,
                category: args.category,
                breakdown_date: args.breakdown_date,
                status: args.status,
                end_date: args.end_date,
                ted: args.ted,
                parts_eta: args.parts_eta,
                out_eta: args.out_eta,
                on_hold: args.on_hold,
                ted_status: args.ted_status,
                // NEW ↓ pass the added fields
                urgent: args.urgent,
                quote_sent_date: args.quote_sent_date,
              },
              freeze: true,
              callback: function (r) {
                if (!r.exc) {
                }
              },
            })
            .done(() => {
              frappe.show_alert(
                {
                  message: __(`Breakdown logged for <b>${frm.doc.name}</b>`),
                  indicator: "green",
                },
                8
              );
              frm.refresh_fields();
              d.hide();
            });
        }
      );
    },
  });
  d.set_values({
    machine_sn: frm.doc.sn,
    machine: frm.doc.model + " [" + frm.doc.type + "]",
    customer: frm.doc.customer,
    location: frm.doc.location,
  });
  d.show();
},
  do_show_new_hmr_log_dialog(frm) {
    let d = new frappe.ui.Dialog({
      title: "<b>Fleetrack&trade;</b> Weekly HMR Log",
      fields: [
        {
          label: "Customer",
          fieldname: "customer",
          fieldtype: "Data",
          read_only: 1,
        },
        {
          label: "",
          fieldname: "sec_br2",
          fieldtype: "Section Break",
          hide_border: 1,
        },
        {
          label: "Machine SN",
          fieldname: "machine_sn",
          fieldtype: "Data",
          reqd: 1,
          read_only: 1,
        },
        {
          fieldname: "col_1",
          fieldtype: "Column Break",
        },
        {
          label: "Machine",
          fieldname: "machine",
          fieldtype: "Data",
          read_only: 1,
        },
        {
          label: "",
          fieldname: "sec_br_fx",
          fieldtype: "Section Break",
        },
        {
          label: "Reading Date",
          fieldname: "reading_date",
          fieldtype: "Date",
          reqd: 1,
        },
        {
          label: "",
          fieldname: "hmr_col_br1",
          fieldtype: "Column Break",
        },
        {
          label: "HM Reading",
          fieldname: "hmr",
          fieldtype: "Float",
          precision: 2,
          reqd: 1,
          onchange: function (e) {
            if (this.value > 0) {
              if (this.value < frm.doc.current_hmr) {
                d.set_value("op_hours", this.value);
              } else {
                d.set_value("op_hours", this.value - frm.doc.current_hmr);
              }
            }
          },
        },
        {
          label: "",
          fieldname: "sec_br",
          fieldtype: "Section Break",
          hide_border: 1,
        },
        {
          label: "Previous HMR",
          fieldname: "hmr_on_log",
          fieldtype: "Float",
          precision: 2,
          read_only: 1,
        },
        {
          label: "",
          fieldname: "hmr_col_brr1",
          fieldtype: "Column Break",
        },
        {
          label: "OP Hours",
          fieldname: "prov_op_hours",
          fieldtype: "Float",
          precision: 2,
          onchange: function (e) {
            //recalculate fuel_consumption
          },
        },
        {
          label: "Operating Hours",
          fieldname: "op_hours",
          fieldtype: "Float",
          precision: 2,
          hidden: 1,
          onchange: function (e) {
            //recalculate fuel_consumption
          },
        },
        {
          label: "",
          fieldname: "tele_col_2",
          fieldtype: "Column Break",
        },
        {
          label: "Telematics?",
          fieldname: "has_telemetry",
          fieldtype: "Select",
          reqd: 1,
          options: "\nNo\nYes",
          onchange: function (e) {
            // if (this.value === "Yes") {
            //     cur_dialog.fields_dict.fuel_consumed.df.reqd = 1;
            // } else {
            //     cur_dialog.fields_dict.fuel_consumed.df.reqd = 0;
            // }
          },
        },
        {
          label: "",
          fieldname: "col_tele1",
          fieldtype: "Column Break",
        },
        {
          label: "Fuel Cons. (l)",
          fieldname: "fuel_consumed",
          fieldtype: "Float",
          precision: 2,
          reqd: 1,
          onchange: function (e) {
            if (cur_dialog.fields_dict.op_hours.value > 0) {
              if (cur_dialog.fields_dict.prov_op_hours.value) {
                d.set_value(
                  "fuel_consumption",
                  this.value / cur_dialog.fields_dict.prov_op_hours.value
                );
              } else {
                d.set_value(
                  "fuel_consumption",
                  this.value / cur_dialog.fields_dict.op_hours.value
                );
              }
            }
          },
          depends_on: "eval: doc.has_telemetry === 'Yes'",
          read_only_depends_on: "eval: doc.hmr === 0",
          mandatory_depends_on: "eval: doc.has_telemetry === 'Yes'",
        },
        {
          label: "",
          fieldname: "secbr3",
          fieldtype: "Section Break",
          depends_on: "eval: doc.has_telemetry === 'Yes'",
        },
        {
          label: "Fuel Consump. (l/h)",
          fieldname: "fuel_consumption",
          fieldtype: "Float",
          precision: 2,
          read_only: 1,
          // depends_on: "eval: doc.has_telemetry === 'Yes'"
        },
        {
          label: "",
          fieldname: "col_tele1",
          fieldtype: "Column Break",
        },
        {
          label: "Idling On",
          fieldname: "ignition_on",
          fieldtype: "Float",
          precision: 2,
          // depends_on: "eval: doc.has_telemetry === 'Yes'"
        },
        {
          label: "",
          fieldname: "col_tele2",
          fieldtype: "Column Break",
        },
        {
          label: "Engine On",
          fieldname: "engine_on",
          fieldtype: "Float",
          precision: 2,
          // depends_on: "eval: doc.has_telemetry === 'Yes'"
        },
        {
          label: "",
          fieldname: "col_tele2",
          fieldtype: "Column Break",
        },
        {
          label: "Operation",
          fieldname: "operation",
          fieldtype: "Float",
          precision: 2,
          // depends_on: 'eval: doc.has_telemetry === "Yes"'
        },
      ],
      primary_action_label: "Submit",
      primary_action(args) {
        if (!args) return;
        if (args.hmr === 0) {
          frappe.throw({
            message: "Hour Meter Reading cannot be Zero",
            title: __("Invalid Input"),
            indicator: "red",
          });
        }
        // else if (args.hmr <= frm.doc.current_hmr) {
        //     frappe.throw({
        //         message: 'Hour Meter Reading cannot ' +
        //             'be Less than or equal ' +
        //             'to <b>' + frm.doc.current_hmr + '</b>',
        //         title: __('Validation Error'),
        //         indicator: 'red'
        //     })
        // }

        frappe.confirm(__("Confirm <b>HMR Log</b> Entry?"), function () {
          frappe
            .call({
              method:
                "mxg_fleet_track.mxg_fleet_track.doctype.ft_machine.ft_machine.hmr_log_entry",
              freeze_message: __("Making HMR Log Entry ..."),
              args: {
                machine: frm.doc.name,
                reading_date: args.reading_date,
                hmr: args.hmr,
                hmr_on_log: frm.doc.current_hmr,
                has_telemetry: args.has_telemetry,
                op_hours: args.op_hours,
                prov_op_hours: args.prov_op_hours,
                fuel_consumed: args.fuel_consumed,
                ignition_on: args.ignition_on,
                engine_on: args.engine_on,
                operation: args.operation,
              },
              freeze: true,
              callback: function (r) {},
            })
            .done(() => {
              frappe.show_alert(
                {
                  message: __(
                    `Weekly HMR Log updated for <b>${frm.doc.name}</b>`
                  ),
                  indicator: "green",
                },
                8
              );
              frm.refresh_fields();
              d.hide();
            });
        });
      },
    });
    d.set_values({
      machine_sn: frm.doc.sn,
      machine: frm.doc.model + " (" + frm.doc.type + ")",
      customer: frm.doc.customer,
      logger: frappe.session.user_fullname,
      hmr_on_log: frm.doc.current_hmr,
      has_telemetry: frm.doc.has_telematics_device,
    });
    d.show();
  },
  do_show_new_service_log_dialog(frm) {
    let d = new frappe.ui.Dialog({
      title: "<b>Fleetrack&trade;</b> Service Log",
      fields: [
        {
          label: "Customer",
          fieldname: "customer",
          fieldtype: "Data",
          read_only: 1,
          bold: 1,
        },
        {
          label: "",
          fieldname: "sec_br2",
          fieldtype: "Section Break",
          hide_border: 1,
        },
        {
          label: "Machine SN",
          fieldname: "machine_sn",
          fieldtype: "Data",
          reqd: 1,
          read_only: 1,
          bold: 1,
        },
        {
          label: "Service Type",
          fieldname: "service_type",
          fieldtype: "Float",
          precision: 2,
          bold: 1,
        },
        {
          label: "Service Date",
          fieldname: "service_date",
          fieldtype: "Date",
          reqd: 1,
        },
        {
          fieldname: "col_1",
          fieldtype: "Column Break",
        },
        {
          label: "Machine",
          fieldname: "machine",
          fieldtype: "Data",
          read_only: 1,
        },
        {
          label: "Technician",
          fieldname: "technician",
          fieldtype: "Link",
          reqd: 1,
          options: "FT Technician",
        },
        {
          label: "Service HMR",
          fieldname: "service_hmr",
          fieldtype: "Float",
          precision: 2,
          reqd: 1,
        },
        {
          label: "",
          fieldname: "sec_br",
          fieldtype: "Section Break",
          hide_border: 1,
        },
        {
          label: "Notes",
          fieldname: "notes",
          fieldtype: "Data",
          reqd: 1,
        },
      ],
      primary_action_label: "Submit",
      primary_action(args) {
        if (!args) return;
        if (args.service_hmr === 0) {
          frappe.throw({
            message: "Hour Meter Reading cannot be Zero",
            title: __("Invalid Input"),
            indicator: "red",
          });
        }

        frappe.confirm(
          __(
            `Confirm <b>${args.service_type} HOUR Service</b> was done at ${args.service_hmr} HMR? `
          ),
          () => {
            frappe
              .call({
                method:
                  "mxg_fleet_track.mxg_fleet_track.doctype.ft_machine.ft_machine.service_log_entry",
                freeze_message: __("Making Service Log Entry ..."),
                args: {
                  machine: frm.doc.name,
                  service_date: args.service_date,
                  technician: args.technician,
                  service_hmr: args.service_hmr,
                  service_type: args.service_type,
                  notes: args.notes,
                },
                freeze: true,
                callback: function (r) {
                  if (!r.exc) {
                  }
                },
              })
              .done(() => {
                frappe.show_alert(
                  {
                    message: __(`Service logged for <b>${frm.doc.name}</b>`),
                    indicator: "green",
                  },
                  8
                );
                frm.refresh_fields();
                d.hide();
              });
          }
        );
      },
    });
    d.set_values({
      machine_sn: frm.doc.sn,
      machine: frm.doc.model + " [" + frm.doc.type + "]",
      customer: frm.doc.customer,
      service_type: frm.doc.next_service_type,
    });
    d.show();
  },
  set_sub_heading(frm) {
    const doc = frm.doc;
    if (frm.is_new()) {
      $("#page-FT\\ Machine div.ellipsis.sub-heading.text-muted").html(
        `Adding new machine to <b>EPR</b> database.`
      );
    } else {
      if (doc.fleetrack_managed === "Yes") {
        $("#page-FT\\ Machine div.ellipsis.sub-heading.text-muted").html(
          `[${frm.doc.type}] &mdash; ${frm.doc.sn} <b>Fleetrack&trade;</b> Managed`
        );
      } else {
        $("#page-FT\\ Machine div.ellipsis.sub-heading.text-muted").html(
          `[${frm.doc.type}] &mdash; ${frm.doc.sn}`
        );
      }
    }
  },
  set_fleetrack_actions_button(frm) {
    const doc = frm.doc;
    const fleetrackManaged = doc.fleetrack_managed == "Yes" ? true : false;
    if (!frm.is_new()) {
      if (fleetrackManaged) {
        frm.add_custom_button(
          "Library",
          function () {
            frm.events.do_show_library_dialog(frm);
          },
          "Fleetrack"
        );
      }

      if (
        frappe.user.has_role("MXG-CONTROLLER") ||
        frappe.user.has_role("System Manager")
      ) {
        let fleetrackStatusLabel = "";
        if (doc.fleetrack_managed === "Yes") {
          fleetrackStatusLabel = "Remove from Fleetrack&trade;";
        } else {
          fleetrackStatusLabel = "Add to Fleetrack&trade;";
        }
        frm.add_custom_button(
          __(fleetrackStatusLabel),
          function () {
            if (doc.fleetrack_managed === "No") {
              frm.events.do_add_machine_to_fleetrack(frm);
            } else {
              frm.events.do_remove_machine_from_fleetrack(frm);
            }
          },
          "Fleetrack"
        );
        if (!frm.doc.mxg_fleet_no) {
          frm.add_custom_button(
            __("Generate <b>Fleet No.</b>"),
            () => {
              frm.events.do_generate_fleet_no(frm);
            },
            __("Fleetrack")
          );
        }
        frm.add_custom_button(
          __("Refresh <b>Hours Remaining to Service</b>"),
          () => {
            frm.events.do_refresh_hours_remaining_to_service(frm);
          },
          __("Fleetrack")
        );
      }
    }
  },
  set_reports_btn(frm) {
    const doc = frm.doc;
    frm.add_custom_button(
      "<b>+MCA</b> Report",
      function () {
        frm.events.do_show_new_mca_report_dialog(frm);
      },
      "Reports"
    );
    frm.add_custom_button(
      "<b>+MWR</b> Report (Single)",
      function () {
        frm.events.do_show_new_mwr_report_dialog(frm);
      },
      "Reports"
    );
    frm.add_custom_button(
      "<b>+MFR</b> Report",
      function () {
        frm.events.do_show_new_mfr_report_dialog(frm);
      },
      "Reports"
    );
    frm.add_custom_button(
      "<b>+JRV</b>",
      function () {
        frm.events.do_show_new_jrv_report_dialog(frm);
      },
      "Reports"
    );
  },
  do_show_new_mfr_report_dialog(frm) {
    frappe.confirm(
      __("Confirm <b>MFR Report</b> Entry?"),
      () => {
        frappe.new_doc("FT Machine Failure", {
          machine: frm.doc.name,
        });
        frappe.show_alert(
          {
            message: __(
              `Creating MFR Report for <b>${frm.doc.name}</b>. Fill in the rest of the details and submit.`
            ),
            indicator: "yellow",
          },
          8
        );
      },
      () => {
        return;
      }
    );
  },
  do_show_new_jrv_report_dialog(frm) {
    frappe.confirm(
      __("Confirm <b>JRV</b> Entry?"),
      () => {
        frappe.new_doc("FT JRV", {
          machine: frm.doc.name,
        });
        frappe.show_alert(
          {
            message: __(
              `Creating JRV for <b>${frm.doc.name}</b>. Fill in the rest of the details and submit.`
            ),
            indicator: "yellow",
          },
          8
        );
      },
      () => {
        return;
      }
    );
  },
  do_show_new_mwr_report_dialog(frm) {
    frappe.confirm(
      __("Confirm <b>MWR/Advisory Report</b> Entry?"),
      () => {
        frappe.new_doc("FT Maintenance Warning Report", {
          machine: frm.doc.name,
          mwr_mode: "Single Machine",
        });
        frappe.show_alert(
          {
            message: __(
              `Creating MWR Report for <b>${frm.doc.name}</b>. Fill in the rest of the details and submit.`
            ),
            indicator: "yellow",
          },
          8
        );
      },
      () => {
        return;
      }
    );
  },
  do_show_new_mca_report_dialog(frm) {
    frappe.confirm(
      __("Confirm <b>MCA Report</b> Entry?"),
      () => {
        frappe.new_doc("FT Machine Condition Assessment", {
          machine: frm.doc.name,
        });
        frappe.show_alert(
          {
            message: __(
              `Creating MCA Report for <b>${frm.doc.name}</b>. Fill in the rest of the details and submit.`
            ),
            indicator: "yellow",
          },
          8
        );
      },
      () => {
        return;
      }
    );
  },
  do_show_library_dialog: function (frm) {
    let d = new frappe.ui.Dialog({
      title: "<b>Fleetrack&trade;</b> Machine Library",
      fields: [
        {
          label: "Customer",
          fieldname: "customer",
          fieldtype: "Data",
          read_only: 1,
          bold: 1,
        },
        {
          fieldname: "col_1",
          fieldtype: "Column Break",
        },
        {
          fieldname: "engine_type",
          fieldtype: "Data",
          read_only: 1,
          label: "Engine Type",
        },
        {
          label: "",
          fieldname: "sec_br2",
          fieldtype: "Section Break",
          hide_border: 1,
        },
        {
          label: "Machine SN",
          fieldname: "machine_sn",
          fieldtype: "Data",
          reqd: 1,
          read_only: 1,
          bold: 1,
        },
        {
          label: "Compatible GET",
          fieldname: "compatible_get",
          fieldtype: "Data",
        },
        {
          label: "Belt Dimensions",
          fieldname: "belt_dimensions",
          fieldtype: "Attach",
        },
        {
          label: "Equipment Info. Form",
          fieldname: "equipment_information_form",
          fieldtype: "Attach",
        },
        {
          label: "Hyd. Filters Dimensions",
          fieldname: "hyd_filters_dimensions",
          fieldtype: "Attach",
        },
        {
          label: "NEI Checklist",
          fieldname: "nei_checklist",
          fieldtype: "Attach",
        },
        {
          label: "Machine Data Plate",
          fieldname: "machine_data_plate",
          fieldtype: "Attach Image",
        },
        {
          label: "Misc. Files",
          fieldname: "misc_files",
          fieldtype: "Attach",
        },
        {
          label: "Parts Manuals",
          fieldname: "parts_manuals",
          fieldtype: "Attach",
        },
        {
          label: "Parts Manuals",
          fieldname: "parts_manuals_3",
          fieldtype: "Attach",
        },
        {
          fieldname: "col_1",
          fieldtype: "Column Break",
        },
        {
          label: "Machine",
          fieldname: "machine",
          fieldtype: "Data",
          read_only: 1,
        },
        {
          label: "Lube Types",
          fieldname: "lube_types",
          fieldtype: "Data",
        },
        {
          label: "Filters List",
          fieldname: "filters_list",
          fieldtype: "Attach",
        },
        {
          label: "PDI Checklist",
          fieldname: "pdi_checklist",
          fieldtype: "Attach",
        },
        {
          label: "Wty. Certificate",
          fieldname: "wty_certificate",
          fieldtype: "Attach",
        },
        {
          label: "Machine Picture",
          fieldname: "machine_picture",
          fieldtype: "Attach Image",
        },
        {
          label: "Engine Data Plate",
          fieldname: "engine_data_plate",
          fieldtype: "Attach Image",
        },
        {
          label: "RPC List",
          fieldname: "rpc_list",
          fieldtype: "Attach",
        },
        {
          label: "Parts Manuals",
          fieldname: "parts_manuals_2",
          fieldtype: "Attach",
        },
      ],
      primary_action_label: "Update Library",
      primary_action(args) {
        if (!args) return;

        frappe.confirm(
          __(`Update machine library for ${frm.doc.name}? `),
          () => {
            frappe
              .call({
                method:
                  "mxg_fleet_track.mxg_fleet_track.doctype.ft_machine.ft_machine.update_library",
                freeze_message: __("Updating Machine Library ..."),
                args: {
                  sn: frm.doc.name,
                  belt_dimensions: args.belt_dimensions,
                  filters_list: args.filters_list,
                  equipment_information_form: args.equipment_information_form,
                  hyd_filters_dimensions: args.hyd_filters_dimensions,
                  nei_checklist: args.nei_checklist,
                  pdi_checklist: args.pdi_checklist,
                  compatible_get: args.compatible_get,
                  lube_types: args.lube_types,
                  wty_certificate: args.wty_certificate,
                  machine_picture: args.machine_picture,
                  machine_data_plate: args.machine_data_plate,
                  engine_data_plate: args.engine_data_plate,
                  misc_files: args.misc_files,
                  rpc_list: args.rpc_list,
                  parts_manuals: args.parts_manuals,
                  parts_manuals_2: args.parts_manuals_2,
                  parts_manuals_3: args.parts_manuals_3,
                },
                freeze: true,
                callback: function (r) {
                  if (!r.exc) {
                  }
                },
              })
              .done(() => {
                frappe.show_alert(
                  {
                    message: __(
                      `Machine library for <b>${frm.doc.name}</b> has been updated successfully`
                    ),
                    indicator: "green",
                  },
                  8
                );
                frm.refresh_fields();
                d.hide();
              });
          }
        );
      },
    });
    d.set_values({
      machine_sn: frm.doc.sn,
      machine: frm.doc.model + " [" + frm.doc.type + "]",
      customer: frm.doc.customer,
      engine_type: frm.doc.engine_type,
      belt_dimensions: frm.doc.belt_dimensions,
      filters_list: frm.doc.filters_list,
      equipment_information_form: frm.doc.equipment_information_form,
      hyd_filters_dimensions: frm.doc.hyd_filters_dimensions,
      nei_checklist: frm.doc.nei_checklist,
      pdi_checklist: frm.doc.pdi_checklist,
      compatible_get: frm.doc.compatible_get,
      lube_types: frm.doc.lube_types,
      wty_certificate: frm.doc.wty_certificate,
      machine_picture: frm.doc.machine_picture,
      machine_data_plate: frm.doc.machine_data_plate,
      engine_data_plate: frm.doc.engine_data_plate,
      misc_files: frm.doc.misc_files,
      rpc_list: frm.doc.rpc_list,
      parts_manuals: frm.doc.parts_manuals,
      parts_manuals_2: frm.doc.parts_manuals_2,
      parts_manuals_2: frm.doc.parts_manuals_3,
    });
    d.show();
  },
  do_add_machine_to_fleetrack(frm) {
    frappe.confirm(
      `Confirm adding this machine to <b>Fleetrack&trade;</b>?`,
      () => {
        frappe
          .call({
            method:
              "mxg_fleet_track.mxg_fleet_track.doctype.ft_machine.ft_machine.toggle_fleetrack_status",
            freeze_message: __("Updating record ..."),
            args: {
              sn: frm.doc.name,
            },
            freeze: true,
            callback: () => {},
          })
          .done(() => {
            frappe.show_alert(
              {
                message: __(
                  `Machine <b>SRN ${frm.doc.name}</b> added to <b>Fleetrack&trade;</b>`
                ),
                indicator: "green",
              },
              5
            );
            frm.refresh_fields();
          });
      }
    );
  },
  do_remove_machine_from_fleetrack(frm) {
    frappe.confirm(
      `Confirm you want to remove this machine from <b>Fleetrack&trade;</b>?`,
      () => {
        frappe
          .call({
            method:
              "mxg_fleet_track.mxg_fleet_track.doctype.ft_machine.ft_machine.toggle_fleetrack_status",
            freeze_message: __("Updating record ..."),
            args: {
              sn: frm.doc.name,
            },
            freeze: true,
            callback: function (r) {
              if (!r.exc) {
              }
            },
          })
          .done(() => {
            frappe.show_alert(
              {
                message: __(
                  `Machine <b>SRN ${frm.doc.name}</b> removed from <b>Fleetrack&trade;</b>`
                ),
                indicator: "red",
              },
              5
            );
            frm.refresh_fields();
          });
      }
    );
  },
  btn_view_unique_attachments: function (frm) {
    frappe.dom.freeze("Please wait ...");
    setTimeout(function () {
      frappe.set_route("List", "FT Machine Unique Attachment", {
        machine: frm.doc.name,
      });
      frappe.dom.unfreeze();
    }, 2000);
  },
  btn_prepare_machine_welcome_report: function (frm) {
    frappe.db
      .count("FT Machine Welcome Report", {
        filters: {
          machine: frm.doc.name,
        },
      })
      .then((resultCount) => {
        if (resultCount) {
          frappe.show_alert(
            {
              message: __(
                `Machine Welcome Report for <b>${frm.doc.name}</b> already exists`
              ),
              indicator: "yellow",
            },
            10
          );
          frappe.set_route("List", "FT Machine Welcome Report", {
            machine: frm.doc.name,
          });
        } else {
          frappe.show_alert(
            {
              message: __(
                `Preparing Machine Welcome Report for <b>${frm.doc.name}</b> ...`
              ),
              indicator: "green",
            },
            5
          );
          frappe.new_doc("FT Machine Welcome Report", {
            machine: frm.doc.name,
          });
        }
      });
  },
});
