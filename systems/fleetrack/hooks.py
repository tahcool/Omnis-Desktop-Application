from . import __version__ as app_version

app_name = "mxg_fleet_track"
app_title = "MXG Fleet Track"
app_publisher = "Percival Rapha"
app_description = "STS & EPR"
app_email = "percival.rapha@gmail.com"
app_license = "MIT"

fixtures = [
    # Core
    "Custom Field",
    "Client Script",
    "Property Setter",
    "Workflow Action Master",
    "Workflow State",
    "Workflow",
    # Misc (UI)
    "List View Settings",
    "Translation",
    # FT repo
    "FT GET Component",
    # Setup
    "Website Settings",
    "Navbar Settings",
    "System Settings",
    "Color",
    {
        "dt": "Website Theme",
        "filters": [
            ["theme", "=", "Fleetrack"],
        ],
    },
    {
        "dt": "Web Page",
        "filters": [
            ["module", "=", "MXG Fleet Track"],
        ],
    },
    # Permissions
    {"dt": "Role", "filters": [["role_name", "like", "MXG%"]]},
    {
        "dt": "Custom DocPerm",
        "filters": [
            [
                "role",
                "in",
                (
                    "System Manager",
                    "MXG-READ-ONLY",
                    "MXG-CONTROLLER",
                    "MXG-MD",
                    "MXG-STANDARD",
                    "MXG-SEC",
                    "All",
                ),
            ]
        ],
    },
    "Custom Role",
    {"dt": "Module Profile", "filters": [["module_profile_name", "like", "MXG%"]]},
]

website_context = {
    "favicon": "/assets/mxg_fleet_track/img/favicon.ico",
    "splash_image": "/assets/mxg_fleet_track/img/fleetrack-logo.png",
    "brand_html": """<div>
    <img src="/assets/mxg_fleet_track/img/fleetrack-logo.png" style="max-height: 55px !important;  max-width: 260px;"</div>
    """,
}

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = "/assets/mxg_fleet_track/css/desk.css"
app_include_js = [
    "/assets/mxg_fleet_track/js/jszip.min.js",
    "/assets/mxg_fleet_track/js/zip_attach.js",
    "/assets/mxg_fleet_track/js/desk.js",
]

# include js, css files in header of web template
web_include_css = "/assets/mxg_fleet_track/css/web.css"
# web_include_js = "/assets/mxg_fleet_track/js/mxg_fleet_track.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "mxg_fleet_track/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Home Pages
# ----------

# application home page (will override Website Settings)
home_page = "landing"

# website user home page (by Role)
# role_home_page = {
#    "Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
#     "methods": "mxg_fleet_track.utils.jinja_methods",
#     "filters": "mxg_fleet_track.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "mxg_fleet_track.install.before_install"
after_install = "mxg_fleet_track.install.after_install"

before_migrate = "mxg_fleet_track.migrate.before_migrate"
after_migrate = "mxg_fleet_track.migrate.after_migrate"

# Uninstallation
# ------------

# before_uninstall = "mxg_fleet_track.uninstall.before_uninstall"
# after_uninstall = "mxg_fleet_track.uninstall.after_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "mxg_fleet_track.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
#     "Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
#     "Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
#     "ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
#     "*": {
#         "on_update": "method",
#         "on_cancel": "method",
#         "on_trash": "method"
#     }
# }

doc_events = {
    "FT Job Card": {
         "on_update": "mxg_fleet_track.defects.create_defect_logs_from_job_card"
    }
}


# Scheduled Tasks
# ---------------

scheduler_events = {
    # "all": [
    #     "mxg_fleet_track.tasks.all"
    # ],
    "daily": ["mxg_fleet_track.tasks.daily"],
    "hourly": ["mxg_fleet_track.tasks.hourly"],
    # "weekly": [
    #     "mxg_fleet_track.tasks.weekly"
    # ],
    # "monthly": [
    #     "mxg_fleet_track.tasks.monthly"
    # ],
    "daily": ["powerstar_salestrack.api.spw_followup.send_daily_spw_notifications"],
}

# Testing
# -------

# before_tests = "mxg_fleet_track.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
#     "frappe.desk.doctype.event.event.get_events": "mxg_fleet_track.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
#     "Task": "mxg_fleet_track.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]


# User Data Protection
# --------------------

# user_data_fields = [
#     {
#         "doctype": "{doctype_1}",
#         "filter_by": "{filter_by}",
#         "redact_fields": ["{field_1}", "{field_2}"],
#         "partial": 1,
#     },
#     {
#         "doctype": "{doctype_2}",
#         "filter_by": "{filter_by}",
#         "partial": 1,
#     },
#     {
#         "doctype": "{doctype_3}",
#         "strict": False,
#     },
#     {
#         "doctype": "{doctype_4}"
#     }
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
#     "mxg_fleet_track.auth.validate"
# ]