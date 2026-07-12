requireAuth();

let lastReport = [];

async function loadReports() {
  const tbody = document.getElementById("reportTableBody");
  try {
    lastReport = await api.get("/reports/vehicle-costs");
    if (!lastReport.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="color:var(--muted);">No vehicles to report on yet.</td></tr>`;
    } else {
      tbody.innerHTML = lastReport
        .map(
          (r) => `
        <tr>
          <td>${r.reg_number} — ${r.name}</td>
          <td>${r.total_fuel_cost}</td>
          <td>${r.total_maintenance_cost}</td>
          <td>${r.operational_cost}</td>
          <td>${r.total_distance_km}</td>
          <td>${r.fuel_efficiency_km_per_l ?? "—"}</td>
          <td>${r.roi ?? "—"}</td>
        </tr>`
        )
        .join("");
    }
  } catch (err) {
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }

  const licenseTbody = document.getElementById("licenseTableBody");
  try {
    const drivers = await api.get("/reports/expiring-licenses");
    if (!drivers.length) {
      licenseTbody.innerHTML = `<tr><td colspan="3" style="color:var(--muted);">No licenses expiring soon.</td></tr>`;
    } else {
      licenseTbody.innerHTML = drivers
        .map(
          (d) => `<tr><td>${d.name}</td><td>${d.license_number}</td><td>${new Date(d.license_expiry).toLocaleDateString()}</td></tr>`
        )
        .join("");
    }
  } catch (err) {
    licenseTbody.innerHTML = `<tr><td colspan="3">${err.message}</td></tr>`;
  }
}

function exportCsv() {
  if (!lastReport.length) return;
  const headers = ["reg_number", "name", "total_fuel_cost", "total_maintenance_cost", "operational_cost", "total_distance_km", "fuel_efficiency_km_per_l", "roi"];
  const rows = lastReport.map((r) => headers.map((h) => r[h]).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "transitops_report.csv";
  a.click();
  URL.revokeObjectURL(url);
}

loadReports();
