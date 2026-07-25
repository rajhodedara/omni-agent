'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="glass" style={{
      position: 'relative',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-2)',
      display: 'flex',
      alignItems: 'flex-end',
      transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
      boxShadow: 'var(--shadow-lg)'
    }}>
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="How can I help you today?"
        disabled={disabled}
        style={{
          flex: 1,
          maxHeight: '200px',
          minHeight: '44px',
          resize: 'none',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-primary)',
          padding: 'var(--space-3) var(--space-4)',
          fontSize: '1rem',
          outline: 'none',
          lineHeight: 1.5,
          fontFamily: 'inherit'
        }}
      />
      <div style={{ padding: 'var(--space-2)' }}>
        <button
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-lg)',
            background: input.trim() && !disabled ? 'var(--accent-gradient)' : 'var(--bg-secondary)',
            color: input.trim() && !disabled ? 'white' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            opacity: disabled ? 0.5 : 1,
            cursor: input.trim() && !disabled ? 'pointer' : 'not-allowed',
            boxShadow: input.trim() && !disabled ? 'var(--shadow-glow)' : 'none',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
      
      <div style={{
        position: 'absolute',
        bottom: '-24px',
        right: '16px',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)'
      }}>
        Press <kbd style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>Ctrl</kbd> + <kbd style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>Enter</kbd> to send
      </div>
    </div>
  );
}
