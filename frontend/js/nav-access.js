// nav-access.js
const ROLE_PAGES = {
  fleet_manager:     ["vehicles.html", "maintenance.html"],
  dispatcher:        ["dashboard.html", "trips.html"],
  safety_officer:    ["drivers.html", "compliance.html"],
  financial_analyst: ["reports.html"],
};

const ALWAYS_ALLOWED = ["settings.html"];

function normalize(str) {
  return (str || "").toString().trim().toLowerCase().replace(/\s+/g, "_");
}

function getAllowedPages(role) {
  const key = normalize(role);
  return ROLE_PAGES[key] || [];
}

function applyNavAccess() {
  const role = getRole();
  console.log("[nav-access] raw role:", JSON.stringify(role));
  const allowed = getAllowedPages(role);
  console.log("[nav-access] allowed pages:", allowed);

  document.querySelectorAll(".sidebar a[href]").forEach((link) => {
    const href = normalize(link.getAttribute("href").split("#")[0]);
    if (!href || href === "#") return;
    const isAllowed = allowed.map(normalize).includes(href) || ALWAYS_ALLOWED.map(normalize).includes(href);
    link.style.display = isAllowed ? "" : "none";
  });

  const currentPage = normalize(window.location.pathname.split("/").pop());
  const isCurrentAllowed =
    allowed.map(normalize).includes(currentPage) || ALWAYS_ALLOWED.map(normalize).includes(currentPage);

  if (!isCurrentAllowed) {
    const fallback = allowed[0] || "settings.html";
    window.location.href = fallback;
  }
}

applyNavAccess();