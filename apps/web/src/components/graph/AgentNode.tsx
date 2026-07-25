import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { motion } from "framer-motion";

interface AgentNodeProps {
  data: {
    stepNumber: number;
    type: string;
    status: string;
    toolName?: string;
    toolInput?: any;
    reasoning?: string;
    error?: string;
    tokens?: number;
    latency?: number;
  };
}

const getIcon = (type: string, toolName?: string) => {
  if (type === "plan") return "psychology";
  if (type === "tool_call" && toolName?.includes("search")) return "search";
  if (type === "tool_call") return "build";
  if (type === "summary") return "summarize";
  return "memory";
};

const getStatusStyles = (status: string) => {
  switch (status) {
    case "completed":
      return {
        container: "border-secondary/50 shadow-[0_0_15px_rgba(76,215,246,0.15)]",
        iconColor: "text-secondary",
        pulse: "",
        spinBorder: "",
      };
    case "running":
      return {
        container: "border-primary/50 shadow-[0_0_20px_rgba(192,193,255,0.2)] node-pulse bg-primary/5",
        iconColor: "text-primary",
        pulse: "animate-pulse",
        spinBorder: "border-t-primary animate-spin",
      };
    case "failed":
      return {
        container: "border-error/50 shadow-[0_0_15px_rgba(255,180,171,0.2)]",
        iconColor: "text-error",
        pulse: "",
        spinBorder: "",
      };
    default:
      return {
        container: "border-outline-variant/30",
        iconColor: "text-on-surface-variant",
        pulse: "",
        spinBorder: "",
      };
  }
};

const AgentNode = ({ data }: AgentNodeProps) => {
  const styles = getStatusStyles(data.status);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, type: "spring" }}
      className="relative z-10 flex flex-col items-center gap-4 group"
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!opacity-0"
      />

      <div className={`w-[260px] min-h-[160px] rounded-2xl glass-panel border-2 ${styles.container} flex flex-col p-4 group-hover:scale-[1.02] transition-transform duration-300`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-10 h-10 flex-shrink-0">
            {data.status === "running" && (
              <>
                <div className="absolute inset-0 border-2 border-primary/20 rounded-full"></div>
                <div className={`absolute inset-0 border-2 rounded-full ${styles.spinBorder}`}></div>
              </>
            )}
            <span className={`material-symbols-outlined absolute inset-0 flex items-center justify-center ${styles.iconColor} text-xl`}>
              {data.status === "completed" ? "check_circle" : data.status === "failed" ? "error" : getIcon(data.type, data.toolName)}
            </span>
          </div>
          <div>
            <h3 className="font-headline-md text-[16px] text-white capitalize leading-tight">
              {(data.type || "Agent Step").replace("_", " ")}
            </h3>
            {data.toolName && (
              <p className={`font-label-sm text-[11px] ${styles.iconColor} ${styles.pulse}`}>
                {data.toolName}
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-h-[80px] overflow-y-auto scroll-hide bg-surface-container-lowest/50 rounded-lg p-3 border border-glass">
          {data.error ? (
            <p className="font-label-sm text-[10px] text-error font-mono break-words">{data.error}</p>
          ) : data.reasoning ? (
            <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed">{data.reasoning}</p>
          ) : data.toolInput ? (
            <pre className="font-label-sm text-[10px] text-on-surface-variant font-mono break-words whitespace-pre-wrap">
              {JSON.stringify(data.toolInput, null, 2)}
            </pre>
          ) : (
            <p className="font-body-sm text-[11px] text-on-surface-variant italic">Initializing...</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-glass">
          <div className="flex items-center gap-1.5">
            <span className="font-label-sm text-[9px] uppercase text-on-surface-variant">Step</span>
            <span className="font-label-md text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              {String(data.stepNumber).padStart(2, '0')}
            </span>
          </div>
          {data.latency && (
            <div className="font-label-sm text-[9px] text-on-surface-variant">
              {data.latency}ms
            </div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!opacity-0"
      />
    </motion.div>
  );
};

export default memo(AgentNode);
