if (!frappe.boot.developer_mode) {
  // $("#page-Workspaces .standard-actions .btn").hide();
}
$(function () {
  //   $("#page-Workspaces div.ellipsis.sub-heading.hide.text-muted")
  //     .removeClass("hide")
  //     .html("Home");

  $("body > div.main-section > header > div > a > img.app-logo").attr(
    "src",
    "/assets/mxg_fleet_track/img/fleetrack-logo.png"
  );
});
