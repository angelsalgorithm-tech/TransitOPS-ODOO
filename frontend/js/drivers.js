requireAuth();

function openModal() { document.getElementById("modalOverlay").classList.add("open"); }
function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  document.getElementById("modalAlert").innerHTML = "";
  document.getElementById("driverForm").reset();
}

async function loadDrivers() {
  const tbody = document.getElementById("driverTableBody");
  try {
    const drivers = await api.get("/drivers");
    if (!drivers.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="color:var(--muted);">No drivers added yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = drivers
      .map((d) => {
        const expiry = new Date(d.license_expiry);
        const expired = expiry < new Date();
        return `
      <tr>
        <td>${d.name}</td>
        <td>${d.license_number}</td>
        <td>${d.license_category}</td>
        <td style="color:${expired ? "var(--red)" : "inherit"};">${expiry.toLocaleDateString()}${expired ? " (expired)" : ""}</td>
        <td>${d.safety_score}</td>
        <td><span class="status-pill ${statusClass(d.status)}">${d.status}</span></td>
        <td>${d.status !== "Suspended" ? `<button class="btn-danger" onclick="suspendDriver('${d._id}')">Suspend</button>` : ""}</td>
      </tr>`;
      })
      .join("");
  } catch (err) {
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

async function suspendDriver(id) {
  if (!confirm("Suspend this driver? They won't be assignable to trips.")) return;
  try {
    await api.post(`/drivers/${id}/suspend`);
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

loadDrivers();
