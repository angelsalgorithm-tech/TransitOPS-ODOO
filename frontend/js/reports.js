requireAuth();
document.getElementById("userBadge").textContent = getName();
document.getElementById("roleBadge").textContent = getRole().replace("_", " ");

function switchTab(tab) {
  document.getElementById("panelFuel")?.classList.toggle("active", tab === "fuel");
  document.getElementById("panelAnalytics")?.classList.toggle("active", tab === "analytics");
  document.getElementById("navFuel")?.classList.toggle("active", tab === "fuel");
  document.getElementById("navAnalytics")?.classList.toggle("active", tab === "analytics");
  const heading = document.getElementById("pageHeading");
  if (heading) heading.textContent = tab === "fuel" ? "Fuel & Expense Management" : "Reports & Analytics";
  if (tab === "analytics") loadAnalytics();
}

function getTabFromHash() {
  return window.location.hash === "#analytics" ? "analytics" : "fuel";
}

window.addEventListener("hashchange", () => switchTab(getTabFromHash()));

const initialTab = getTabFromHash();
switchTab(initialTab);

// ---------- Fuel Modal ----------
function openFuelModal() {
  populateFuelVehicleSelect();
  document.getElementById("fuelModalOverlay").classList.add("open");
}
function closeFuelModal() {
  document.getElementById("fuelModalOverlay").classList.remove("open");
  document.getElementById("fuelModalAlert").innerHTML = "";
  document.getElementById("fuelForm").reset();
}
async function populateFuelVehicleSelect() {
  try {
    const vehicles = await api.get("/vehicles");
    document.getElementById("fuelVehicle").innerHTML = vehicles
      .map((v) => `<option value="${v._id}">${v.reg_number} — ${v.name}</option>`)
      .join("");
  } catch (err) {
    console.error("populateFuelVehicleSelect failed:", err);
    document.getElementById("fuelModalAlert").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}
document.getElementById("fuelForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    vehicle_id: document.getElementById("fuelVehicle").value,
    liters: parseFloat(document.getElementById("fuelLiters").value),
    cost: parseFloat(document.getElementById("fuelCost").value),
    date: new Date(document.getElementById("fuelDate").value).toISOString(),
  };
  try {
    await api.post("/fuel-logs", payload);
    closeFuelModal();
    loadFuelLogs();
  } catch (err) {
    console.error("create fuel log failed:", err);
    document.getElementById("fuelModalAlert").innerHTML = `<div class="alert">${err.message}</div>`;
  }
});

// ---------- Expense Modal ----------
function openExpenseModal() {
  populateExpenseSelects();
  document.getElementById("expenseModalOverlay").classList.add("open");
}
function closeExpenseModal() {
  document.getElementById("expenseModalOverlay").classList.remove("open");
  document.getElementById("expenseModalAlert").innerHTML = "";
  document.getElementById("expenseForm").reset();
}
async function populateExpenseSelects() {
  try {
    const [vehicles, trips] = await Promise.all([api.get("/vehicles"), api.get("/trips")]);
    document.getElementById("expenseVehicle").innerHTML = vehicles
      .map((v) => `<option value="${v._id}">${v.reg_number} — ${v.name}</option>`)
      .join("");
    document.getElementById("expenseTrip").innerHTML =
      `<option value="">— None —</option>` +
      trips.map((t) => `<option value="${t._id}">${t.source} → ${t.destination} (${t.status})</option>`).join("");
  } catch (err) {
    console.error("populateExpenseSelects failed:", err);
    document.getElementById("expenseModalAlert").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}
document.getElementById("expenseForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    vehicle_id: document.getElementById("expenseVehicle").value,
    trip_id: document.getElementById("expenseTrip").value || null,
    toll: parseFloat(document.getElementById("expenseToll").value || 0),
    other: parseFloat(document.getElementById("expenseOther").value || 0),
    date: new Date(document.getElementById("expenseDate").value).toISOString(),
  };
  try {
    await api.post("/expenses", payload);
    closeExpenseModal();
    loadExpenses();
  } catch (err) {
    console.error("create expense failed:", err);
    document.getElementById("expenseModalAlert").innerHTML = `<div class="alert">${err.message}</div>`;
  }
});

// ---------- Fuel & Expense tables ----------
async function loadFuelLogs() {
  const tbody = document.getElementById("fuelTableBody");
  try {
    const logs = await api.get("/fuel-logs");
    tbody.innerHTML = logs.length
      ? logs.map((l) => `
        <tr>
          <td>${l.vehicle_reg}</td>
          <td>${new Date(l.date).toLocaleDateString()}</td>
          <td>${l.liters} L</td>
          <td>${l.cost}</td>
        </tr>`).join("")
      : `<tr><td colspan="4" style="color:var(--muted);">No fuel logs yet.</td></tr>`;
  } catch (err) {
    console.error("loadFuelLogs failed:", err);
    tbody.innerHTML = `<tr><td colspan="4" style="color:var(--red);">Failed to load: ${err.message}</td></tr>`;
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

async function loadExpenses() {
  const tbody = document.getElementById("expenseTableBody");
  try {
    const logs = await api.get("/expenses");
    tbody.innerHTML = logs.length
      ? logs.map((e) => `
        <tr>
          <td>${e.trip_route}</td>
          <td>${e.vehicle_reg}</td>
          <td>${e.toll}</td>
          <td>${e.other}</td>
          <td>${e.maint_linked}</td>
          <td>${e.total}</td>
          <td>${e.trip_status !== "—" ? `<span class="status-pill ${statusClass(e.trip_status)}">${e.trip_status}</span>` : "—"}</td>
        </tr>`).join("")
      : `<tr><td colspan="7" style="color:var(--muted);">No expenses yet.</td></tr>`;
  } catch (err) {
    console.error("loadExpenses failed:", err);
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--red);">Failed to load: ${err.message}</td></tr>`;
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

async function loadTotalOperationalCost() {
  try {
    const costs = await api.get("/reports/vehicle-costs");
    const total = costs.reduce((sum, c) => sum + (c.operational_cost || 0), 0);
    document.getElementById("totalOperationalCost").textContent = total.toLocaleString();
  } catch (err) {
    console.error("loadTotalOperationalCost failed:", err);
    document.getElementById("totalOperationalCost").textContent = "—";
  }
}

// ---------- Status pill helper ----------
function statusClass(status) {
  const s = (status || "").toLowerCase();
  if (s === "completed") return "status-green";
  if (s === "in_progress" || s === "in progress" || s === "ongoing") return "status-blue";
  if (s === "cancelled" || s === "canceled") return "status-red";
  if (s === "scheduled" || s === "pending") return "status-muted";
  return "status-muted";
}

// ---------- Analytics ----------
let analyticsLoaded = false;
async function loadAnalytics() {
  if (analyticsLoaded) return;
  analyticsLoaded = true;
  try {
    const [kpis, costs, revenue] = await Promise.all([
      api.get("/dashboard/kpis"),
      api.get("/reports/vehicle-costs"),
      api.get("/reports/monthly-revenue"),
    ]);

    const withFuel = costs.filter((c) => c.fuel_efficiency_km_per_l != null);
    const avgFuelEff = withFuel.length
      ? (withFuel.reduce((s, c) => s + c.fuel_efficiency_km_per_l, 0) / withFuel.length).toFixed(1)
      : "—";
    document.getElementById("kpiFuelEff").textContent = avgFuelEff !== "—" ? `${avgFuelEff} km/l` : "—";
    document.getElementById("kpiUtilization").textContent = `${kpis.fleet_utilization_pct}%`;

    const totalOpCost = costs.reduce((s, c) => s + (c.operational_cost || 0), 0);
    document.getElementById("kpiOpCost").textContent = totalOpCost.toLocaleString();

    const withRoi = costs.filter((c) => c.roi != null);
    const avgRoi = withRoi.length ? (withRoi.reduce((s, c) => s + c.roi, 0) / withRoi.length) * 100 : null;
    document.getElementById("kpiRoi").textContent = avgRoi != null ? `${avgRoi.toFixed(1)}%` : "—";

    renderRevenueChart(revenue);
    renderCostliestList(costs);
  } catch (err) {
    console.error("loadAnalytics failed:", err);
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
    analyticsLoaded = false;
  }
}

function renderRevenueChart(revenue) {
  const el = document.getElementById("revenueChart");
  if (!el) return;
  if (!revenue || !revenue.length) {
    el.innerHTML = `<p style="color:var(--muted);">No revenue data yet.</p>`;
    return;
  }
  const max = Math.max(...revenue.map((r) => r.revenue || 0), 1);
  el.innerHTML = revenue
    .map((r) => {
      const pct = Math.round(((r.revenue || 0) / max) * 100);
      return `
        <div class="bar-row">
          <span class="bar-label">${r.month}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;"></div>
          </div>
          <span class="bar-value">${(r.revenue || 0).toLocaleString()}</span>
        </div>`;
    })
    .join("");
}

function renderCostliestList(costs) {
  const el = document.getElementById("costliestList");
  if (!el) return;
  if (!costs || !costs.length) {
    el.innerHTML = `<p style="color:var(--muted);">No cost data yet.</p>`;
    return;
  }
  const top = [...costs]
    .sort((a, b) => (b.operational_cost || 0) - (a.operational_cost || 0))
    .slice(0, 5);
  el.innerHTML = top
    .map(
      (c) => `
      <div class="cost-row">
        <span>${c.vehicle_reg || c.reg_number || "—"}</span>
        <span>${(c.operational_cost || 0).toLocaleString()}</span>
      </div>`
    )
    .join("");
}

// ---------- Initial load ----------
loadFuelLogs();
loadExpenses();
loadTotalOperationalCost();