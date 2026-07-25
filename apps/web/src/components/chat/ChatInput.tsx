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
    <div className="relative flex items-center glass-card rounded-xl glass-input p-2 transition-all duration-300 w-full">
      <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
        <span className="material-symbols-outlined">add_circle</span>
      </button>
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Command PersonalAI..."
        disabled={disabled}
        rows={1}
        className="flex-1 bg-transparent border-none text-on-surface focus:ring-0 placeholder-on-surface-variant/50 min-h-[44px] resize-none outline-none py-3 scroll-hide"
      />
      <button className="p-2 text-primary hover:text-primary-container transition-colors mr-1">
        <span className="material-symbols-outlined">mic</span>
      </button>
      <button
        onClick={handleSend}
        disabled={!input.trim() || disabled}
        className={`rounded-lg p-2 flex items-center justify-center transition-colors shadow-[0_0_15px_rgba(208,188,255,0.4)] ${
          input.trim() && !disabled
            ? 'bg-primary hover:bg-primary-container text-on-primary'
            : 'bg-surface-variant text-on-surface-variant opacity-50 cursor-not-allowed shadow-none'
        }`}
      >
        <span className="material-symbols-outlined">send</span>
      </button>
    </div>
  );
}
