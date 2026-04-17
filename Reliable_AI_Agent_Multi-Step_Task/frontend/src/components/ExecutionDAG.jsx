import StepCard from "./StepCard";

export default function ExecutionDAG({ taskId, steps }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-lg font-semibold">Execution DAG</h2>
      {!taskId ? (
        <p className="text-sm text-slate-400">Create a task to visualize planned execution steps.</p>
      ) : (
        <div className="grid gap-3">
          {(steps ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">No steps available yet.</p>
          ) : (
            steps.map((step) => <StepCard key={step.step_id} step={step} />)
          )}
        </div>
      )}
    </section>
  );
}
