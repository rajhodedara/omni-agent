'use client';

import { useRef, useEffect } from 'react';
import ChatMessage, { Message } from './ChatMessage';
import { motion } from 'framer-motion';

export interface QuickAction {
  text: string;
  icon: string;
}

interface ChatThreadProps {
  messages: Message[];
  quickActions?: QuickAction[];
  onSelectAction?: (text: string) => void;
}

export default function ChatThread({ messages, quickActions = [], onSelectAction }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 shadow-[0_0_20px_rgba(192,193,255,0.15)] flex items-center justify-center mb-6 node-pulse"
        >
          <span className="material-symbols-outlined text-primary text-3xl">psychology</span>
        </motion.div>
        <h3 className="font-headline-md text-xl text-white mb-2 font-bold">PersonalAI Initialized</h3>
        <p className="font-body-sm text-[13px] max-w-[260px] text-on-surface-variant/80 leading-relaxed mb-8">
          Autonomous engine core active. Try starting with one of these workflows:
        </p>
        
        {quickActions.length > 0 && (
          <div className="flex flex-col gap-3 w-full max-w-[260px] animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => onSelectAction && onSelectAction(action.text)}
                className="glass-panel p-3 rounded-xl flex items-center gap-3 text-left hover:border-primary/50 hover:bg-primary/5 active:scale-95 transition-all group cursor-pointer"
              >
                <span className="text-lg">{action.icon}</span>
                <span className="font-body-sm text-[12px] text-on-surface group-hover:text-primary transition-colors">
                  {action.text}
                </span>
                <span className="material-symbols-outlined text-[14px] ml-auto text-on-surface-variant/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all">
                  arrow_forward_ios
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {messages.map(msg => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} className="h-[1px]" />
    </div>
  );
}
