requireAuth();
document.getElementById("userBadge").textContent = getName();
document.getElementById("roleBadge").textContent = getRole().replace("_", " ");

const isFleetManager = getRole() === "fleet_manager";

if (!isFleetManager) {
  document.getElementById("depotName").disabled = true;
  document.getElementById("currency").disabled = true;
  document.getElementById("distanceUnit").disabled = true;
  document.getElementById("saveSettingsBtn").style.display = "none";
  document.getElementById("readOnlyNote").style.display = "block";
}

async function loadSettings() {
  try {
    const s = await api.get("/settings");
    document.getElementById("depotName").value = s.depot_name || "";
    document.getElementById("currency").value = s.currency || "";
    document.getElementById("distanceUnit").value = s.distance_unit || "";
  } catch (err) {
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

document.getElementById("settingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    depot_name: document.getElementById("depotName").value.trim(),
    currency: document.getElementById("currency").value.trim(),
    distance_unit: document.getElementById("distanceUnit").value.trim(),
  };
  try {
    await api.put("/settings", payload);
    document.getElementById("alertBox").innerHTML = `<div class="alert" style="border-color:var(--green); color:var(--green);">Settings saved.</div>`;
    setTimeout(() => (document.getElementById("alertBox").innerHTML = ""), 2500);
  } catch (err) {
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
});

loadSettings();