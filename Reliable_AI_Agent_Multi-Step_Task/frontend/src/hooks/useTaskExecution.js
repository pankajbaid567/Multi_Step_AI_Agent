import { useCallback, useState } from "react";

import { executeTask, getTask } from "../services/api";

export default function useTaskExecution() {
  const [state, setState] = useState({ loading: false, error: "", task: null });

  const runTask = useCallback(async (taskId, resumeFromCheckpoint = false) => {
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      await executeTask(taskId, { resume_from_checkpoint: resumeFromCheckpoint });
      const task = await getTask(taskId);
      setState({ loading: false, error: "", task });
      return task;
    } catch (err) {
      const message = err?.response?.data?.detail ?? "Failed to execute task.";
      setState({ loading: false, error: message, task: null });
      throw err;
    }
  }, []);

  return {
    ...state,
    runTask,
  };
}
