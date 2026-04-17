export default function TraceTimeline({ taskId }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-lg font-semibold">Trace Timeline</h2>
      {!taskId ? (
        <p className="text-sm text-slate-400">Execution trace will appear after a task starts.</p>
      ) : (
        <p className="text-sm text-slate-400">
          TODO: Render ordered trace events with node, prompt summary, output and verdict metadata.
        </p>
      )}
    </section>
  );
}
