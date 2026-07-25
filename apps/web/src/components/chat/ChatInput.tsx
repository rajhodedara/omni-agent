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
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative flex items-center bg-surface-glass border border-glass rounded-3xl px-4 py-2 focus-within:ring-1 focus-within:ring-primary/50 transition-all w-full">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything..."
        disabled={disabled}
        rows={1}
        className="bg-transparent border-none focus:ring-0 text-body-sm font-body-sm flex-1 text-on-surface placeholder:text-on-surface-variant/50 resize-none outline-none min-h-[24px] max-h-[120px] py-2 scroll-hide"
      />
      <button
        onClick={handleSend}
        disabled={!input.trim() || disabled}
        className={`rounded-full p-2 flex items-center justify-center transition-all active:scale-95 ml-2 ${
          input.trim() && !disabled
            ? 'bg-primary hover:bg-primary-container text-on-primary shadow-[0_0_15px_rgba(192,193,255,0.3)]'
            : 'bg-surface-variant text-on-surface-variant opacity-50 cursor-not-allowed'
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">send</span>
      </button>
    </div>
  );
}
