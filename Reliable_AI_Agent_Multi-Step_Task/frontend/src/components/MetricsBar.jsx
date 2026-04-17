export default function MetricsBar({ taskId }) {
  const metrics = [
    { label: "Task ID", value: taskId ?? "-" },
    { label: "Tokens", value: "0" },
    { label: "Latency", value: "0 ms" },
    { label: "Retries", value: "0" },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-4">
      {metrics.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
          <p className="text-xs uppercase text-slate-500">{item.label}</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-200">{item.value}</p>
        </div>
      ))}
    </section>
  );
}
