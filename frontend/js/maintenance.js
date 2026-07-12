requireAuth();

function openModal() {
  populateVehicleSelect();
  document.getElementById("modalOverlay").classList.add("open");
}
function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  document.getElementById("modalAlert").innerHTML = "";
  document.getElementById("maintenanceForm").reset();
}

async function populateVehicleSelect() {
  try {
    const vehicles = await api.get("/vehicles");
    const eligible = vehicles.filter((v) => v.status !== "On Trip" && v.status !== "Retired");
    document.getElementById("vehicle_id").innerHTML = eligible
      .map((v) => `<option value="${v._id}">${v.reg_number} — ${v.name} (${v.status})</option>`)
      .join("") || `<option disabled>No eligible vehicles</option>`;
  } catch (err) {
    document.getElementById("modalAlert").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

async function loadMaintenance() {
  const tbody = document.getElementById("maintenanceTableBody");
  try {
    const logs = await api.get("/maintenance");
    if (!logs.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="color:var(--muted);">No maintenance records yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = logs
      .map(
        (m) => `
      <tr>
        <td>${m.vehicle_id.slice(-6)}</td>
        <td>${m.issue}</td>
        <td>${m.cost}</td>
        <td><span class="status-pill ${statusClass(m.status)}">${m.status}</span></td>
        <td>${m.status === "Open" ? `<button class="btn-secondary" onclick="closeMaintenance('${m._id}')">Close</button>` : ""}</td>
      </tr>`
      )
      .join("");
  } catch (err) {
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

async function closeMaintenance(id) {
  try {
    await api.post(`/maintenance/${id}/close`);
    loadMaintenance();
  } catch (err) {
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

document.getElementById("maintenanceForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    vehicle_id: document.getElementById("vehicle_id").value,
    issue: document.getElementById("issue").value.trim(),
    cost: parseFloat(document.getElementById("cost").value || 0),
    notes: document.getElementById("notes").value.trim(),
  };
  try {
    await api.post("/maintenance", payload);
    closeModal();
    loadMaintenance();
  } catch (err) {
    document.getElementById("modalAlert").innerHTML = `<div class="alert">${err.message}</div>`;
  }
});

loadMaintenance();
