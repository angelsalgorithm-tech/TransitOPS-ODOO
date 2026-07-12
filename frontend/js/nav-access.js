// nav-access.js — hardcoded, forceful role-based sidebar visibility
window.addEventListener("load", function () {
  var role = (typeof getRole === "function" ? getRole() : "") || "";
  role = role.toString().trim().toLowerCase();

  var PAGE_MAP = {
    "dashboard.html": ["dispatcher"],
    "vehicles.html": ["fleet_manager"],
    "drivers.html": ["safety_officer"],
    "compliance.html": ["safety_officer"],
    "trips.html": ["dispatcher"],
    "maintenance.html": ["fleet_manager"],
    "reports.html": ["financial_analyst"],
    "settings.html": ["*"]
  };

  var links = document.querySelectorAll(".sidebar a[href]");
  links.forEach(function (link) {
    var href = link.getAttribute("href").split("#")[0].trim().toLowerCase();
    if (!href || href === "#") return;

    var allowedRoles = PAGE_MAP[href];
    var show = !allowedRoles || allowedRoles.indexOf("*") !== -1 || allowedRoles.indexOf(role) !== -1;

    if (show) {
      link.style.setProperty("display", "block", "important");
    } else {
      link.style.setProperty("display", "none", "important");
    }
  });

  var currentPage = window.location.pathname.split("/").pop().toLowerCase();
  var currentAllowed = PAGE_MAP[currentPage];
  if (currentAllowed && currentAllowed.indexOf("*") === -1 && currentAllowed.indexOf(role) === -1) {
    var fallback = Object.keys(PAGE_MAP).find(function (page) {
      var roles = PAGE_MAP[page];
      return roles.indexOf(role) !== -1;
    }) || "settings.html";
    window.location.href = fallback;
  }
});