'use client';

import { useState } from 'react';
import Link from 'next/link';
import ChatInput from '../../components/chat/ChatInput';
import ChatThread from '../../components/chat/ChatThread';
import type { Message } from '../../components/chat/ChatMessage';
import { useExecutionStore } from '../../stores/execution-store';
import ExecutionGraph from '../../components/graph/ExecutionGraph';

export default function DashboardPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { status, setStatus, setExecutionSteps } = useExecutionStore();

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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/chat` : 'http://127.0.0.1:8000/api/chat';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content })
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
                  setExecutionSteps(event.data.plan);
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
    } catch (error) {
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
    <div className="h-screen flex flex-col bg-surface text-text-primary overflow-hidden font-body-md">
      {/* TopNavBar */}
      <header className="bg-surface-dim/80 backdrop-blur-xl border-b border-glass flex justify-between items-center h-16 px-8 w-full z-50 fixed top-0">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <span style={{ fontSize: '1.4rem' }}>✨</span>
            <span className="font-display-lg text-2xl font-bold text-gradient tracking-tight">PersonalAI</span>
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 bg-surface-glass border border-glass rounded-full">
            <span className={`w-2 h-2 rounded-full ${status === 'running' ? 'bg-secondary animate-pulse shadow-[0_0_8px_#4cd7f6]' : 'bg-surface-variant'}`}></span>
            <span className="font-label-md text-xs text-secondary">
              {status === 'running' ? 'Executing Plan...' : 'Idle'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Link href="/" className="font-body-sm text-xs text-on-surface-variant hover:text-primary transition-colors px-2 py-1">
            Home
          </Link>
          <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">notifications</button>
          <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">settings</button>
          <div className="w-8 h-8 rounded-full bg-gradient flex items-center justify-center text-xs font-bold shadow-[0_0_12px_rgba(128,131,255,0.3)] cursor-pointer">
            AI
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex mt-16 overflow-hidden">
        {/* Left Sidebar: Chat Interface */}
        <aside className="w-[340px] shrink-0 bg-surface-container border-r border-glass flex flex-col z-40 relative">
          <div className="p-6 flex flex-col gap-1.5 border-b border-glass bg-surface-container-low/40">
            <h2 className="font-headline-md text-xl text-primary font-semibold">Omni-Agent Core</h2>
            <p className="font-label-sm text-[11px] text-on-surface-variant/80 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block"></span>
              Autonomous Workflow Mode
            </p>
          </div>
          
          {/* Chat Log */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-hide pb-32">
            <ChatThread messages={messages} quickActions={quickActions} onSelectAction={handleSend} />
          </div>
          
          {/* Chat Input */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-surface-container/90 backdrop-blur-md border-t border-glass">
            <div className="w-full">
              <ChatInput onSend={handleSend} disabled={status === 'running'} />
            </div>
          </div>
        </aside>

        {/* Right Canvas: Execution Graph */}
        <section className="flex-1 relative overflow-hidden dot-pattern">
          {/* Execution Graph Component */}
          <div className="absolute inset-0 w-full h-full pointer-events-auto">
            <ExecutionGraph />
          </div>
          
          {/* Floating Action Button */}
          <button 
            onClick={handleReset}
            title="Reset conversation & workflow graph"
            className="fixed bottom-8 right-8 bg-primary text-on-primary px-6 py-3 rounded-full flex items-center gap-2 shadow-[0_10px_30px_rgba(192,193,255,0.3)] hover:scale-105 active:scale-95 transition-all font-label-md text-[13px] group z-50 cursor-pointer"
          >
            <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">bolt</span>
            New Instance
          </button>
          
          {/* Bottom Dashboard Stats */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-8 z-30 pointer-events-none">
            <div className="glass-panel px-6 py-3 rounded-xl flex items-center gap-4 shadow-lg">
              <div className="text-on-surface-variant">
                <p className="font-label-sm text-[10px] uppercase tracking-tighter text-on-surface-variant/70">Status</p>
                <p className="font-label-md text-secondary">{status === 'running' ? 'Active Workflow' : 'Standby'}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
