'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ChatInput from '../../components/chat/ChatInput';
import ChatThread from '../../components/chat/ChatThread';
import type { Message } from '../../components/chat/ChatMessage';
import { useExecutionStore } from '../../stores/execution-store';
import ExecutionGraph from '../../components/graph/ExecutionGraph';
import ExecutionList from '../../components/dashboard/ExecutionList';
import MemoryManager from '../../components/dashboard/MemoryManager';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'memory'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const { status, setStatus, setExecutionSteps, threadId, setThreadId } = useExecutionStore();
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Resizable panel state
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

  // Detect large screen for resizable layout
  useEffect(() => {
    const checkScreen = () => setIsLargeScreen(window.innerWidth >= 1024);
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!mainRef.current) {
        // Try to find the main element
        const el = document.querySelector('main');
        if (el) mainRef.current = el;
        else return;
      }
      const rect = mainRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const totalWidth = rect.width;
      let newPercent = (offsetX / totalWidth) * 100;
      // Clamp between 25% and 75%
      newPercent = Math.max(25, Math.min(75, newPercent));
      setLeftPanelWidth(newPercent);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    // Prevent text selection while dragging
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging]);

  // Auto-scroll chat container when new messages arrive
  useEffect(() => {
    // Use rAF + small delay to ensure content has rendered before scrolling
    const frame = requestAnimationFrame(() => {
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTo({
            top: chatScrollRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 50);
    });
    return () => cancelAnimationFrame(frame);
  }, [messages]);

  // Shared helper to process SSE stream from either /chat or /chat/respond
  const processSSEStream = async (response: Response) => {
    if (!response.body) throw new Error('No response body');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.replace('data: ', '').trim();
          if (!dataStr) continue;

          try {
            const event = JSON.parse(dataStr);

            if (event.type === 'node_update' && event.data) {
              if (event.data.plan) {
                const currentSteps = useExecutionStore.getState().executionSteps;
                if (event.data.plan.length >= currentSteps.length) {
                  setExecutionSteps(event.data.plan);
                }
              }
              if (event.data.final_summary) {
                setMessages(prev => {
                  const newMsgs = prev.filter(m => m.id !== 'typing');
                  return [...newMsgs, {
                    id: Date.now().toString(),
                    role: 'agent',
                    content: event.data.final_summary,
                    timestamp: Date.now()
                  }];
                });
              }
            }

            // Human input requested — show prompt in chat and re-enable input
            if (event.type === 'human_input') {
              const question = event.data?.question || 'I need more information to proceed.';
              const options = event.data?.options || event.data?.approval_request?.options || [];
              const approvalRequest = event.data?.approval_request || null;

              setThreadId(event.thread_id || null);
              setMessages(prev => {
                const newMsgs = prev.filter(m => m.id !== 'typing');
                return [...newMsgs, {
                  id: `human-input-${Date.now()}`,
                  role: 'agent',
                  content: question,
                  timestamp: Date.now(),
                  options: options,
                  approvalRequest: approvalRequest
                }];
              });
              setStatus('waiting_input');
            }

            if (event.type === 'complete') {
              setStatus('idle');
              setThreadId(null);
              setMessages(prev => prev.filter(m => m.id !== 'typing'));
            }

            if (event.type === 'error') {
              setStatus('idle');
              setMessages(prev => {
                const newMsgs = prev.filter(m => m.id !== 'typing');
                return [...newMsgs, {
                  id: Date.now().toString(),
                  role: 'agent',
                  content: `⚠️ Error: ${event.error || 'An unexpected error occurred during execution.'}`,
                  timestamp: Date.now()
                }];
              });
            }
          } catch (err) {
            console.error('Failed to parse SSE JSON', err);
          }
        }
      }
    }
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSend = async (content: string, imageBase64?: string) => {
    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now()
    };

    // Add agent typing indicator
    const agentTypingMsg: Message = {
      id: 'typing',
      role: 'agent',
      content: 'Thinking...',
      timestamp: Date.now() + 1,
      isTyping: true
    };

    setMessages(prev => [...prev, userMsg, agentTypingMsg]);

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const currentStatus = useExecutionStore.getState().status;
      const currentThreadId = useExecutionStore.getState().threadId;

      let response: Response;

      if (currentStatus === 'waiting_input' && currentThreadId) {
        // Resume a paused execution with the user's response
        setStatus('running');
        response = await fetch(`${baseUrl}/api/chat/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thread_id: currentThreadId, response: content }),
          signal: abortControllerRef.current.signal
        });
      } else {
        // Start a new execution
        setStatus('running');
        setExecutionSteps([]);
        response = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content, image_base64: imageBase64 }),
          signal: abortControllerRef.current.signal
        });
      }

      await processSSEStream(response);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted');
        return;
      }
      console.error('Chat error:', error);
      setStatus('idle');
      setMessages(prev => {
        const newMsgs = prev.filter(m => m.id !== 'typing');
        return [...newMsgs, {
          id: Date.now().toString(),
          role: 'agent',
          content: error.message && error.message.includes('Server returned') ? 
                   `Connection Error: ${error.message}. Please ensure the backend is running and your API keys are correctly configured in the .env file.` : 
                   'Sorry, I encountered an error communicating with the server. Please check your network or backend status.',
          timestamp: Date.now()
        }];
      });
    }
  };

  const quickActions = [
    { text: "Plan a trip to Japan", icon: "✈️" },
    { text: "Summarize my recent emails", icon: "📧" },
    { text: "Find a good restaurant nearby", icon: "🍽️" }
  ];

  const handleReset = () => {
    setMessages([]);
    setExecutionSteps([]);
    setStatus('idle');
    setActiveTab('chat');
  };

  return (
    <div className="h-screen flex flex-col relative overflow-hidden bg-background text-on-background font-body-md">
      {/* TopAppBar */}
      <header className="flex justify-between items-center px-6 h-16 w-full sticky top-0 z-50 bg-surface/30 backdrop-blur-md border-b border-white/10 shadow-[0_0_20px_rgba(208,188,255,0.1)]">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-display-lg text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary">
            Omni Agent
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center glass-card rounded-full px-4 py-1.5 glass-input transition-all">
            <span className="material-symbols-outlined text-on-surface-variant text-sm mr-2">search</span>
            <input className="bg-transparent border-none text-on-surface focus:ring-0 text-sm w-48 placeholder-on-surface-variant/50" placeholder="Search..." type="text"/>
          </div>
          <button className="p-2 rounded-full hover:bg-white/5 transition-colors text-on-surface-variant hover:text-primary scale-95 active:scale-90">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button className="p-2 rounded-full hover:bg-white/5 transition-colors text-on-surface-variant hover:text-primary scale-95 active:scale-90">
            <span className="material-symbols-outlined">help</span>
          </button>
          <button className="p-2 rounded-full hover:bg-white/5 transition-colors text-on-surface-variant hover:text-primary scale-95 active:scale-90">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* SideNavBar */}
        <nav className="hidden md:flex flex-col h-full py-2 bg-surface-container-low/50 backdrop-blur-xl border-r border-white/10 shadow-xl w-[280px] shrink-0 transition-all duration-300 ease-in-out">
          <div className="px-6 py-4 flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/30">
              <span className="material-symbols-outlined text-primary">person</span>
            </div>
            <div>
              <h2 className="font-display-lg text-lg font-semibold text-on-surface">Omni Agent</h2>
              <p className="text-xs text-on-surface-variant">Autonomous Mode</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 px-4 flex-1">
            <button onClick={handleReset} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 text-primary border-l-4 border-primary font-medium hover:bg-white/5 transition-all">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
              New Chat
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === 'history' 
                  ? 'bg-primary/10 text-primary border-l-4 border-primary font-medium'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined">history</span>
              History
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all">
              <span className="material-symbols-outlined">smart_toy</span>
              Agents
            </button>
            <button 
              onClick={() => setActiveTab('memory')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === 'memory' 
                  ? 'bg-primary/10 text-primary border-l-4 border-primary font-medium'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined">folder</span>
              Storage
            </button>
          </div>
          <div className="px-4 mt-auto">
            <button className="w-full py-3 mb-4 rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors font-medium text-sm flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">star</span>
              Upgrade to Pro
            </button>
            <div className="border-t border-white/10 pt-4 flex flex-col gap-2 pb-4">
              <button className="flex items-center gap-3 px-4 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all text-sm">
                <span className="material-symbols-outlined text-sm">settings</span>
                Settings
              </button>
              <button className="flex items-center gap-3 px-4 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all text-sm">
                <span className="material-symbols-outlined text-sm">logout</span>
                Log Out
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content Canvas (Resizable Two Panel Split) */}
        <main className="flex-1 flex flex-col lg:flex-row h-full min-h-0 overflow-hidden p-6 gap-0 relative">
          
          {/* Left Panel: Chat Interface */}
          <section 
            className="flex flex-col glass-card rounded-xl overflow-hidden border border-white/10 relative min-w-[280px] h-full min-h-0"
            style={{ 
              width: isLargeScreen ? `${leftPanelWidth}%` : undefined,
              flex: isLargeScreen ? 'none' : '1'
            }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 bg-surface/50 backdrop-blur-md flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                {activeTab === 'chat' && (
                  <div className={`w-2 h-2 rounded-full ${status === 'running' ? 'bg-secondary shadow-[0_0_10px_#89ceff] animate-pulse' : 'bg-tertiary shadow-[0_0_10px_#4edea3]'}`}></div>
                )}
                <h2 className="font-headline-md text-xl text-on-surface">
                  {activeTab === 'chat' ? 'Goal Setting' : activeTab === 'history' ? 'Execution History' : 'Neural Storage'}
                </h2>
              </div>
              <button className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-xl">more_horiz</span>
              </button>
            </div>
            
            {activeTab === 'chat' ? (
              <>
                {/* Chat Messages Area */}
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 pb-2 chat-scrollbar">
                  <ChatThread messages={messages} quickActions={quickActions} onSelectAction={handleSend} />
                </div>

                {/* Chat Input Area */}
                <div className="p-4 border-t border-white/10 bg-surface/50 backdrop-blur-md z-10 flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2 px-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] text-on-surface-variant backdrop-blur-sm">
                      <span className="text-[12px]">🧠</span> Recalled: Prefers dark mode
                    </span>
                  </div>
                  <ChatInput onSend={handleSend} disabled={status === 'running'} isWaitingInput={status === 'waiting_input'} />
                  <div className="text-center mt-1">
                    <span className="text-[10px] text-on-surface-variant/50 font-label-caps uppercase tracking-widest">
                      {status === 'running' ? 'Agent Processing...' : status === 'waiting_input' ? 'Awaiting Your Response...' : 'Autonomous Agent Active'}
                    </span>
                  </div>
                </div>
              </>
            ) : activeTab === 'history' ? (
              <ExecutionList onSelect={(exec) => {
                const newMessages: Message[] = [
                  { 
                    id: `user-${exec.id}`, 
                    role: 'user', 
                    content: exec.original_prompt, 
                    timestamp: new Date(exec.created_at).getTime() 
                  }
                ];
                if (exec.result_summary) {
                  newMessages.push({
                    id: `agent-${exec.id}`,
                    role: 'agent',
                    content: exec.result_summary,
                    timestamp: new Date(exec.created_at).getTime() + 1000
                  });
                }
                setMessages(newMessages);
                setThreadId(exec.id);
                setActiveTab('chat');
              }} />
            ) : (
              <MemoryManager />
            )}
          </section>

          {/* Resizable Divider Handle */}
          <div 
            className="hidden lg:flex items-center justify-center cursor-col-resize select-none z-30 group px-1"
            style={{ width: '24px', flexShrink: 0 }}
            onMouseDown={handleDividerMouseDown}
          >
            <div className={`w-[5px] rounded-full transition-all duration-200 flex flex-col items-center justify-center gap-[3px] ${
              isDragging 
                ? 'h-16 bg-primary/60 shadow-[0_0_12px_rgba(208,188,255,0.4)]' 
                : 'h-10 bg-white/15 group-hover:h-14 group-hover:bg-primary/40 group-hover:shadow-[0_0_8px_rgba(208,188,255,0.2)]'
            }`}>
              <div className={`w-[3px] h-[3px] rounded-full transition-colors ${isDragging ? 'bg-primary' : 'bg-white/30 group-hover:bg-primary/60'}`} />
              <div className={`w-[3px] h-[3px] rounded-full transition-colors ${isDragging ? 'bg-primary' : 'bg-white/30 group-hover:bg-primary/60'}`} />
              <div className={`w-[3px] h-[3px] rounded-full transition-colors ${isDragging ? 'bg-primary' : 'bg-white/30 group-hover:bg-primary/60'}`} />
            </div>
          </div>

          {/* Right Panel: Execution Graph */}
          <section 
            className="flex flex-col glass-card rounded-xl border border-white/10 overflow-hidden relative min-w-[280px] h-full min-h-0"
            style={{ 
              width: isLargeScreen ? `${100 - leftPanelWidth}%` : undefined,
              flex: isLargeScreen ? 'none' : '1'
            }}
          >
            {/* Graph Header */}
            <div className="px-6 py-4 border-b border-white/10 bg-surface/30 backdrop-blur-md flex justify-between items-center z-20">
              <h2 className="font-headline-md text-xl text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">account_tree</span>
                Execution Graph
              </h2>
              <div className="flex items-center gap-3">
                {/* Step counter */}
                {useExecutionStore.getState().executionSteps.length > 0 && (
                  <span className="text-[10px] font-mono text-on-surface-variant bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                    {useExecutionStore.getState().executionSteps.filter(s => s.status === 'completed').length}
                    /{useExecutionStore.getState().executionSteps.length} steps
                  </span>
                )}
                <div className="flex gap-1.5">
                  <button className="px-3 py-1 rounded-full text-xs border border-white/10 bg-white/5 text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-colors">Map</button>
                  <button className={`px-3 py-1 rounded-full text-xs border transition-colors ${status === 'running' ? 'border-secondary/30 bg-secondary/10 text-secondary' : 'border-primary/30 bg-primary/10 text-primary'}`}>
                    {status === 'running' ? '● Live' : 'Live'}
                  </button>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {useExecutionStore.getState().executionSteps.length > 0 && (
              <div className="h-[2px] bg-white/5 relative z-20">
                <div 
                  className="h-full progress-gradient transition-all duration-700 ease-out"
                  style={{ 
                    width: `${(useExecutionStore.getState().executionSteps.filter(s => s.status === 'completed').length / Math.max(useExecutionStore.getState().executionSteps.length, 1)) * 100}%` 
                  }}
                />
              </div>
            )}
            
            {/* Interactive Graph Area */}
            <div className="flex-1 relative overflow-hidden bg-surface-container-lowest/50">
              <div className="absolute inset-0 w-full h-full pointer-events-auto z-10">
                <ExecutionGraph />
              </div>
            </div>
            
            {/* Status Footer */}
            <div className="px-4 py-3 border-t border-white/10 bg-surface/50 backdrop-blur-md z-20 flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${status === 'running' ? 'bg-secondary shadow-[0_0_8px_#89ceff] animate-pulse' : 'bg-surface-variant'}`}></div>
                {status === 'running' ? 'Agent processing sub-tasks' : 'Agent standby'}
              </div>
              <div className="flex gap-4 font-mono text-[10px] text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <span className={`w-1 h-1 rounded-full ${status === 'running' ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                  Groq LLaMA 3.3
                </span>
                <span className="text-white/20">|</span>
                <span>{useExecutionStore.getState().executionSteps.length} nodes</span>
                <span className="text-white/20">|</span>
                <span>{useExecutionStore.getState().executionSteps.filter(s => s.status === 'completed').length} completed</span>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
