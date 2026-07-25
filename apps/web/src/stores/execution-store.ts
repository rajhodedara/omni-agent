import { create } from 'zustand';

export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface Step {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: number;
}

interface ExecutionState {
  activeExecutionId: string | null;
  executionSteps: Step[];
  status: ExecutionStatus;
  setActiveExecution: (id: string | null) => void;
  addStep: (step: Step) => void;
  updateStep: (id: string, updates: Partial<Step>) => void;
  setStatus: (status: ExecutionStatus) => void;
  reset: () => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  activeExecutionId: null,
  executionSteps: [],
  status: 'idle',
  setActiveExecution: (id) => set({ activeExecutionId: id }),
  addStep: (step) => set((state) => ({ executionSteps: [...state.executionSteps, step] })),
  updateStep: (id, updates) => set((state) => ({
    executionSteps: state.executionSteps.map(step => 
      step.id === id ? { ...step, ...updates } : step
    )
  })),
  setStatus: (status) => set({ status }),
  reset: () => set({ activeExecutionId: null, executionSteps: [], status: 'idle' })
}));
