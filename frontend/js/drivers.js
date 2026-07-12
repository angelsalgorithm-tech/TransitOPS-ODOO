requireAuth();
document.getElementById("userBadge").textContent = getName();
document.getElementById("roleBadge").textContent = getRole().replace("_", " ");

let allDrivers = [];
const STATUS_CYCLE = ["Available", "On Trip", "Off Duty", "Suspended"];

function openModal() { document.getElementById("modalOverlay").classList.add("open"); }
function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  document.getElementById("modalAlert").innerHTML = "";
  document.getElementById("driverForm").reset();
}

function renderTable(drivers) {
  const tbody = document.getElementById("driverTableBody");
  if (!drivers.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:var(--muted);">No drivers added yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = drivers
    .map((d) => {
      const expiry = new Date(d.license_expiry);
      const expired = expiry < new Date();
      const tripCompl = d.trip_completion_pct != null ? `${d.trip_completion_pct}%` : "—";
      return `
    <tr>
      <td>${d.name}</td>
      <td>${d.license_number}</td>
      <td>${d.license_category}</td>
      <td style="color:${expired ? "var(--red)" : "inherit"};">${expiry.toLocaleDateString()}${expired ? " (expired)" : ""}</td>
      <td>${d.contact_number || "—"}</td>
      <td>${tripCompl}</td>
      <td>${d.safety_score}%</td>
      <td>
        <select onchange="updateStatus('${d._id}', this.value)" style="width:auto; padding:4px 8px; font-size:12px;">
          ${STATUS_CYCLE.map((s) => `<option value="${s}" ${d.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </td>
    </tr>`;
    })
    .join("");
}

function applySearch() {
  const q = document.getElementById("driverSearch").value.toLowerCase();
  const filtered = allDrivers.filter(
    (d) => d.name.toLowerCase().includes(q) || d.license_number.toLowerCase().includes(q)
  );
  renderTable(filtered);
}

async function loadDrivers() {
  try {
    allDrivers = await api.get("/drivers");
    applySearch();
  } catch (err) {
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

async function updateStatus(id, status) {
  try {
    await api.patch(`/drivers/${id}`, { status });
    loadDrivers();
  } catch (err) {
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

document.getElementById("driverForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    name: document.getElementById("name").value.trim(),
    license_number: document.getElementById("license_number").value.trim(),
    license_category: document.getElementById("license_category").value,
    license_expiry: new Date(document.getElementById("license_expiry").value).toISOString(),
    contact_number: document.getElementById("contact_number").value.trim(),
  };
  try {
    await api.post("/drivers", payload);
    closeModal();
    loadDrivers();
  } catch (err) {
    document.getElementById("modalAlert").innerHTML = `<div class="alert">${err.message}</div>`;
  }
});

document.getElementById("driverSearch").addEventListener("input", applySearch);

loadDrivers();