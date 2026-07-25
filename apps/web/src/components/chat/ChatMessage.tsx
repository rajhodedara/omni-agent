'use client';

import { formatDate } from '../../lib/utils';
import { motion } from "framer-motion";

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  isTyping?: boolean;
}

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  
  if (isUser) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-end gap-2 w-full"
      >
        <div className="bg-primary/20 border border-primary/30 p-4 rounded-xl rounded-tr-none max-w-[90%] shadow-sm">
          <p className="font-body-sm text-[13px] text-white whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
        <div className="text-[10px] text-on-surface-variant/70 mr-1 font-mono">
          {formatDate(message.timestamp)}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-start gap-2 w-full"
    >
      <span className="font-label-sm text-[10px] text-secondary uppercase tracking-widest flex items-center gap-2">
        {message.isTyping && (
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
        )}
        {message.isTyping ? 'Thinking...' : 'System Response'}
      </span>
      <div className="glass-panel p-4 rounded-xl rounded-tl-none max-w-[90%] border-white/10 bg-white/5">
        {message.isTyping ? (
          <div className="flex gap-1.5 p-1">
            <span className="w-1.5 h-1.5 bg-secondary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-secondary/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <p className="font-body-sm text-[13px] text-on-surface whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        )}
      </div>
      {!message.isTyping && (
        <div className="text-[10px] text-on-surface-variant/70 ml-1 font-mono">
          {formatDate(message.timestamp)}
        </div>
      )}
    </motion.div>
  );
}
