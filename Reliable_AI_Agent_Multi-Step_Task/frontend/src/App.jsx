import { useState } from "react";

import ExecutionDAG from "./components/ExecutionDAG";
import LiveLogs from "./components/LiveLogs";
import MetricsBar from "./components/MetricsBar";
import TaskInput from "./components/TaskInput";
import TraceTimeline from "./components/TraceTimeline";

export default function App() {
  const [taskId, setTaskId] = useState(null);
  const [steps, setSteps] = useState([]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Reliable AI Agent for Multi-Step Task Execution Under Uncertainty
        </h1>
        <TaskInput onTaskCreated={(payload) => {
          setTaskId(payload.task_id);
          setSteps(payload.steps ?? []);
        }} />
        <MetricsBar taskId={taskId} />
        <ExecutionDAG taskId={taskId} steps={steps} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TraceTimeline taskId={taskId} />
          <LiveLogs taskId={taskId} />
        </div>
      </div>
    </main>
  );
}
