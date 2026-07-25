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
      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.15)] flex items-center justify-center mb-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 animate-pulse" />
          <span className="material-symbols-outlined text-indigo-400 text-3xl z-10">psychology</span>
        </motion.div>
        <h3 className="text-2xl text-white mb-2 font-bold tracking-tight">PersonalAI Initialized</h3>
        <p className="text-sm max-w-[280px] text-gray-400 leading-relaxed mb-8">
          Autonomous engine core active. Try starting with one of these workflows:
        </p>
        
        {quickActions.length > 0 && (
          <div className="flex flex-col gap-3 w-full max-w-[280px] animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => onSelectAction && onSelectAction(action.text)}
                className="glass-panel p-4 rounded-xl flex items-center gap-3 text-left hover:border-indigo-500/50 hover:bg-white/5 active:scale-95 transition-all group cursor-pointer shadow-sm hover:shadow-indigo-500/10"
              >
                <span className="text-xl drop-shadow-sm">{action.icon}</span>
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                  {action.text}
                </span>
                <span className="material-symbols-outlined text-sm ml-auto text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all">
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
