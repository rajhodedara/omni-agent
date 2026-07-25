'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import ChatInput from '../../components/chat/ChatInput';
import ChatThread from '../../components/chat/ChatThread';
import type { Message } from '../../components/chat/ChatMessage';
import { useExecutionStore } from '../../stores/execution-store';
import ExecutionGraph from '../../components/graph/ExecutionGraph';

export default function DashboardPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { status, setStatus, setExecutionSteps } = useExecutionStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSend = async (content: string) => {
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
    setStatus('running');
    setExecutionSteps([]); // Reset graph for new run
    
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/chat` : 'http://127.0.0.1:8000/api/chat';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
        signal: abortControllerRef.current.signal
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        // Keep the last partial chunk in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (!dataStr) continue;
            
            try {
              const event = JSON.parse(dataStr);
              
              if (event.type === 'node_update' && event.data) {
                // If it's a plan update
                if (event.data.plan) {
                  const currentSteps = useExecutionStore.getState().executionSteps;
                  // Only update if the incoming plan is at least as long as current plan to prevent backwards state corruption
                  if (event.data.plan.length >= currentSteps.length) {
                    setExecutionSteps(event.data.plan);
                  }
                }
                
                // If it's the final summary
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
              
              if (event.type === 'complete') {
                setStatus('idle');
                // Remove typing indicator if summary wasn't hit
                setMessages(prev => prev.filter(m => m.id !== 'typing'));
              }
            } catch (err) {
              console.error('Failed to parse SSE JSON', err);
            }
          }
        }
      }
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
          content: 'Sorry, I encountered an error communicating with the server.',
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
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background text-on-background font-body-md">
      {/* TopAppBar */}
      <header className="flex justify-between items-center px-6 h-16 w-full sticky top-0 z-50 bg-surface/30 backdrop-blur-md border-b border-white/10 shadow-[0_0_20px_rgba(208,188,255,0.1)]">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-display-lg text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary">
            PersonalAI
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
              <h2 className="font-display-lg text-lg font-semibold text-on-surface">PersonalAI</h2>
              <p className="text-xs text-on-surface-variant">Autonomous Mode</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 px-4 flex-1">
            <button onClick={handleReset} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 text-primary border-l-4 border-primary font-medium hover:bg-white/5 transition-all">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
              New Chat
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all">
              <span className="material-symbols-outlined">history</span>
              History
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all">
              <span className="material-symbols-outlined">smart_toy</span>
              Agents
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all">
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

        {/* Main Content Canvas (Two Panel Split) */}
        <main className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden p-6 gap-6">
          
          {/* Left Panel: Chat Interface */}
          <section className="flex-1 flex flex-col glass-card rounded-xl overflow-hidden border border-white/10 relative min-w-[300px]">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-white/10 bg-surface/50 backdrop-blur-md flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${status === 'running' ? 'bg-secondary shadow-[0_0_10px_#89ceff] animate-pulse' : 'bg-tertiary shadow-[0_0_10px_#4edea3]'}`}></div>
                <h2 className="font-headline-md text-xl text-on-surface">Goal Setting</h2>
              </div>
              <button className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-xl">more_horiz</span>
              </button>
            </div>
            
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 scroll-hide pb-2">
              <ChatThread messages={messages} quickActions={quickActions} onSelectAction={handleSend} />
            </div>

            {/* Chat Input Area */}
            <div className="p-4 border-t border-white/10 bg-surface/50 backdrop-blur-md z-10 flex flex-col gap-2">
              <div className="flex flex-wrap gap-2 px-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] text-on-surface-variant backdrop-blur-sm">
                  <span className="text-[12px]">🧠</span> Recalled: Prefers dark mode
                </span>
              </div>
              <ChatInput onSend={handleSend} disabled={status === 'running'} />
              <div className="text-center mt-1">
                <span className="text-[10px] text-on-surface-variant/50 font-label-caps uppercase tracking-widest">
                  {status === 'running' ? 'Agent Processing...' : 'Autonomous Agent Active'}
                </span>
              </div>
            </div>
          </section>

          {/* Right Panel: Execution Graph */}
          <section className="flex-1 flex flex-col glass-card rounded-xl border border-white/10 overflow-hidden relative min-w-[300px]">
            {/* Graph Header */}
            <div className="px-6 py-4 border-b border-white/10 bg-surface/30 backdrop-blur-md flex justify-between items-center z-20">
              <h2 className="font-headline-md text-xl text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">account_tree</span>
                Execution Graph
              </h2>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded-full text-xs border border-white/10 bg-white/5 text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-colors">Map</button>
                <button className="px-3 py-1 rounded-full text-xs border border-primary/30 bg-primary/10 text-primary transition-colors">Live</button>
              </div>
            </div>
            
            {/* Interactive Graph Area */}
            <div className="flex-1 relative overflow-hidden bg-surface-container-lowest/50 p-8 flex flex-col dot-pattern">
              <div className="absolute inset-0 w-full h-full pointer-events-auto z-10">
                <ExecutionGraph />
              </div>
            </div>
            
            {/* Status Footer */}
            <div className="px-4 py-3 border-t border-white/10 bg-surface/50 backdrop-blur-md z-20 flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <div className={`w-1.5 h-1.5 rounded-full ${status === 'running' ? 'bg-secondary shadow-[0_0_8px_#89ceff] animate-pulse' : 'bg-surface-variant'}`}></div>
                {status === 'running' ? 'Agent processing sub-tasks' : 'Agent standby'}
              </div>
              <div className="flex gap-4 font-mono text-[10px] text-on-surface-variant">
                <span>Model: Gemini Pro</span>
                <span className="text-white/20">|</span>
                <span>Tokens: ~</span>
                <span className="text-white/20">|</span>
                <span>Latency: ~</span>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
