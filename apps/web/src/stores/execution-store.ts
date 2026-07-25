import { create } from 'zustand';

export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'failed' | 'waiting_input';

export interface Step {
  id?: string;
  step_number?: number;
  step_type?: string;
  title?: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | string;
  tool_name?: string;
  tool_input?: any;
  tool_output?: any;
  reasoning?: string;
  error_message?: string;
  tokens_used?: number;
  latency_ms?: number;
  timestamp?: number;
}

interface ExecutionState {
  activeExecutionId: string | null;
  executionSteps: Step[];
  status: ExecutionStatus;
  threadId: string | null;
  setActiveExecution: (id: string | null) => void;
  addStep: (step: Step) => void;
  updateStep: (id: string, updates: Partial<Step>) => void;
  setExecutionSteps: (steps: Step[]) => void;
  setStatus: (status: ExecutionStatus) => void;
  setThreadId: (id: string | null) => void;
  reset: () => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  activeExecutionId: null,
  executionSteps: [],
  status: 'idle',
  threadId: null,
  setActiveExecution: (id) => set({ activeExecutionId: id }),
  addStep: (step) => set((state) => ({ executionSteps: [...state.executionSteps, step] })),
  updateStep: (id, updates) => set((state) => ({
    executionSteps: state.executionSteps.map(step => 
      step.id === id ? { ...step, ...updates } : step
    )
  })),
  setExecutionSteps: (steps) => set({ executionSteps: steps }),
  setStatus: (status) => set({ status }),
  setThreadId: (id) => set({ threadId: id }),
  reset: () => set({ activeExecutionId: null, executionSteps: [], status: 'idle', threadId: null })
}));
