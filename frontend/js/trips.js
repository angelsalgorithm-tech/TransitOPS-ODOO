requireAuth();

function openModal() {
  populateSelects();
  document.getElementById("modalOverlay").classList.add("open");
}
function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  document.getElementById("modalAlert").innerHTML = "";
  document.getElementById("tripForm").reset();
}

function openCompleteModal(tripId) {
  document.getElementById("completeTripId").value = tripId;
  document.getElementById("completeModalOverlay").classList.add("open");
}
function closeCompleteModal() {
  document.getElementById("completeModalOverlay").classList.remove("open");
  document.getElementById("completeModalAlert").innerHTML = "";
  document.getElementById("completeForm").reset();
}

async function populateSelects() {
  try {
    const [vehicles, drivers] = await Promise.all([
      api.get("/vehicles/available"),
      api.get("/drivers?status=Available"),
    ]);
    document.getElementById("vehicle_id").innerHTML = vehicles
      .map((v) => `<option value="${v._id}">${v.reg_number} — ${v.name} (max ${v.max_load_kg}kg)</option>`)
      .join("") || `<option disabled>No available vehicles</option>`;
    document.getElementById("driver_id").innerHTML = drivers
      .map((d) => `<option value="${d._id}">${d.name} (${d.license_number})</option>`)
      .join("") || `<option disabled>No available drivers</option>`;
  } catch (err) {
    document.getElementById("modalAlert").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

async function loadTrips() {
  const tbody = document.getElementById("tripTableBody");
  try {
    const trips = await api.get("/trips");
    if (!trips.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="color:var(--muted);">No trips yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = trips
      .map((t) => {
        let actions = "";
        if (t.status === "Draft") {
          actions = `
            <button class="btn-secondary" onclick="dispatchTrip('${t._id}')">Dispatch</button>
            <button class="btn-danger" onclick="cancelTrip('${t._id}')">Cancel</button>`;
        } else if (t.status === "Dispatched") {
          actions = `
            <button class="btn-secondary" onclick="openCompleteModal('${t._id}')">Complete</button>
            <button class="btn-danger" onclick="cancelTrip('${t._id}')">Cancel</button>`;
        }
        return `
      <tr>
        <td>${t.source} → ${t.destination}</td>
        <td>${t.vehicle_id.slice(-6)}</td>
        <td>${t.driver_id.slice(-6)}</td>
        <td>${t.cargo_weight_kg}</td>
        <td>${t.planned_distance_km}</td>
        <td><span class="status-pill ${statusClass(t.status)}">${t.status}</span></td>
        <td style="white-space:nowrap;">${actions}</td>
      </tr>`;
      })
      .join("");
  } catch (err) {
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

async function dispatchTrip(id) {
  try {
    await api.post(`/trips/${id}/dispatch`);
    loadTrips();
  } catch (err) {
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

async function cancelTrip(id) {
  if (!confirm("Cancel this trip?")) return;
  try {
    await api.post(`/trips/${id}/cancel`);
    loadTrips();
  } catch (err) {
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

document.getElementById("tripForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    source: document.getElementById("source").value.trim(),
    destination: document.getElementById("destination").value.trim(),
    vehicle_id: document.getElementById("vehicle_id").value,
    driver_id: document.getElementById("driver_id").value,
    cargo_weight_kg: parseFloat(document.getElementById("cargo_weight_kg").value),
    planned_distance_km: parseFloat(document.getElementById("planned_distance_km").value),
  };
  try {
    await api.post("/trips", payload);
    closeModal();
    loadTrips();
  } catch (err) {
    document.getElementById("modalAlert").innerHTML = `<div class="alert">${err.message}</div>`;
  }
});

document.getElementById("completeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const tripId = document.getElementById("completeTripId").value;
  const payload = {
    final_odometer: parseFloat(document.getElementById("final_odometer").value),
    fuel_consumed_liters: parseFloat(document.getElementById("fuel_consumed_liters").value),
  };
  try {
    await api.post(`/trips/${tripId}/complete`, payload);
    closeCompleteModal();
    loadTrips();
  } catch (err) {
    document.getElementById("completeModalAlert").innerHTML = `<div class="alert">${err.message}</div>`;
  }
});

loadTrips();
