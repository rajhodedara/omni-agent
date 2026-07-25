'use client';

import { useState } from 'react';
import ChatInput from '../../components/chat/ChatInput';
import ChatThread from '../../components/chat/ChatThread';
import type { Message } from '../../components/chat/ChatMessage';
import { useExecutionStore } from '../../stores/execution-store';

export default function DashboardPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { status, setStatus } = useExecutionStore();

  const handleSend = (content: string) => {
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
      content: '',
      timestamp: Date.now() + 1,
      isTyping: true
    };
    
    setMessages(prev => [...prev, userMsg, agentTypingMsg]);
    setStatus('running');
    
    // Simulate API response
    setTimeout(() => {
      setMessages(prev => {
        const newMsgs = prev.filter(m => m.id !== 'typing');
        return [...newMsgs, {
          id: Date.now().toString(),
          role: 'agent',
          content: 'I am analyzing your request. Since I am an autonomous agent, I will now execute a plan to accomplish this task.',
          timestamp: Date.now()
        }];
      });
      setStatus('idle');
    }, 2000);
  };

  const quickActions = [
    { text: "Plan a trip to Japan", icon: "✈️" },
    { text: "Summarize my recent emails", icon: "📧" },
    { text: "Find a good restaurant nearby", icon: "🍽️" }
  ];

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '120px' }}>
          <ChatThread messages={messages} />
        </div>

        {/* Input Area */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 'var(--space-6)',
          background: 'linear-gradient(to top, var(--bg-primary) 70%, transparent)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          
          {messages.length === 0 && (
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap', justifyContent: 'center' }}>
              {quickActions.map(action => (
                <button
                  key={action.text}
                  onClick={() => handleSend(action.text)}
                  className="glass animate-slide-up"
                  style={{
                    padding: 'var(--space-2) var(--space-4)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.9rem',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-color)';
                    e.currentTarget.style.color = 'var(--accent-color)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                >
                  <span>{action.icon}</span>
                  <span>{action.text}</span>
                </button>
              ))}
            </div>
          )}
          
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <ChatInput onSend={handleSend} disabled={status === 'running'} />
          </div>
        </div>
      </div>
      
      {/* Optional: Execution Panel (Right Side Placeholder) */}
      <div className="glass" style={{
        width: '320px',
        borderLeft: '1px solid var(--border-color)',
        display: 'none', // Hidden on smaller screens, could use media queries
        flexDirection: 'column',
        padding: 'var(--space-6)'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>Execution Status</h3>
        {status === 'idle' ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No active execution.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div className="animate-scale-in" style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-color)', boxShadow: 'var(--shadow-glow)' }} />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Agent is thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
}
