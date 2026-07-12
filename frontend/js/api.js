// Point this at your deployed FastAPI backend before going live.
const API_BASE = "http://localhost:8000";

function getToken() {
  return localStorage.getItem("token");
}

function getRole() {
  return localStorage.getItem("role");
}

function getName() {
  return localStorage.getItem("name");
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = "index.html";
  }
}

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

async function apiRequest(path, { method = "GET", body = null, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    const message = data?.detail || `Request failed (${res.status})`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }

  return data;
}

const api = {
  get: (path) => apiRequest(path, { method: "GET" }),
  post: (path, body, auth = true) => apiRequest(path, { method: "POST", body, auth }),
  patch: (path, body) => apiRequest(path, { method: "PATCH", body }),
  del: (path) => apiRequest(path, { method: "DELETE" }),
};

function statusClass(status) {
  return "status-" + status.toLowerCase().replace(/\s+/g, "");
}
