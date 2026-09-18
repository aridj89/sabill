import { API_ENDPOINTS } from "../config/api";

function getAuthHeaders() {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Fetch all groups from backend API
 */
export async function fetchGroupsApi() {
  const res = await fetch(API_ENDPOINTS.groups, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Erreur serveur (${res.status})`);
  }
  return await res.json();
}

/**
 * Create a new group via POST /api/groups
 */
export async function createGroupApi(groupData, sessions = []) {
  const res = await fetch(API_ENDPOINTS.groups, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ ...groupData, sessions }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || `Erreur création groupe (${res.status})`);
  }
  return data;
}

/**
 * Update a group via PUT /api/groups/:id
 */
export async function updateGroupApi(id, groupData) {
  const res = await fetch(`${API_ENDPOINTS.groups}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(groupData),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || `Erreur mise à jour groupe (${res.status})`);
  }
  return data;
}

/**
 * Delete a group via DELETE /api/groups/:id
 * Only returns true if backend successfully deletes the record from SQLite database
 */
export async function deleteGroupApi(id) {
  const res = await fetch(`${API_ENDPOINTS.groups}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || `Erreur suppression groupe (${res.status})`);
  }
  return data;
}
