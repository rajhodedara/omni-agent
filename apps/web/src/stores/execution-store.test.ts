import { describe, it, expect, beforeEach } from 'vitest';
import { useExecutionStore } from './execution-store';

describe('useExecutionStore', () => {
  beforeEach(() => {
    useExecutionStore.getState().reset();
  });

  it('initializes with default state', () => {
    const state = useExecutionStore.getState();
    expect(state.activeExecutionId).toBeNull();
    expect(state.executionSteps).toEqual([]);
    expect(state.status).toBe('idle');
  });

  it('updates status and steps correctly', () => {
    useExecutionStore.getState().setStatus('running');
    useExecutionStore.getState().setExecutionSteps([
      { id: '1', step_number: 1, step_type: 'tool_call', tool_name: 'web_search', status: 'completed' }
    ]);

    const state = useExecutionStore.getState();
    expect(state.status).toBe('running');
    expect(state.executionSteps.length).toBe(1);
    expect(state.executionSteps[0].tool_name).toBe('web_search');
  });
});
