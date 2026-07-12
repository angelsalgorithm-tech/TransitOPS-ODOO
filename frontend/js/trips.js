requireAuth();
document.getElementById("userBadge").textContent = getName();
document.getElementById("roleBadge").textContent = getRole().replace("_", " ");

let vehicleCapacities = {};

function closeCompleteModal() {
  document.getElementById("completeModalOverlay").classList.remove("open");
  document.getElementById("completeModalAlert").innerHTML = "";
  document.getElementById("completeForm").reset();
}
function openCompleteModal(tripId) {
  document.getElementById("completeTripId").value = tripId;
  document.getElementById("completeModalOverlay").classList.add("open");
}

async function populateSelects() {
  try {
    const [vehicles, drivers] = await Promise.all([
      api.get("/vehicles/available"),
      api.get("/drivers?status=Available"),
    ]);
    vehicleCapacities = {};
    vehicles.forEach((v) => (vehicleCapacities[v._id] = v.max_load_kg));

    document.getElementById("vehicle_id").innerHTML =
      vehicles.map((v) => `<option value="${v._id}">${v.reg_number} — ${v.name} (${v.max_load_kg} kg capacity)</option>`).join("") ||
      `<option disabled>No available vehicles</option>`;
    document.getElementById("driver_id").innerHTML =
      drivers.map((d) => `<option value="${d._id}">${d.name} (${d.license_number})</option>`).join("") ||
      `<option disabled>No available drivers</option>`;
  } catch (err) {
    document.getElementById("modalAlert").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

function checkCapacity() {
  const vehicleId = document.getElementById("vehicle_id").value;
  const cargo = parseFloat(document.getElementById("cargo_weight_kg").value);
  const warningEl = document.getElementById("capacityWarning");
  const submitBtn = document.getElementById("tripSubmitBtn");

  const capacity = vehicleCapacities[vehicleId];
  if (capacity != null && !isNaN(cargo) && cargo > capacity) {
    warningEl.innerHTML = `
      <div class="alert">
        Vehicle Capacity: ${capacity} kg<br/>
        Cargo Weight: ${cargo} kg<br/>
        ✗ Capacity exceeded by ${(cargo - capacity).toFixed(1)} kg — dispatch blocked
      </div>`;
    submitBtn.disabled = true;
  } else {
    warningEl.innerHTML = "";
    submitBtn.disabled = false;
  }
}

async function loadLiveBoard() {
  const board = document.getElementById("liveBoard");
  try {
    const trips = await api.get("/trips");
    if (!trips.length) {
      board.innerHTML = `<p style="color:var(--muted); font-size:13px;">No trips yet.</p>`;
      return;
    }
    board.innerHTML = trips
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
        <div class="live-board-item">
          <div class="route">${t.source} → ${t.destination}</div>
          <div class="meta">
            <span>${t.vehicle_id.slice(-6)} / ${t.driver_id.slice(-6)}</span>
            <span class="status-pill ${statusClass(t.status)}">${t.status}</span>
          </div>
          ${actions ? `<div class="actions">${actions}</div>` : ""}
        </div>`;
      })
      .join("");
  } catch (err) {
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

async function dispatchTrip(id) {
  try {
    await api.post(`/trips/${id}/dispatch`);
    loadLiveBoard();
  } catch (err) {
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

async function cancelTrip(id) {
  if (!confirm("Cancel this trip?")) return;
  try {
    await api.post(`/trips/${id}/cancel`);
    loadLiveBoard();
  } catch (err) {
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

document.getElementById("vehicle_id").addEventListener("change", checkCapacity);
document.getElementById("cargo_weight_kg").addEventListener("input", checkCapacity);

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
    document.getElementById("tripForm").reset();
    document.getElementById("capacityWarning").innerHTML = "";
    populateSelects();
    loadLiveBoard();
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
    revenue_generated: parseFloat(document.getElementById("revenue_generated").value || 0),
  };
  try {
    await api.post(`/trips/${tripId}/complete`, payload);
    closeCompleteModal();
    loadLiveBoard();
  } catch (err) {
    document.getElementById("completeModalAlert").innerHTML = `<div class="alert">${err.message}</div>`;
  }
});

populateSelects();
loadLiveBoard();