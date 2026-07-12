function toggleSignup() {
  const login = document.getElementById("loginForm");
  const signup = document.getElementById("signupForm");
  const showingLogin = login.style.display !== "none";
  login.style.display = showingLogin ? "none" : "block";
  signup.style.display = showingLogin ? "block" : "none";
}

function showAlert(elId, message, type = "error") {
  const box = document.getElementById(elId);
  box.innerHTML = `<div class="alert ${type === "success" ? "success" : ""}">${message}</div>`;
}

function clearAlert(elId) {
  document.getElementById(elId).innerHTML = "";
}

// ---------- Toast ----------
function showToast(message, type = "error") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.style.cssText = "position:fixed; top:20px; right:20px; z-index:200; display:flex; flex-direction:column; gap:10px;";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  const icon = type === "error" ? "⚠️" : "✅";
  toast.textContent = `${icon} ${message}`;
  toast.style.cssText = `
    background: ${type === "error" ? "#1f1214" : "#121f16"};
    border: 1px solid ${type === "error" ? "var(--red)" : "var(--green)"};
    color: ${type === "error" ? "#f7c6c8" : "#b8f0c9"};
    padding: 12px 18px;
    border-radius: 10px;
    font-size: 13.5px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.4);
    animation: toastIn 0.2s ease-out;
    max-width: 320px;
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity 0.3s, transform 0.3s";
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

const style = document.createElement("style");
style.textContent = `@keyframes toastIn { from { opacity:0; transform: translateX(20px); } to { opacity:1; transform: translateX(0); } }`;
document.head.appendChild(style);

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAlert("alertBox");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;
  const submitBtn = document.getElementById("submitBtn");

  if (!email) {
    showToast("Enter your email to continue.");
    document.getElementById("email").focus();
    return;
  }
  if (!password) {
    showToast("Enter your password to continue.");
    document.getElementById("password").focus();
    return;
  }
  if (!role) {
    showToast("Select a role (RBAC) before signing in.");
    document.getElementById("role").focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in...";

  try {
    const data = await api.post("/auth/login", { email, password, role }, false);
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("name", data.name);
    showToast("Signed in successfully.", "success");
    window.location.href = "dashboard.html";
  } catch (err) {
    showAlert("alertBox", err.message);
    showToast(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign In";
  }
});

document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAlert("signupAlertBox");

  const name = document.getElementById("suName").value.trim();
  const email = document.getElementById("suEmail").value.trim();
  const password = document.getElementById("suPassword").value;
  const role = document.getElementById("suRole").value;

  if (!name) {
    showToast("Enter your full name.");
    document.getElementById("suName").focus();
    return;
  }
  if (!email) {
    showToast("Enter your email.");
    document.getElementById("suEmail").focus();
    return;
  }
  if (!password || password.length < 6) {
    showToast("Password must be at least 6 characters.");
    document.getElementById("suPassword").focus();
    return;
  }
  if (!role) {
    showToast("Select a role (RBAC) before creating your account.");
    document.getElementById("suRole").focus();
    return;
  }

  try {
    const data = await api.post("/auth/signup", { name, email, password, role }, false);
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("name", data.name);
    showToast("Account created.", "success");
    window.location.href = "dashboard.html";
  } catch (err) {
    showAlert("signupAlertBox", err.message);
    showToast(err.message);
  }
});