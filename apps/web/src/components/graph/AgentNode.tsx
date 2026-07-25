"use client";

import React, { memo, MouseEvent } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { motion } from 'framer-motion';

export interface AgentNodeData extends Record<string, unknown> {
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
  isSelected?: boolean;
  onSelect?: (nodeId: string) => void;
}

export type AgentNodeType = Node<AgentNodeData, 'agent'>;

/* ── Derive a human-readable label from tool_name or type ── */
const getLabel = (type: string, toolName?: string): string => {
  if (toolName) {
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
  }
  const typeMap: Record<string, string> = {
    plan: 'Planning',
    tool_call: 'Tool Call',
    summary: 'Summary',
    unknown: 'Processing',
  };
  return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

/* ── Icon based on tool name ── */
const getIcon = (type: string, toolName?: string): string => {
  if (toolName) {
    const map: Record<string, string> = {
      yelp_search: 'restaurant',
      web_search: 'travel_explore',
      web_scrape: 'language',
      weather: 'cloud',
      news: 'newspaper',
      maps: 'map',
      human_input: 'person',
      save_memory_fact: 'neurology',
      save_user_preference: 'favorite',
    };
    return map[toolName] || 'build_circle';
  }
  if (type === 'plan') return 'psychology';
  if (type === 'summary') return 'auto_awesome';
  return 'memory';
};

/* ── Status color config ── */
const statusConfig: Record<string, { dot: string; text: string; label: string; border: string; bg: string }> = {
  completed: {
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
    label: 'Done',
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/8',
  },
  running: {
    dot: 'bg-sky-400 animate-pulse',
    text: 'text-sky-400',
    label: 'Running',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/8',
  },
  failed: {
    dot: 'bg-red-400',
    text: 'text-red-400',
    label: 'Failed',
    border: 'border-red-500/25',
    bg: 'bg-red-500/8',
  },
  pending: {
    dot: 'bg-gray-500',
    text: 'text-gray-500',
    label: 'Pending',
    border: 'border-white/5',
    bg: 'bg-white/2',
  },
};

const getStatus = (s: string) => statusConfig[s.toLowerCase()] || statusConfig.pending;

function AgentNode({ id, data }: NodeProps<AgentNodeType>) {
  const status = getStatus(data.status);
  const icon = getIcon(data.type, data.toolName);
  const label = getLabel(data.type, data.toolName);
  const isPending = data.status.toLowerCase() === 'pending';

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (data.onSelect) data.onSelect(id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: isPending ? 0.5 : 1, y: 0, scale: 1 }}
      transition={{
        delay: (data.stepNumber || 0) * 0.08,
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      onClick={handleClick}
      className="group cursor-pointer"
    >
      <Handle type="target" position={Position.Top} className="!opacity-0 !w-0 !h-0" />

      <div className={`
        w-[260px] rounded-2xl border transition-all duration-300
        bg-[#141418]/90 backdrop-blur-xl
        ${status.border}
        hover:border-white/15 hover:bg-[#1a1a1f]/90
        hover:shadow-lg hover:shadow-black/30
        hover:-translate-y-0.5
        ${data.isSelected ? 'border-sky-500/40 shadow-[0_0_20px_rgba(56,189,248,0.12)]' : ''}
      `}>
        <div className="flex items-center gap-3 px-4 py-3.5">
          {/* Icon */}
          <div className={`
            w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
            ${status.bg} border ${status.border}
          `}>
            <span className={`material-symbols-outlined text-[18px] ${status.text}`}>
              {icon}
            </span>
          </div>

          {/* Label + Tool */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-white/90 truncate">
                {label}
              </span>
            </div>
            {data.reasoning && (
              <p className="text-[11px] text-white/30 truncate mt-0.5 leading-tight">
                {data.reasoning}
              </p>
            )}
          </div>

          {/* Status dot + Step number */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            <span className="text-[10px] font-mono text-white/20">
              {String(data.stepNumber).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0" />
    </motion.div>
  );
}

export default memo(AgentNode);
