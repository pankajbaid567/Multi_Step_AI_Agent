import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ExecutionDAG from "./components/ExecutionDAG";
import LiveLogs from "./components/LiveLogs";
import MetricsBar from "./components/MetricsBar";
import TaskInput from "./components/TaskInput";
import ToastStack from "./components/ToastStack";
import TraceTimeline from "./components/TraceTimeline";
import useTaskExecution from "./hooks/useTaskExecution";
import { getChaosMode, setChaosMode } from "./services/api";

const STATUS_META = {
  Idle: {
    dotClass: "bg-slate-300",
    badgeClass: "border-white/15 bg-white/10 text-[var(--text-secondary)]",
    pulse: false,
  },
  Planning: {
    dotClass: "bg-[var(--accent-warning)]",
    badgeClass: "border-amber-400/45 bg-amber-500/20 text-amber-100",
    pulse: true,
  },
  Executing: {
    dotClass: "bg-[var(--accent-info)]",
    badgeClass: "border-[var(--accent-info)]/45 bg-[var(--accent-info)]/20 text-sky-100",
    pulse: true,
  },
  Complete: {
    dotClass: "bg-[var(--accent-success)]",
    badgeClass: "border-emerald-400/45 bg-emerald-500/20 text-emerald-100",
    pulse: false,
  },
};

const HERO_FEATURES = [
  "Reliability-first orchestration with retry, fallback, and reflection loops.",
  "Live execution graph, timeline trace, and compact runtime logs.",
  "Confidence scoring and final synthesis with downloadable audit trace.",
];

const HERO_EXAMPLES = [
  "Research 5 AI coding assistants and compare pricing + strengths",
  "Analyze market sentiment for electric vehicle adoption in 2026",
  "Build a short go-to-market plan for an AI tutoring product",
];

export default function App() {
  const {
    task,
    steps,
    results,
    trace,
    metrics,
    submitTask,
    isLoading,
    error,
  } = useTaskExecution();

  const [activeTab, setActiveTab] = useState("execution");
  const [mobilePane, setMobilePane] = useState("input");
  const [chaosEnabled, setChaosEnabled] = useState(false);
  const [isChaosUpdating, setIsChaosUpdating] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [isResultOpen, setIsResultOpen] = useState(false);

  const processedToastKeysRef = useRef(new Set());
  const toastTimersRef = useRef(new Map());
  const completedModalTasksRef = useRef(new Set());
  const lastTaskIdRef = useRef("");

  const currentTaskId = String(task?.task_id || "");
  const currentStepIndex = Number.isFinite(Number(task?.current_step_index)) ? Number(task.current_step_index) : 0;
  const hasTaskStarted = Boolean(currentTaskId || steps.length > 0 || results.length > 0 || trace.length > 0 || isLoading);
  const confidence = String(task?.confidence_score || task?.final_output?.summary?.confidence || "Unknown");

  const executionStatus = useMemo(
    () => deriveExecutionStatus({ task, isLoading, hasTaskStarted }),
    [hasTaskStarted, isLoading, task],
  );
  const statusMeta = STATUS_META[executionStatus];

  const metricPayload = useMemo(
    () => ({
      ...metrics,
      confidence,
    }),
    [confidence, metrics],
  );

  const runtimeError = useMemo(
    () => deriveRuntimeError({ task, trace, fallbackError: error }),
    [error, task, trace],
  );

  const hasFinalResult = Boolean(task?.final_output?.result);
  const taskSummary = task?.final_output?.summary || {};

  const dismissToast = useCallback((id) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));

    const timerId = toastTimersRef.current.get(id);
    if (timerId) {
      window.clearTimeout(timerId);
      toastTimersRef.current.delete(id);
    }
  }, []);

  const pushToast = useCallback((message, variant = "info", ttl = 4200) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const toast = { id, message, variant };

    setToasts((previous) => [...previous, toast].slice(-6));

    const timerId = window.setTimeout(() => {
      setToasts((previous) => previous.filter((item) => item.id !== id));
      toastTimersRef.current.delete(id);
    }, ttl);

    toastTimersRef.current.set(id, timerId);
  }, []);

  useEffect(() => {
    return () => {
      for (const timerId of toastTimersRef.current.values()) {
        window.clearTimeout(timerId);
      }
      toastTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    let active = true;

    const initializeChaosMode = async () => {
      const localValue = window.localStorage.getItem("chaos_mode_enabled");
      if (localValue !== null) {
        setChaosEnabled(localValue === "true");
      }

      const response = await getChaosMode();
      if (!active) {
        return;
      }
      if (response.success && typeof response.data?.chaos_mode === "boolean") {
        const backendValue = Boolean(response.data.chaos_mode);
        setChaosEnabled(backendValue);
        window.localStorage.setItem("chaos_mode_enabled", String(backendValue));
      }
    };

    initializeChaosMode();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!currentTaskId) {
      return;
    }

    if (lastTaskIdRef.current !== currentTaskId) {
      lastTaskIdRef.current = currentTaskId;
      processedToastKeysRef.current.clear();
      setToasts([]);
      setActiveTab("execution");
      setMobilePane("execution");
      setIsResultOpen(false);
    }
  }, [currentTaskId]);

  useEffect(() => {
    const streamEvents = (Array.isArray(trace) ? trace : []).filter(
      (entry) => String(entry?.source || "").toLowerCase() === "stream",
    );
    if (!streamEvents.length) {
      return;
    }

    for (const event of streamEvents) {
      const key = `${event?.timestamp || ""}|${event?.event_type || ""}|${event?.step_id || event?.data?.step_id || ""}`;
      if (processedToastKeysRef.current.has(key)) {
        continue;
      }
      processedToastKeysRef.current.add(key);

      const toastPayload = mapTraceEventToToast(event, confidence);
      if (toastPayload) {
        pushToast(toastPayload.message, toastPayload.variant, toastPayload.ttl);
      }
    }
  }, [confidence, pushToast, trace]);

  useEffect(() => {
    if (!hasFinalResult || !currentTaskId) {
      return;
    }

    if (completedModalTasksRef.current.has(currentTaskId)) {
      return;
    }

    completedModalTasksRef.current.add(currentTaskId);
    setIsResultOpen(true);
  }, [currentTaskId, hasFinalResult]);

  const handleTaskSubmit = async (taskInput) => {
    setMobilePane("execution");
    setActiveTab("execution");
    return submitTask(taskInput);
  };

  const handleRunExample = async (taskInput) => {
    setMobilePane("execution");
    setActiveTab("execution");
    await submitTask(taskInput);
  };

  const handleToggleChaosMode = async () => {
    const nextValue = !chaosEnabled;
    setChaosEnabled(nextValue);
    setIsChaosUpdating(true);

    const response = await setChaosMode(nextValue);
    setIsChaosUpdating(false);

    if (!response.success) {
      setChaosEnabled(!nextValue);
      pushToast("Could not update Chaos Mode on backend.", "error", 3600);
      return;
    }

    const persistedValue = Boolean(response.data?.chaos_mode ?? nextValue);
    setChaosEnabled(persistedValue);
    window.localStorage.setItem("chaos_mode_enabled", String(persistedValue));
    pushToast(
      persistedValue ? "Chaos Mode enabled for upcoming runs." : "Chaos Mode disabled.",
      persistedValue ? "warning" : "info",
      2800,
    );
  };

  const handleDownloadTrace = useCallback(() => {
    const payload = {
      task_id: currentTaskId || "task",
      exported_at: new Date().toISOString(),
      trace,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = `${currentTaskId || "task"}_trace.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(blobUrl);
  }, [currentTaskId, trace]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <AnimatedBackground />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#060c1dcc] backdrop-blur-xl">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-3 sm:px-6 lg:px-8">
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-3">
              <div className="min-w-0">
                <h1 className="truncate bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-info)] to-[var(--accent-secondary)] bg-clip-text text-2xl font-extrabold tracking-tight text-transparent sm:text-3xl">
                  ⚡ Reliable AI Agent
                </h1>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Multi-step execution with resilient orchestration and live observability.</p>
              </div>

              <div className="hidden items-center justify-center sm:flex">
                <StatusBadge status={executionStatus} statusMeta={statusMeta} isConnected={metrics.isConnected} />
              </div>

              <div className="flex items-center justify-end gap-2">
                <label className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-primary)]">Chaos Mode</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={chaosEnabled}
                    onClick={handleToggleChaosMode}
                    disabled={isChaosUpdating}
                    className={`relative h-5 w-10 rounded-full transition ${chaosEnabled ? "bg-[var(--accent-warning)]" : "bg-slate-600"} ${isChaosUpdating ? "cursor-wait opacity-60" : ""}`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${chaosEnabled ? "left-5" : "left-0.5"}`}
                    />
                  </button>
                </label>
              </div>
            </div>

            <div className="mt-2 flex justify-center sm:hidden">
              <StatusBadge status={executionStatus} statusMeta={statusMeta} isConnected={metrics.isConnected} />
            </div>
          </div>
        </header>

        {runtimeError ? (
          <div className="mx-auto mt-4 w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
            <div className="rounded-xl border border-red-400/45 bg-red-500/20 px-4 py-3 text-sm text-red-100">
              {runtimeError}
            </div>
          </div>
        ) : null}

        <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-4 grid grid-cols-2 gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobilePane("input")}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${mobilePane === "input"
                ? "border-[var(--accent-secondary)]/50 bg-[var(--accent-secondary)]/20 text-[var(--text-primary)]"
                : "border-white/15 bg-white/5 text-[var(--text-secondary)]"}`}
            >
              Input
            </button>
            <button
              type="button"
              onClick={() => setMobilePane("execution")}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${mobilePane === "execution"
                ? "border-[var(--accent-secondary)]/50 bg-[var(--accent-secondary)]/20 text-[var(--text-primary)]"
                : "border-white/15 bg-white/5 text-[var(--text-secondary)]"}`}
            >
              Execution
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(320px,35%)_minmax(0,65%)]">
            <section className={`${mobilePane === "input" ? "block" : "hidden"} space-y-5 lg:block`}>
              <motion.div className="glass rounded-2xl p-4 sm:p-5" layout>
                <TaskInput onSubmit={handleTaskSubmit} isLoading={isLoading} />
              </motion.div>

              <AnimatePresence initial={false}>
                {hasTaskStarted ? (
                  <motion.div
                    key="metrics"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.26 }}
                  >
                    <MetricsBar metrics={metricPayload} />
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <LiveLogs events={trace} />
            </section>

            <section className={`${mobilePane === "execution" ? "block" : "hidden"} space-y-5 lg:block`}>
              {!hasTaskStarted ? (
                <EmptyStateHero onRunExample={handleRunExample} isLoading={isLoading} />
              ) : (
                <>
                  <div className="glass rounded-2xl p-3 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="inline-flex rounded-xl border border-white/15 bg-[#0f1832]/90 p-1">
                        <button
                          type="button"
                          onClick={() => setActiveTab("execution")}
                          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${activeTab === "execution"
                            ? "bg-[var(--accent-secondary)]/25 text-[var(--text-primary)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                        >
                          Execution
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("trace")}
                          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${activeTab === "trace"
                            ? "bg-[var(--accent-secondary)]/25 text-[var(--text-primary)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                        >
                          Trace
                        </button>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)]">
                        {currentTaskId ? `Task ${currentTaskId.slice(0, 8)}` : "No active task"}
                      </p>
                    </div>

                    <div className="mt-3">
                      <AnimatePresence mode="wait" initial={false}>
                        {activeTab === "execution" ? (
                          <motion.div
                            key="execution-panel"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ExecutionDAG steps={steps} results={results} currentStepIndex={currentStepIndex} />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="trace-panel"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                          >
                            <TraceTimeline trace={trace} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {hasFinalResult ? (
                    <motion.div
                      className="glass rounded-2xl border border-emerald-400/35 bg-emerald-500/10 p-4 sm:p-5"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-emerald-100">Result Ready</h3>
                          <p className="mt-1 text-sm text-emerald-50/90">Final synthesis generated with confidence scoring and full trace context.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsResultOpen(true)}
                          className="rounded-lg border border-emerald-300/45 bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/30"
                        >
                          View Result
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </>
              )}
            </section>
          </div>
        </div>
      </div>

      <ResultModal
        open={isResultOpen && hasFinalResult}
        onClose={() => setIsResultOpen(false)}
        task={task}
        summary={taskSummary}
        confidence={confidence}
        onDownloadTrace={handleDownloadTrace}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}

function StatusBadge({ status, statusMeta, isConnected }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}>
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusMeta.dotClass} ${statusMeta.pulse ? "running-pulse" : ""}`} />
      {status}
      <span className="text-[10px] uppercase tracking-wide text-white/80">{isConnected ? "live" : "standby"}</span>
    </div>
  );
}

function EmptyStateHero({ onRunExample, isLoading }) {
  return (
    <motion.section
      className="glass rounded-2xl p-5 sm:p-6"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <h2 className="text-2xl font-bold text-[var(--text-primary)]">Autonomous reliability, in one cockpit.</h2>
      <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
        Plan, execute, recover, and validate multi-step AI workflows with live observability and confidence-aware finalization.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {HERO_FEATURES.map((feature) => (
          <div key={feature} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-[var(--text-secondary)]">
            {feature}
          </div>
        ))}
      </div>

      <div className="mt-5">
        <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Try an example</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {HERO_EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              disabled={isLoading}
              onClick={() => onRunExample(example)}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:border-[var(--accent-secondary)]/60 hover:bg-[var(--accent-secondary)]/15 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function ResultModal({ open, onClose, task, summary, confidence, onDownloadTrace }) {
  const confidenceMeta = getConfidenceMeta(confidence);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-4 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-4xl rounded-2xl border border-white/15 bg-[#07112a] p-5 shadow-2xl shadow-black/55"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-[var(--text-primary)]">Final Result</h3>
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${confidenceMeta.className}`}>
                  Confidence: {confidenceMeta.label}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-xs text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
              <div className="rounded-xl border border-white/10 bg-[#0b1735] p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-[var(--text-secondary)]">Synthesized Output</p>
                <div className="max-h-[420px] overflow-y-auto pr-1 text-sm leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
                  {String(task?.final_output?.result || "No result generated.")}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Execution Summary</p>
                  <SummaryLine label="Total steps" value={summary?.total_steps} />
                  <SummaryLine label="Successful" value={summary?.successful_steps} />
                  <SummaryLine label="Failed" value={summary?.failed_steps} />
                  <SummaryLine label="Skipped" value={summary?.skipped_steps} />
                  <SummaryLine label="Retries" value={summary?.total_retries} />
                  <SummaryLine label="Reflections" value={summary?.total_reflections} />
                  <SummaryLine label="Tokens" value={summary?.total_tokens} />
                  <SummaryLine label="Duration" value={formatDuration(summary?.total_duration_ms)} />
                  <SummaryLine label="Est. cost" value={formatCost(summary?.estimated_cost_usd)} />
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Models Used</p>
                  <p className="mt-1 text-sm text-[var(--text-primary)]">{formatModels(summary?.models_used)}</p>
                </div>

                <button
                  type="button"
                  onClick={onDownloadTrace}
                  className="w-full rounded-lg border border-[var(--accent-info)]/45 bg-[var(--accent-info)]/20 px-3 py-2 text-sm font-medium text-sky-100 transition hover:bg-[var(--accent-info)]/30"
                >
                  Download trace JSON
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function SummaryLine({ label, value }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2 text-sm">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-medium text-[var(--text-primary)]">{value ?? "-"}</span>
    </div>
  );
}

function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-32 -left-20 h-80 w-80 rounded-full bg-[var(--accent-primary)]/18 blur-3xl"
        animate={{ x: [0, 50, -25, 0], y: [0, 35, 5, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-24 right-[-120px] h-96 w-96 rounded-full bg-[var(--accent-secondary)]/16 blur-3xl"
        animate={{ x: [0, -60, 20, 0], y: [0, -20, 25, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-140px] left-[20%] h-96 w-96 rounded-full bg-emerald-500/12 blur-3xl"
        animate={{ x: [0, 40, -35, 0], y: [0, -30, 15, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function deriveExecutionStatus({ task, isLoading, hasTaskStarted }) {
  const taskStatus = String(task?.status || "").toLowerCase();

  if (taskStatus === "completed" || taskStatus === "failed") {
    return "Complete";
  }
  if (isLoading || taskStatus === "planning" || taskStatus === "planned") {
    return "Planning";
  }
  if (
    taskStatus === "executing" ||
    taskStatus === "validating" ||
    taskStatus === "reflecting" ||
    taskStatus === "resumed" ||
    (hasTaskStarted && taskStatus && taskStatus !== "completed")
  ) {
    return "Executing";
  }
  return "Idle";
}

function deriveRuntimeError({ task, trace, fallbackError }) {
  if (fallbackError) {
    return String(fallbackError);
  }

  const taskStatus = String(task?.status || "").toLowerCase();
  if (taskStatus !== "failed") {
    return "";
  }

  const events = Array.isArray(trace) ? trace : [];
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index] || {};
    if (String(event.event_type || "").toLowerCase() !== "task_failed") {
      continue;
    }

    const data = isObject(event.data) ? event.data : {};
    const details = isObject(event.details) ? event.details : {};
    const errorMessage = event.error || data.error || details.reason || details.error;
    if (errorMessage) {
      return String(errorMessage);
    }
  }

  return "Task execution failed. Check trace details for diagnostics.";
}

function mapTraceEventToToast(event, confidence) {
  const payload = isObject(event) ? event : {};
  const data = isObject(payload.data) ? payload.data : {};
  const details = isObject(payload.details) ? payload.details : {};
  const merged = { ...details, ...data, ...payload };

  const eventType = String(payload.event_type || "").toLowerCase();
  const stepLabel = getStepLabel(merged.step_id, merged.step_name);

  if (eventType === "planning_complete") {
    const stepCount = Number(merged.step_count || 0);
    const suffix = Number.isFinite(stepCount) && stepCount > 0 ? `: ${stepCount} steps` : "";
    return { message: `✅ Planning complete${suffix}`, variant: "success", ttl: 3200 };
  }

  if (eventType === "retry_triggered") {
    return { message: `🔁 ${stepLabel || "Step"} retrying...`, variant: "warning", ttl: 3200 };
  }

  if (eventType === "fallback_triggered") {
    const toProvider = humanizeProvider(merged.to_provider || merged.to || "");
    return { message: `🔄 Switched to ${toProvider || "fallback provider"}`, variant: "info", ttl: 3600 };
  }

  if (eventType === "task_completed") {
    const eventConfidence = String(merged.summary?.confidence || confidence || "Unknown");
    return { message: `🎉 Task complete! Confidence: ${eventConfidence}`, variant: "success", ttl: 4200 };
  }

  if (eventType === "task_failed") {
    const reason = String(merged.error || merged.reason || "Task failed.");
    return { message: `💥 ${truncateText(reason, 96)}`, variant: "error", ttl: 4200 };
  }

  return null;
}

function getStepLabel(stepId, stepName) {
  if (stepName) {
    return String(stepName);
  }
  const text = String(stepId || "");
  const match = text.match(/step_(\d+)/i);
  if (match) {
    return `Step ${match[1]}`;
  }
  return text;
}

function humanizeProvider(value) {
  const raw = String(value || "").toLowerCase();
  if (!raw) {
    return "";
  }
  if (raw.includes("claude-3-5-sonnet")) {
    return "Claude 3.5 Sonnet";
  }
  if (raw.includes("claude")) {
    return "Claude";
  }
  if (raw.includes("gpt-4o-mini")) {
    return "GPT-4o Mini";
  }
  if (raw.includes("gpt-4o")) {
    return "GPT-4o";
  }
  if (raw.includes("anthropic")) {
    return "Claude 3.5 Sonnet";
  }
  if (raw.includes("openai")) {
    return "GPT-4o";
  }
  return value;
}

function getConfidenceMeta(confidence) {
  const normalized = String(confidence || "Unknown").toLowerCase();
  if (normalized === "high") {
    return { label: "High", className: "border-emerald-400/45 bg-emerald-500/20 text-emerald-100" };
  }
  if (normalized === "medium") {
    return { label: "Medium", className: "border-amber-400/45 bg-amber-500/20 text-amber-100" };
  }
  if (normalized === "low") {
    return { label: "Low", className: "border-red-400/45 bg-red-500/20 text-red-100" };
  }
  return { label: String(confidence || "Unknown"), className: "border-slate-400/45 bg-slate-500/20 text-slate-200" };
}

function formatDuration(durationMs) {
  const numeric = Number(durationMs || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "-";
  }
  return `${(numeric / 1000).toFixed(1)}s`;
}

function formatCost(cost) {
  const numeric = Number(cost || 0);
  if (!Number.isFinite(numeric)) {
    return "-";
  }
  return `$${numeric.toFixed(4)}`;
}

function formatModels(modelsUsed) {
  if (!Array.isArray(modelsUsed) || modelsUsed.length === 0) {
    return "-";
  }
  return modelsUsed.join(", ");
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function truncateText(value, limit = 120) {
  const text = String(value || "");
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit)}...`;
}
