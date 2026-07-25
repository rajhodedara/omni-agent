'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface NodeDetailPanelProps {
  node: {
    stepNumber: number;
    type: string;
    status: string;
    toolName?: string;
    toolInput?: any;
    toolOutput?: any;
    reasoning?: string;
    error?: string;
    tokens?: number;
    latency?: number;
  } | null;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  running: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  failed: 'text-red-400 bg-red-500/10 border-red-500/20',
  pending: 'text-gray-400 bg-white/5 border-white/10',
};

const getToolLabel = (toolName: string): string => {
  const map: Record<string, string> = {
    yelp_search: 'Yelp Search',
    web_search: 'Web Search',
    web_scrape: 'Web Scrape',
    weather: 'Weather',
    news: 'News Lookup',
    maps: 'Maps',
    human_input: 'Human Input',
    save_memory_fact: 'Save Memory',
    save_user_preference: 'Save Preference',
  };
  return map[toolName] || toolName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const safeStatus = (node?.status || 'pending').toLowerCase();
  const statusStyle = statusColors[safeStatus] || statusColors.pending;
  const safeType = node?.type || 'unknown';
  
  const title = node?.toolName 
    ? getToolLabel(node.toolName) 
    : (typeof safeType === 'string' ? safeType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown');

  const renderContent = (content: any) => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    try {
      return JSON.stringify(content, null, 2);
    } catch (e) {
      return String(content);
    }
  };

  return (
    <AnimatePresence>
      {node && (
        <motion.div
          key={node.stepNumber || 'panel'}
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="absolute right-0 top-0 bottom-0 z-50 w-[360px] h-full
          bg-[#0c0c10]/95 backdrop-blur-2xl border-l border-white/[0.06]
          shadow-[-12px_0_40px_rgba(0,0,0,0.5)]
          flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-white/30 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded">
                STEP {String(node.stepNumber || 0).padStart(2, '0')}
              </span>
              <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusStyle}`}>
                {node.status || 'PENDING'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center
                text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
          <h2 className="text-[15px] font-medium text-white/90">
            {title}
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scroll-hide px-5 py-4 space-y-5">
          
          {/* Error */}
          {node.error && (
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-red-400/70 mb-2">Error</h3>
              <div className="bg-red-500/[0.06] border border-red-500/15 rounded-xl p-3.5">
                <p className="text-[12px] text-red-300/80 font-mono leading-relaxed whitespace-pre-wrap">
                  {node.error}
                </p>
              </div>
            </section>
          )}

          {/* Reasoning */}
          {node.reasoning && (
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-2">Reasoning</h3>
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5">
                <p className="text-[12.5px] text-white/55 leading-relaxed whitespace-pre-wrap">
                  {node.reasoning}
                </p>
              </div>
            </section>
          )}

          {/* Tool Details */}
          {node.toolName && (
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-2">Tool Execution</h3>
              <div className="space-y-3">
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5">
                  <div className="text-[10px] uppercase tracking-wider text-white/20 mb-1.5">Name</div>
                  <div className="text-[13px] text-white/70 font-mono">{node.toolName}</div>
                </div>

                {node.toolInput && (
                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5 flex flex-col">
                    <div className="text-[10px] uppercase tracking-wider text-white/20 mb-1.5">Input</div>
                    <pre className="text-[11px] text-sky-300/50 font-mono leading-relaxed whitespace-pre-wrap break-all">
                      {renderContent(node.toolInput)}
                    </pre>
                  </div>
                )}

                {node.toolOutput && (
                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5 flex flex-col">
                    <div className="text-[10px] uppercase tracking-wider text-white/20 mb-1.5">Output</div>
                    <pre className="text-[11px] text-emerald-300/50 font-mono leading-relaxed whitespace-pre-wrap break-all max-h-[250px] overflow-y-auto scroll-hide">
                      {renderContent(node.toolOutput)}
                    </pre>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Footer metrics */}
        {(node.tokens != null || node.latency != null) && (
          <div className="px-5 py-3 border-t border-white/[0.04] flex items-center gap-4 text-[10px] text-white/20 font-mono flex-shrink-0">
            {node.tokens != null && (
              <span>{Number(node.tokens).toLocaleString()} tokens</span>
            )}
            {node.latency != null && (
              <span>{node.latency}ms</span>
            )}
          </div>
        )}
      </motion.div>
      )}
    </AnimatePresence>
  );
}
