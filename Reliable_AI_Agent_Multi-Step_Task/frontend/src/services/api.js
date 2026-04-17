import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function createTask(payload) {
  const response = await apiClient.post("/tasks", payload);
  return response.data;
}

export async function executeTask(taskId, payload = {}) {
  const response = await apiClient.post(`/execute/${taskId}`, payload);
  return response.data;
}

export async function getTask(taskId) {
  const response = await apiClient.get(`/tasks/${taskId}`);
  return response.data;
}

export async function getTrace(taskId) {
  const response = await apiClient.get(`/traces/${taskId}`);
  return response.data;
}

export default apiClient;
