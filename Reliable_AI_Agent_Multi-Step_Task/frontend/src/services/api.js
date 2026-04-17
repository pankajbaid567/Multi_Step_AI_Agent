import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

function normalizeSuccess(payload) {
  const success = typeof payload?.success === "boolean" ? payload.success : true;
  const data = payload?.data ?? null;
  const error = payload?.error ?? null;

  if (data && typeof data === "object") {
    return {
      success,
      data,
      error,
      ...data,
    };
  }

  return { success, data, error };
}

function normalizeError(err) {
  const message =
    err?.response?.data?.error ||
    err?.response?.data?.detail ||
    err?.message ||
    "Unexpected API error";
  return {
    success: false,
    data: null,
    error: String(message),
  };
}

async function safeRequest(requestFn) {
  try {
    const response = await requestFn();
    return normalizeSuccess(response?.data);
  } catch (err) {
    return normalizeError(err);
  }
}

function normalizeTaskDescription(taskDescription) {
  if (typeof taskDescription === "string") {
    return taskDescription.trim();
  }

  if (taskDescription && typeof taskDescription === "object") {
    const candidate = taskDescription.task ?? taskDescription.input ?? "";
    return String(candidate).trim();
  }

  return "";
}

export async function createTask(taskDescription) {
  const task = normalizeTaskDescription(taskDescription);
  if (!task) {
    return {
      success: false,
      data: null,
      error: "Task description is required",
    };
  }

  return safeRequest(() => apiClient.post("/tasks", { task }));
}

export async function getTask(taskId) {
  if (!taskId) {
    return {
      success: false,
      data: null,
      error: "Task id is required",
    };
  }

  return safeRequest(() => apiClient.get(`/tasks/${taskId}`));
}

export async function executeTask(taskId) {
  if (!taskId) {
    return {
      success: false,
      data: null,
      error: "Task id is required",
    };
  }

  return safeRequest(() => apiClient.post(`/tasks/${taskId}/execute`));
}

export async function getTrace(taskId) {
  if (!taskId) {
    return {
      success: false,
      data: null,
      error: "Task id is required",
    };
  }

  return safeRequest(() => apiClient.get(`/traces/${taskId}`));
}

export async function getChaosMode() {
  const primary = await safeRequest(() => apiClient.get("/config/chaos"));
  if (primary.success) {
    return primary;
  }
  return safeRequest(() => apiClient.get("/config/chaos-mode"));
}

export async function setChaosMode(enabled) {
  const primary = await safeRequest(() => apiClient.post("/config/chaos", { enabled: Boolean(enabled) }));
  if (primary.success) {
    return primary;
  }
  return safeRequest(() => apiClient.post("/config/chaos-mode", { enabled: Boolean(enabled) }));
}

export default apiClient;
