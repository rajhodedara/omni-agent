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
  options?: string[];
  approvalRequest?: {
    action: string;
    tool_name: string;
    tool_input: Record<string, any>;
    question: string;
    reason: string;
    options: string[];
  };
}

export default function ChatMessage({ message, onSelectOption }: { message: Message; onSelectOption?: (option: string) => void }) {
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
          <div className="flex flex-col gap-3">
            {message.approvalRequest?.tool_name === 'send_email' ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-1">
                  <span className="material-symbols-outlined text-primary text-lg">mail</span>
                  <span className="font-semibold text-sm tracking-wide uppercase text-primary">Email Draft Preview</span>
                </div>
                <div className="flex flex-col gap-1.5 text-sm bg-white/5 rounded-xl p-3.5 border border-white/5">
                  <div className="flex items-start gap-1">
                    <span className="text-on-surface-variant/70 font-semibold w-16 shrink-0">To:</span>
                    <span className="text-on-surface select-all">{message.approvalRequest.tool_input.recipient}</span>
                  </div>
                  <div className="flex items-start gap-1 border-t border-white/5 pt-1.5">
                    <span className="text-on-surface-variant/70 font-semibold w-16 shrink-0">Subject:</span>
                    <span className="text-on-surface font-medium">{message.approvalRequest.tool_input.subject}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-t border-white/5 pt-1.5 mt-1">
                    <span className="text-on-surface-variant/70 font-semibold mb-0.5">Body:</span>
                    <div className="bg-black/20 rounded-lg p-3 text-on-surface/90 whitespace-pre-wrap font-sans text-[13px] leading-relaxed border border-black/10 select-text">
                      {message.approvalRequest.tool_input.body}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-li:marker:text-primary/50">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}

            {/* Render action options (approval buttons) */}
            {message.options && message.options.length > 0 && (
              <div className="flex flex-wrap gap-2.5 mt-2 border-t border-white/5 pt-3">
                {message.options.map((option, idx) => {
                  const isApprove = option.toLowerCase().includes('approve') || option.toLowerCase().includes('yes');
                  const isReject = option.toLowerCase().includes('reject') || option.toLowerCase().includes('no');
                  
                  let btnClass = "px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all active:scale-95 cursor-pointer ";
                  if (isApprove) {
                    btnClass += "bg-primary text-on-primary hover:bg-primary-container shadow-[0_0_12px_rgba(208,188,255,0.2)]";
                  } else if (isReject) {
                    btnClass += "bg-transparent border border-error text-error hover:bg-error/10";
                  } else {
                    btnClass += "bg-white/10 text-on-surface hover:bg-white/15 border border-white/5";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => onSelectOption && onSelectOption(option)}
                      className={btnClass}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}
            
            <span className="text-[10px] text-on-surface-variant/50 self-end mt-1">{formatDate(message.timestamp)}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
