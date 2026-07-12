requireAuth();
document.getElementById("userBadge").textContent = getName();
document.getElementById("roleBadge").textContent = getRole().replace("_", " ");

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function licenseStatusLabel(daysLeft) {
  if (daysLeft < 0) return { text: "Expired", cls: "status-suspended" };
  if (daysLeft <= 30) return { text: `Expiring in ${daysLeft}d`, cls: "status-inshop" };
  return { text: "Valid", cls: "status-available" };
}

async function loadCompliance() {
  const tbody = document.getElementById("complianceTableBody");
  try {
    const drivers = await api.get("/drivers");

    let expiringSoon = 0;
    let expired = 0;
    let suspended = 0;

    tbody.innerHTML = drivers.length
      ? drivers.map((d) => {
          const daysLeft = daysUntil(d.license_expiry);
          const license = licenseStatusLabel(daysLeft);
          if (daysLeft < 0) expired++;
          else if (daysLeft <= 30) expiringSoon++;
          if (d.status === "Suspended") suspended++;

          return `
            <tr>
              <td>${d.name}</td>
              <td>${d.license_number}</td>
              <td>${d.license_category || "—"}</td>
              <td>${new Date(d.license_expiry).toLocaleDateString()}</td>
              <td><span class="status-pill ${license.cls}">${license.text}</span></td>
            </tr>`;
        }).join("")
      : `<tr><td colspan="5" style="color:var(--muted);">No drivers on record.</td></tr>`;

    document.getElementById("kpiExpiringSoon").textContent = expiringSoon;
    document.getElementById("kpiExpired").textContent = expired;
    document.getElementById("kpiSuspended").textContent = suspended;
  } catch (err) {
    console.error("loadCompliance failed:", err);
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--red);">Failed to load: ${err.message}</td></tr>`;
    document.getElementById("alertBox").innerHTML = `<div class="alert">${err.message}</div>`;
  }
}

loadCompliance();