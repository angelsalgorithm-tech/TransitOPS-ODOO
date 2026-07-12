requireAuth();
document.getElementById("userBadge").textContent = `${getName()} · ${getRole().replace("_", " ")}`;

async function loadKpis() {
  const grid = document.getElementById("kpiGrid");
  try {
    const kpis = await api.get("/dashboard/kpis");
    const cards = [
      { label: "Available Vehicles", value: kpis.available_vehicles },
      { label: "Vehicles in Maintenance", value: kpis.vehicles_in_maintenance },
      { label: "Active Trips", value: kpis.active_trips },
      { label: "Pending Trips", value: kpis.pending_trips },
      { label: "Drivers On Duty", value: kpis.drivers_on_duty },
      { label: "Fleet Utilization", value: `${kpis.fleet_utilization_pct}%` },
    ];
    grid.innerHTML = cards
      .map((c) => `<div class="kpi-card"><div class="value">${c.value}</div><div class="label">${c.label}</div></div>`)
      .join("");
  } catch (err) {
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

loadKpis();
