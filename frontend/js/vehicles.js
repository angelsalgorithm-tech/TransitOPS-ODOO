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

function renderTable(vehicles) {
  const tbody = document.getElementById("vehicleTableBody");
  if (!vehicles.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:var(--muted);">No vehicles found.</td></tr>`;
    return;
  }
  tbody.innerHTML = vehicles
    .map(
      (v) => `
    <tr>
      <td>${v.reg_number}</td>
      <td>${v.name}</td>
      <td>${v.type}</td>
      <td>${v.max_load_kg} kg</td>
      <td>${v.odometer}</td>
      <td>${v.acquisition_cost != null ? v.acquisition_cost.toLocaleString() : "—"}</td>
      <td><span class="status-pill ${statusClass(v.status)}">${v.status}</span></td>
      <td>${v.status !== "Retired" ? `<button class="btn-danger" onclick="retireVehicle('${v._id}')">Retire</button>` : ""}</td>
    </tr>`
    )
    .join("");
}

function applyFilters() {
  const type = document.getElementById("typeFilter").value;
  const status = document.getElementById("statusFilter").value;
  const reg = document.getElementById("regSearch").value.toLowerCase();

  const filtered = allVehicles.filter((v) => {
    if (type && v.type !== type) return false;
    if (status && v.status !== status) return false;
    if (reg && !v.reg_number.toLowerCase().includes(reg)) return false;
    return true;
  });
  renderTable(filtered);
}

async function loadVehicles() {
  try {
    allVehicles = await api.get("/vehicles");
    applyFilters();
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

document.getElementById("typeFilter").addEventListener("change", applyFilters);
document.getElementById("statusFilter").addEventListener("change", applyFilters);
document.getElementById("regSearch").addEventListener("input", applyFilters);

loadVehicles();