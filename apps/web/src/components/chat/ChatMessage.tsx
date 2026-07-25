'use client';

import { formatDate } from '../../lib/utils';
import { motion } from "framer-motion";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

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
        className="flex items-start gap-4 max-w-[85%] self-end flex-row-reverse"
      >
        <div className="w-8 h-8 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
          <span className="material-symbols-outlined text-sm text-on-surface-variant">person</span>
        </div>
        <div className="bg-primary/10 border border-primary/20 backdrop-blur-md rounded-2xl rounded-tr-sm p-4 text-on-surface flex flex-col gap-1">
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          <span className="text-[10px] text-on-surface-variant/50 self-end mt-1">{formatDate(message.timestamp)}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-4 max-w-[85%]"
    >
      <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-primary text-sm">smart_toy</span>
      </div>
      <div className="glass-card rounded-2xl rounded-tl-sm p-4 text-on-surface leading-relaxed w-full">
        {message.isTyping ? (
          <div className="flex gap-1.5 p-1 items-center h-[24px]">
            <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <ReactMarkdown 
              className="prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-li:marker:text-primary/50"
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
            >
              {message.content}
            </ReactMarkdown>
            <span className="text-[10px] text-on-surface-variant/50 self-end mt-1">{formatDate(message.timestamp)}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
