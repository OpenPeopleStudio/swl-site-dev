"use client";

import { useEffect, useState } from "react";

interface TaskRecord {
  id: number;
  agent: string;
  task_text: string;
  status: string;
  created_at: string;
}

interface OutputRecord {
  id: number;
  agent: string;
  task_id: number | null;
  output_type: string | null;
  payload: string | null;
  created_at: string;
}

export default function AgentDashboard() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [outputs, setOutputs] = useState<OutputRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [taskRes, outputRes] = await Promise.all([
          fetch("/api/owner/codex/tasks"),
          fetch("/api/owner/codex/outputs"),
        ]);

        if (!taskRes.ok || !outputRes.ok) {
          throw new Error("Failed loading agent data");
        }

        const [taskData, outputData] = (await Promise.all([
          taskRes.json(),
          outputRes.json(),
        ])) as [TaskRecord[], OutputRecord[]];

        if (!isMounted) return;
        setTasks(taskData);
        setOutputs(outputData);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    load();
    const id = setInterval(load, 2000);
    return () => {
      isMounted = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div style={{ padding: 24, background: "rgba(12,15,23,0.7)", borderRadius: 16 }}>
      <h1 style={{ color: "#00F3FF", fontSize: 24, marginBottom: 16 }}>Agent Activity</h1>
      {error && (
        <p style={{ color: "#FF8EFF", marginBottom: 16 }}>
          Unable to load data: {error}
        </p>
      )}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ color: "#9B4DFF", fontSize: 18 }}>Tasks</h2>
        <pre
          style={{
            background: "#05060A",
            padding: 16,
            borderRadius: 12,
            color: "#CFF6FF",
            maxHeight: 240,
            overflow: "auto",
          }}
        >
          {JSON.stringify(tasks, null, 2)}
        </pre>
      </section>
      <section>
        <h2 style={{ color: "#9B4DFF", fontSize: 18 }}>Outputs</h2>
        <pre
          style={{
            background: "#05060A",
            padding: 16,
            borderRadius: 12,
            color: "#CFF6FF",
            maxHeight: 240,
            overflow: "auto",
          }}
        >
          {JSON.stringify(outputs, null, 2)}
        </pre>
      </section>
    </div>
  );
}
