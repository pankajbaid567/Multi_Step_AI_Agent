import { useState } from "react";

import { createTask } from "../services/api";

export default function TaskInput({ onTaskCreated }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitTask = async (event) => {
    event.preventDefault();
    if (!input.trim()) {
      setError("Please enter a task description.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = await createTask({ input: input.trim() });
      onTaskCreated?.(payload);
      setInput("");
    } catch (err) {
      setError(err?.response?.data?.detail ?? "Failed to create task.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="rounded-xl border border-slate-800 bg-slate-900 p-4" onSubmit={submitTask}>
      <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="task-input">
        Describe your multi-step task
      </label>
      <textarea
        id="task-input"
        className="h-28 w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-indigo-500"
        placeholder="Plan and execute a product launch checklist under uncertain market conditions..."
        value={input}
        onChange={(event) => setInput(event.target.value)}
      />
      <div className="mt-3 flex items-center justify-between">
        <button
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          {loading ? "Submitting..." : "Create Task"}
        </button>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>
    </form>
  );
}
