requireAuth();
document.getElementById("userBadge").textContent = getName();
document.getElementById("roleBadge").textContent = getRole().replace("_", " ");

let allVehicles = [];

function openModal() { document.getElementById("modalOverlay").classList.add("open"); }
function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  document.getElementById("modalAlert").innerHTML = "";
  document.getElementById("vehicleForm").reset();
}

function renderStats(vehicles) {
  const statsEl = document.getElementById("fleetStats");
  const total = vehicles.length;
  const available = vehicles.filter((v) => v.status === "Available").length;
  const onTrip = vehicles.filter((v) => v.status === "On Trip").length;
  const inShop = vehicles.filter((v) => v.status === "In Shop").length;
  const retired = vehicles.filter((v) => v.status === "Retired").length;

  const cards = [
    { label: "Total Vehicles", value: total, cls: "kpi-blue" },
    { label: "Available", value: available, cls: "kpi-green" },
    { label: "On Trip", value: onTrip, cls: "kpi-blue" },
    { label: "In Shop", value: inShop, cls: "kpi-orange" },
    { label: "Retired", value: retired, cls: "kpi-red" },
  ];
  statsEl.innerHTML = cards
    .map(
      (c) =>
        `<div class="kpi-card ${c.cls}"><div class="value">${c.value}</div><div class="label">${c.label}</div></div>`
    )
    .join("");
}

function renderTable(vehicles) {
  const tbody = document.getElementById("vehicleTableBody");
  if (!vehicles.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--muted);">No vehicles registered yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = vehicles
    .map(
      (v) => `
    <tr>
      <td>${v.reg_number}</td>
      <td>${v.name}</td>
      <td>${v.type}</td>
      <td>${v.max_load_kg}</td>
      <td>${v.odometer}</td>
      <td><span class="status-pill ${statusClass(v.status)}">${v.status}</span></td>
      <td>${v.status !== "Retired" ? `<button class="btn-danger" onclick="retireVehicle('${v._id}')">Retire</button>` : ""}</td>
    </tr>`
    )
    .join("");
}

async function loadVehicles() {
  try {
    allVehicles = await api.get("/vehicles");
    renderStats(allVehicles);
    renderTable(allVehicles);
  } catch (err) {
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

async function retireVehicle(id) {
  if (!confirm("Retire this vehicle? It will no longer be available for dispatch.")) return;
  try {
    await api.del(`/vehicles/${id}`);
    loadVehicles();
  } catch (err) {
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

document.getElementById("vehicleForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    reg_number: document.getElementById("reg_number").value.trim(),
    name: document.getElementById("name").value.trim(),
    type: document.getElementById("type").value,
    max_load_kg: parseFloat(document.getElementById("max_load_kg").value),
    acquisition_cost: parseFloat(document.getElementById("acquisition_cost").value || 0),
  };
  try {
    await api.post("/vehicles", payload);
    closeModal();
    loadVehicles();
  } catch (err) {
    document.getElementById("modalAlert").innerHTML = `<div class="alert">${err.message}</div>`;
  }
});

document.getElementById("vehicleSearch").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = allVehicles.filter(
    (v) => v.reg_number.toLowerCase().includes(q) || v.name.toLowerCase().includes(q)
  );
  renderTable(filtered);
});

loadVehicles();