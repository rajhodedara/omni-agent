'use client';

import { useRef, useEffect } from 'react';
import ChatMessage, { Message } from './ChatMessage';

interface ChatThreadProps {
  messages: Message[];
}

export default function ChatThread({ messages }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-center" style={{ height: '100%', flexDirection: 'column', color: 'var(--text-secondary)', padding: 'var(--space-8)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)', opacity: 0.5 }}>✨</div>
        <h3 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)', color: 'var(--text-primary)', fontWeight: 600 }}>Welcome to PersonalAI</h3>
        <p style={{ textAlign: 'center', maxWidth: '400px' }}>I can help you plan trips, search for information, organize your schedule, and much more. Just ask!</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      padding: 'var(--space-6)',
      maxWidth: '800px',
      margin: '0 auto',
      width: '100%'
    }}>
      {messages.map(msg => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} style={{ height: '1px' }} />
    </div>
  );
}
