export default function StepCard({ step }) {
  return (
    <article className="rounded-lg border border-slate-700 bg-slate-950 p-3">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-medium">{step.name}</h3>
        <span className="rounded bg-slate-800 px-2 py-0.5 text-xs uppercase">{step.tool_needed}</span>
      </div>
      <p className="text-sm text-slate-300">{step.description}</p>
      <p className="mt-2 text-xs text-slate-500">Dependencies: {(step.dependencies ?? []).join(", ") || "none"}</p>
    </article>
  );
}
