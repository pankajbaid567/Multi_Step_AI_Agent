import useWebSocket from "../hooks/useWebSocket";

export default function LiveLogs({ taskId }) {
  const { messages } = useWebSocket(taskId);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-lg font-semibold">Live Logs</h2>
      <div className="max-h-64 space-y-2 overflow-auto rounded border border-slate-800 bg-slate-950 p-3 text-sm">
        {messages.length === 0 ? (
          <p className="text-slate-400">No live events yet.</p>
        ) : (
          messages.map((message, index) => (
            <pre className="whitespace-pre-wrap text-slate-300" key={`${index}-${message.event || "evt"}`}>
              {JSON.stringify(message, null, 2)}
            </pre>
          ))
        )}
      </div>
    </section>
  );
}
