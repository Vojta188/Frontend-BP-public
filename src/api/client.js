const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:3000";
function getToken() {
  return localStorage.getItem("token");
}

export async function apiFetch(path, { method = "GET", body, auth = true, responseType = "json", headers: extraHeaders = {} } = {}) {
  const headers = { "Content-Type": "application/json", ...extraHeaders };

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.ok && responseType === "blob") return res.blob();

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const message = (data && data.error) ? data.error : `Chyba ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  return data;
}
