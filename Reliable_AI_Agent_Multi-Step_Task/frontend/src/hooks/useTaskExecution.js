import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createTask, executeTask, getTask, getTrace } from "../services/api";
import useWebSocket from "./useWebSocket";

export default function useTaskExecution() {
  const [taskId, setTaskId] = useState(null);
  const [task, setTask] = useState(null);
  const [steps, setSteps] = useState([]);
  const [results, setResults] = useState([]);
  const [trace, setTrace] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const processedEventsRef = useRef(0);
  const syncInFlightRef = useRef(false);

  const { events, isConnected, error: socketError } = useWebSocket(taskId);

  const hydrateFromState = useCallback((state) => {
    if (!state || typeof state !== "object") {
      return;
    }

    const normalizedTask = {
      ...state,
      task_id: state.task_id || taskId,
    };

    setTask(normalizedTask);
    setSteps(Array.isArray(state.steps) ? state.steps : []);
    setResults(Array.isArray(state.step_results) ? state.step_results : []);
    setTrace((Array.isArray(state.execution_trace) ? state.execution_trace : []).map((entry) => ({
      ...(entry || {}),
      source: entry?.source || "state",
    })));
  }, [taskId]);

  const refreshTaskSnapshot = useCallback(async (id) => {
    if (!id || syncInFlightRef.current) {
      return;
    }

    syncInFlightRef.current = true;
    try {
      const taskResponse = await getTask(id);
      if (taskResponse.success && taskResponse.data) {
        hydrateFromState(taskResponse.data);
      }

      const traceResponse = await getTrace(id);
      if (traceResponse.success && traceResponse.data?.trace) {
        setTrace(traceResponse.data.trace);
      }
    } finally {
      syncInFlightRef.current = false;
    }
  }, [hydrateFromState]);

  const submitTask = useCallback(async (descriptionOrPayload) => {
    setIsLoading(true);
    setError(null);

    try {
      let currentTaskId = null;
      let initialSteps = [];
      let initialTaskData = null;

      if (descriptionOrPayload && typeof descriptionOrPayload === "object" && descriptionOrPayload.task_id) {
        currentTaskId = String(descriptionOrPayload.task_id);
        initialSteps = Array.isArray(descriptionOrPayload.steps) ? descriptionOrPayload.steps : [];
        initialTaskData = descriptionOrPayload;
      } else {
        const createResponse = await createTask(descriptionOrPayload);
        if (!createResponse.success) {
          throw new Error(createResponse.error || "Failed to create task");
        }

        currentTaskId = String(createResponse.data?.task_id || createResponse.task_id || "");
        initialSteps = Array.isArray(createResponse.data?.steps)
          ? createResponse.data.steps
          : Array.isArray(createResponse.steps)
            ? createResponse.steps
            : [];
        initialTaskData = createResponse.data || createResponse;
      }

      if (!currentTaskId) {
        throw new Error("Task id missing from create response");
      }

      setTaskId(currentTaskId);
      setTask((prev) => ({
        ...(prev || {}),
        ...(initialTaskData || {}),
        task_id: currentTaskId,
      }));
      setSteps(initialSteps);
      setResults([]);
      setTrace([]);
      processedEventsRef.current = 0;

      const executeResponse = await executeTask(currentTaskId);
      if (!executeResponse.success) {
        throw new Error(executeResponse.error || "Failed to start task execution");
      }

      await refreshTaskSnapshot(currentTaskId);
      return {
        success: true,
        taskId: currentTaskId,
      };
    } catch (submitError) {
      setError(submitError?.message || "Task submission failed");
      return {
        success: false,
        error: submitError?.message || "Task submission failed",
      };
    } finally {
      setIsLoading(false);
    }
  }, [refreshTaskSnapshot]);

  useEffect(() => {
    if (!events.length) {
      return;
    }

    const newEvents = events.slice(processedEventsRef.current);
    if (!newEvents.length) {
      return;
    }

    processedEventsRef.current = events.length;

    setTrace((prev) => {
      const mapped = newEvents
        .filter((entry) => entry?.event_type !== "ping")
        .map((entry) => ({ ...entry, source: entry?.source || "stream" }));
      return [...prev, ...mapped];
    });

    const latest = newEvents[newEvents.length - 1];
    if (!latest) {
      return;
    }

    const eventType = String(latest.event_type || "").toLowerCase();
    if (eventType === "poll_state") {
      const state = latest?.data?.state;
      if (state) {
        hydrateFromState(state);
      }
      return;
    }

    if (
      eventType === "step_completed" ||
      eventType === "step_failed" ||
      eventType === "reflection_completed" ||
      eventType === "task_completed" ||
      eventType === "task_failed"
    ) {
      refreshTaskSnapshot(taskId);
    }
  }, [events, hydrateFromState, refreshTaskSnapshot, taskId]);

  useEffect(() => {
    if (socketError) {
      setError(socketError);
    }
  }, [socketError]);

  const metrics = useMemo(() => {
    const totalTokens = Number(task?.llm_tokens_used || 0) || results.reduce((sum, item) => sum + Number(item?.tokens_used || 0), 0);

    const estimatedCost = Number(task?.final_output?.summary?.estimated_cost_usd || 0);
    const fallbackEstimatedCost = estimatedCost > 0 ? estimatedCost : Number((totalTokens / 1_000_000) * 3.5).toFixed(6);

    const startedAt = task?.started_at ? new Date(task.started_at).getTime() : null;
    const completedAt = task?.completed_at ? new Date(task.completed_at).getTime() : null;
    const endTime = completedAt || Date.now();
    const totalTime = startedAt ? Math.max(0, Math.round((endTime - startedAt) / 1000)) : 0;

    const retryCount = task?.retry_counts
      ? Object.values(task.retry_counts).reduce((sum, value) => sum + Number(value || 0), 0)
      : trace.filter((event) => String(event?.event_type || "") === "retry_triggered").length;

    const reflectionCount = task?.reflection_counts
      ? Object.values(task.reflection_counts).reduce((sum, value) => sum + Number(value || 0), 0)
      : trace.filter((event) => String(event?.event_type || "") === "reflection_completed").length;

    const fallbackCount = trace.filter((event) => String(event?.event_type || "") === "fallback_triggered").length;

    return {
      totalTokens,
      estimatedCost: Number(fallbackEstimatedCost),
      totalTime,
      retryCount,
      fallbackCount,
      reflectionCount,
      isConnected,
    };
  }, [isConnected, results, task, trace]);

  return {
    task,
    steps,
    results,
    trace,
    metrics,
    submitTask,
    isLoading,
    error,
  };
}
