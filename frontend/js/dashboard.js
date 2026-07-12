requireAuth();
document.getElementById("userBadge").textContent = getName();
document.getElementById("roleBadge").textContent = getRole().replace("_", " ");

async function loadKpis() {
  const grid = document.getElementById("kpiGrid");
  try {
    const kpis = await api.get("/dashboard/kpis");
    const cards = [
      { label: "Active Vehicles", value: kpis.active_vehicles, cls: "kpi-blue" },
      { label: "Available Vehicles", value: kpis.available_vehicles, cls: "kpi-green" },
      { label: "Vehicles in Maintenance", value: kpis.vehicles_in_maintenance, cls: "kpi-orange" },
      { label: "Active Trips", value: kpis.active_trips, cls: "kpi-blue" },
      { label: "Pending Trips", value: kpis.pending_trips, cls: "kpi-blue" },
      { label: "Drivers On Duty", value: kpis.drivers_on_duty, cls: "kpi-blue" },
      { label: "Fleet Utilization", value: `${kpis.fleet_utilization_pct}%`, cls: "kpi-green" },
    ];
    grid.innerHTML = cards
      .map(
        (c) =>
          `<div class="kpi-card ${c.cls}"><div class="value">${c.value}</div><div class="label">${c.label}</div></div>`
      )
      .join("");
  } catch (err) {
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

async function loadRecentTrips() {
  const body = document.getElementById("recentTripsBody");
  try {
    const trips = await api.get("/dashboard/recent-trips");
    if (!trips.length) {
      body.innerHTML = `<tr><td colspan="5">No trips yet.</td></tr>`;
      return;
    }
    body.innerHTML = trips
      .map(
        (t) => `
        <tr>
          <td>TR${t.trip_id}</td>
          <td>${t.vehicle_reg}</td>
          <td>${t.driver_name}</td>
          <td><span class="status-pill ${statusClass(t.status)}">${t.status}</span></td>
          <td>${t.eta}</td>
        </tr>`
      )
      .join("");
  } catch (err) {
    body.innerHTML = `<tr><td colspan="5">Failed to load trips.</td></tr>`;
  }
}

async function loadVehicleStatus() {
  const container = document.getElementById("vehicleStatusBars");
  try {
    const breakdown = await api.get("/dashboard/vehicle-status");
    const classMap = { Available: "available", "On Trip": "ontrip", "In Shop": "inshop", Retired: "retired" };
    container.innerHTML = breakdown
      .map(
        (b) => `
        <div class="status-bar-row">
          <span class="status-name">${b.status}</span>
          <div class="status-bar-track">
            <div class="status-bar-fill ${classMap[b.status] || ""}" style="width:${b.pct}%"></div>
          </div>
        </div>`
      )
      .join("");
  } catch (err) {
    container.innerHTML = "Failed to load vehicle status.";
  }
}

loadKpis();
loadRecentTrips();
loadVehicleStatus();