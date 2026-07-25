"use client";

import { useEffect, useState } from "react";
import { useExecutionStore } from "../../stores/execution-store";

interface ExecutionSummary {
  id: string;
  original_prompt: string;
  result_summary?: string;
  status: string;
  created_at: string;
  step_count: number;
}

interface ExecutionListProps {
  onSelect?: (exec: ExecutionSummary) => void;
}

export default function ExecutionList({ onSelect }: ExecutionListProps) {
  const [executions, setExecutions] = useState<ExecutionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeExecutionId, setActiveExecution, setExecutionSteps, setStatus } = useExecutionStore();

  useEffect(() => {
    fetchExecutions();
  }, []);

  const fetchExecutions = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${baseUrl}/api/executions`);
      if (response.ok) {
        const data = await response.json();
        setExecutions(data.executions || []);
      }
    } catch (error) {
      console.error("Failed to fetch executions", error);
    } finally {
      setLoading(false);
    }
  };

  const loadExecutionSteps = async (exec: ExecutionSummary) => {
    setActiveExecution(exec.id);
    setStatus('idle'); // Stop any running animation
    
    // Call the onSelect callback so parent can restore chat state
    if (onSelect) {
      onSelect(exec);
    }
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${baseUrl}/api/executions/${exec.id}/steps`);
      if (response.ok) {
        const data = await response.json();
        setExecutionSteps(data);
      }
    } catch (error) {
      console.error("Failed to fetch execution steps", error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-on-surface-variant">
        Loading history...
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-on-surface-variant">
        No execution history found.
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto p-4 gap-3 scroll-hide">
      {executions.map((exec) => (
        <button
          key={exec.id}
          onClick={() => loadExecutionSteps(exec)}
          className={`flex flex-col gap-2 p-4 rounded-xl border text-left transition-all ${
            activeExecutionId === exec.id
              ? "bg-primary/10 border-primary"
              : "glass-card border-white/10 hover:bg-white/5 hover:border-white/20"
          }`}
        >
          <div className="flex justify-between items-start gap-4">
            <span className="font-medium text-on-surface line-clamp-2 text-sm">
              {exec.original_prompt}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                exec.status === "completed"
                  ? "bg-tertiary/20 text-tertiary"
                  : exec.status === "failed"
                  ? "bg-error/20 text-error"
                  : "bg-secondary/20 text-secondary"
              }`}
            >
              {exec.status}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-on-surface-variant w-full mt-1">
            <span>{new Date(exec.created_at).toLocaleDateString()} {new Date(exec.created_at).toLocaleTimeString()}</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">account_tree</span>
              {exec.step_count} steps
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
