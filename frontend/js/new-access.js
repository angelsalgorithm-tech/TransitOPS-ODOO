// nav-access.js
// Include this on every page AFTER auth.js and AFTER requireAuth() has run.
// Requires getRole() to return one of: "fleet_manager", "dispatcher",
// "safety_officer", "financial_analyst" (adjust ROLE_PAGES below if your
// actual role strings differ).

const ROLE_PAGES = {
  fleet_manager:     ["vehicles.html", "maintenance.html"],
  dispatcher:        ["dashboard.html", "trips.html"],
  safety_officer:    ["drivers.html", "compliance.html"],
  financial_analyst: ["reports.html"], // covers both #fuel and #analytics tabs
};

// Pages every logged-in role can always see, regardless of role restrictions.
const ALWAYS_ALLOWED = ["settings.html"];

function getAllowedPages(role) {
  return ROLE_PAGES[role] || [];
}

function applyNavAccess() {
  const role = getRole();
  const allowed = getAllowedPages(role);

  // 1. Hide sidebar links the current role isn't permitted to see.
  document.querySelectorAll(".sidebar a[href]").forEach((link) => {
    const href = link.getAttribute("href").split("#")[0]; // strip #fuel/#analytics
    if (!href || href === "#") return; // skip logout link etc.
    const isAllowed = allowed.includes(href) || ALWAYS_ALLOWED.includes(href);
    link.style.display = isAllowed ? "" : "none";
  });

  // 2. Block direct navigation to a page the role isn't permitted to view.
  const currentPage = window.location.pathname.split("/").pop();
  const isCurrentAllowed =
    allowed.includes(currentPage) || ALWAYS_ALLOWED.includes(currentPage);

  if (!isCurrentAllowed) {
    // Redirect to the first page this role IS allowed to see.
    const fallback = allowed[0] || "settings.html";
    window.location.href = fallback;
  }
}

applyNavAccess();