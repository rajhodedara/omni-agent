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
  if (type === "tool_call" && toolName?.includes("search")) return "travel_explore";
  if (type === "tool_call") return "build_circle";
  if (type === "summary") return "auto_awesome";
  return "memory";
};

const getStatusStyles = (status: string) => {
  switch (status) {
    case "completed":
      return {
        container: "premium-glass glow-completed",
        iconColor: "text-neon-teal",
        pulse: "",
        spinBorder: "",
        icon: "check_circle",
      };
    case "running":
      return {
        container: "premium-glass glow-running neon-pulse-running",
        iconColor: "text-neon-cyan",
        pulse: "animate-pulse",
        spinBorder: "border-t-[#89ceff] animate-spin",
        icon: "",
      };
    case "failed":
      return {
        container: "premium-glass glow-failed",
        iconColor: "text-neon-red",
        pulse: "",
        spinBorder: "",
        icon: "error",
      };
    default:
      return {
        container: "premium-glass border-white/10",
        iconColor: "text-gray-400",
        pulse: "",
        spinBorder: "",
        icon: "",
      };
  }
};

const AgentNode = ({ data }: AgentNodeProps) => {
  const styles = getStatusStyles(data.status);
  const iconName = styles.icon || getIcon(data.type, data.toolName);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
      className="relative z-10 flex flex-col items-center gap-4 group"
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />

      <div className={`w-[320px] min-h-[180px] rounded-3xl border-2 ${styles.container} flex flex-col p-5 group-hover:scale-[1.03] transition-all duration-400 ease-out`}>
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-12 h-12 flex-shrink-0">
            {data.status === "running" && (
              <>
                <div className="absolute inset-0 border-2 border-[#89ceff]/20 rounded-full"></div>
                <div className={`absolute inset-0 border-2 rounded-full border-transparent ${styles.spinBorder}`}></div>
              </>
            )}
            <span className={`material-symbols-outlined absolute inset-0 flex items-center justify-center ${styles.iconColor} text-3xl drop-shadow-md`}>
              {iconName}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-white capitalize tracking-wide">
              {(data.type || "Agent Step").replace("_", " ")}
            </h3>
            {data.toolName && (
              <p className={`text-xs font-semibold uppercase tracking-wider mt-0.5 ${styles.iconColor} ${styles.pulse}`}>
                {data.toolName.replace("_", " ")}
              </p>
            )}
          </div>
        </div>

        {/* Content Box */}
        <div className="flex-1 max-h-[100px] overflow-y-auto scroll-hide bg-black/40 rounded-xl p-3 border border-white/5 shadow-inner">
          {data.error ? (
            <p className="text-xs text-[#ff5252] font-mono break-words">{data.error}</p>
          ) : data.reasoning ? (
            <p className="text-[12px] text-gray-300 leading-relaxed font-medium">{data.reasoning}</p>
          ) : data.toolInput ? (
            <pre className="text-[11px] text-gray-400 font-mono break-words whitespace-pre-wrap">
              {JSON.stringify(data.toolInput, null, 2)}
            </pre>
          ) : (
            <p className="text-[12px] text-gray-500 italic flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-ping"></span>
              Initializing core...
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Step</span>
            <span className="text-xs font-bold text-[#89ceff] bg-[#89ceff]/10 px-2 py-0.5 rounded-md border border-[#89ceff]/20 shadow-[0_0_10px_rgba(137,206,255,0.2)]">
              {String(data.stepNumber).padStart(2, '0')}
            </span>
          </div>
          {data.latency && (
            <div className="text-[10px] font-mono text-gray-500">
              {data.latency}ms
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </motion.div>
  );
};

export default memo(AgentNode);
