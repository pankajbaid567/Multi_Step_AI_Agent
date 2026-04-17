import { useEffect, useMemo, useState } from "react";

export default function useWebSocket(taskId) {
  const [messages, setMessages] = useState([]);

  const wsUrl = useMemo(() => {
    if (!taskId) return null;
    const base = import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:8000/execute/ws";
    return `${base}/${taskId}`;
  }, [taskId]);

  useEffect(() => {
    if (!wsUrl) {
      setMessages([]);
      return undefined;
    }

    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        setMessages((prev) => [...prev, JSON.parse(event.data)]);
      } catch {
        setMessages((prev) => [...prev, { event: "raw", payload: event.data }]);
      }
    };

    socket.onerror = () => {
      setMessages((prev) => [...prev, { event: "error", payload: "WebSocket connection error" }]);
    };

    return () => {
      socket.close();
    };
  }, [wsUrl]);

  return { messages };
}
