"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Edge,
  Node,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { motion, AnimatePresence } from "framer-motion";

import AgentNode from "./AgentNode";
import type { AgentNodeData } from "./AgentNode";
import AnimatedEdge from "./AnimatedEdge";
import { NodeDetailPanel } from "./NodeDetailPanel";
import { useExecutionStore } from "../../stores/execution-store";

const nodeTypes = {
  agentNode: AgentNode,
};

const edgeTypes = {
  animatedEdge: AnimatedEdge,
};

const nodeWidth = 260;
const nodeHeight = 56;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = "TB") => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction, nodesep: 40, ranksep: 80 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? "left" : "top",
      sourcePosition: isHorizontal ? "right" : "bottom",
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
    return newNode as Node;
  });

  return { nodes: newNodes, edges };
};

/* ───────── Empty State ───────── */
function EmptyState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-0 pointer-events-none select-none">
      {/* Neural network silhouette */}
      <div className="neural-pulse mb-8">
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Central node */}
          <circle cx="80" cy="80" r="12" fill="rgba(137, 206, 255, 0.15)" stroke="rgba(137, 206, 255, 0.3)" strokeWidth="1.5" />
          <circle cx="80" cy="80" r="4" fill="rgba(137, 206, 255, 0.4)" />
          
          {/* Top nodes */}
          <circle cx="80" cy="30" r="8" fill="rgba(76, 215, 246, 0.1)" stroke="rgba(76, 215, 246, 0.25)" strokeWidth="1" />
          <circle cx="40" cy="50" r="6" fill="rgba(192, 193, 255, 0.1)" stroke="rgba(192, 193, 255, 0.2)" strokeWidth="1" />
          <circle cx="120" cy="50" r="6" fill="rgba(192, 193, 255, 0.1)" stroke="rgba(192, 193, 255, 0.2)" strokeWidth="1" />
          
          {/* Bottom nodes */}
          <circle cx="50" cy="120" r="7" fill="rgba(76, 215, 246, 0.1)" stroke="rgba(76, 215, 246, 0.2)" strokeWidth="1" />
          <circle cx="110" cy="120" r="7" fill="rgba(76, 215, 246, 0.1)" stroke="rgba(76, 215, 246, 0.2)" strokeWidth="1" />
          <circle cx="80" cy="140" r="5" fill="rgba(137, 206, 255, 0.1)" stroke="rgba(137, 206, 255, 0.2)" strokeWidth="1" />
          
          {/* Connections */}
          <line x1="80" y1="38" x2="80" y2="68" stroke="rgba(137, 206, 255, 0.12)" strokeWidth="1" />
          <line x1="46" y1="54" x2="70" y2="74" stroke="rgba(192, 193, 255, 0.1)" strokeWidth="1" />
          <line x1="114" y1="54" x2="90" y2="74" stroke="rgba(192, 193, 255, 0.1)" strokeWidth="1" />
          <line x1="74" y1="90" x2="54" y2="114" stroke="rgba(76, 215, 246, 0.1)" strokeWidth="1" />
          <line x1="86" y1="90" x2="106" y2="114" stroke="rgba(76, 215, 246, 0.1)" strokeWidth="1" />
          <line x1="80" y1="92" x2="80" y2="135" stroke="rgba(137, 206, 255, 0.08)" strokeWidth="1" />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-white/25 tracking-wide mb-2">
        Awaiting Execution
      </h3>
      <p className="text-xs text-white/15 max-w-[240px] text-center leading-relaxed">
        Submit a goal in the chat to watch the agent&apos;s reasoning unfold in real-time
      </p>
    </div>
  );
}

/* ───────── Inner Graph (needs ReactFlow context) ───────── */
function ExecutionGraphInner() {
  const { executionSteps, status } = useExecutionStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeData, setSelectedNodeData] = useState<AgentNodeData | null>(null);
  const { fitView } = useReactFlow();

  const handleNodeSelect = useCallback((nodeId: string) => {
    const step = executionSteps.find((s, idx) => String(s.id || idx) === nodeId);
    if (step) {
      setSelectedNodeData({
        stepNumber: step.step_number || 0,
        type: step.step_type || 'unknown',
        status: step.status,
        toolName: step.tool_name,
        toolInput: step.tool_input,
        toolOutput: step.tool_output,
        reasoning: step.reasoning || step.description,
        error: step.error_message,
        tokens: step.tokens_used,
        latency: step.latency_ms,
      });
    }
  }, [executionSteps]);

  useEffect(() => {
    if (!executionSteps || executionSteps.length === 0) {
      setNodes([]);
      setEdges([]);
      setSelectedNodeData(null);
      return;
    }

    // Convert store steps into nodes
    const initialNodes: Node[] = executionSteps.map((step, idx) => ({
      id: String(step.id || idx),
      type: "agentNode",
      position: { x: 0, y: 0 },
      data: {
        stepNumber: step.step_number || idx + 1,
        type: step.step_type || (step.tool_name ? 'tool_call' : 'unknown'),
        status: step.status,
        toolName: step.tool_name,
        toolInput: step.tool_input,
        toolOutput: step.tool_output,
        reasoning: step.reasoning || step.description,
        error: step.error_message,
        tokens: step.tokens_used,
        latency: step.latency_ms,
        onSelect: handleNodeSelect,
      } satisfies AgentNodeData,
    }));

    // Create edges connecting step N to step N+1
    const initialEdges: Edge[] = [];
    for (let i = 0; i < executionSteps.length - 1; i++) {
      const sourceStatus = executionSteps[i].status;
      const targetStatus = executionSteps[i + 1].status;
      const isActive = targetStatus === "running";

      initialEdges.push({
        id: `e${executionSteps[i].id || i}-${executionSteps[i + 1].id || i + 1}`,
        source: String(executionSteps[i].id || i),
        target: String(executionSteps[i + 1].id || i + 1),
        type: "animatedEdge",
        animated: isActive,
        data: {
          sourceStatus,
          targetStatus,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: sourceStatus === "completed" ? "rgba(76, 215, 246, 0.5)" : "rgba(255, 255, 255, 0.15)",
        },
      });
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      "TB"
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [executionSteps, setNodes, setEdges, handleNodeSelect]);

  // Auto-center on new nodes
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.3, duration: 600 });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, fitView]);

  const isActive = status === "running";
  const isEmpty = !executionSteps || executionSteps.length === 0;

  return (
    <div className="w-full h-full relative">
      {isEmpty && <EmptyState />}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={() => setSelectedNodeData(null)}
        fitView
        minZoom={0.3}
        maxZoom={1.5}
        className="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          gap={28}
          size={1}
          color={isActive ? "rgba(137, 206, 255, 0.08)" : "rgba(255, 255, 255, 0.04)"}
          className={`transition-colors duration-1000 ${isActive ? 'graph-grid active' : 'graph-grid'}`}
        />
        <Controls
          className="!bg-[#1a1a1f]/80 !backdrop-blur-xl !border !border-white/10 !rounded-xl !shadow-xl"
          showInteractive={false}
        />
        <MiniMap
          className="!bg-[#0e0e10]/80 !backdrop-blur-md !border !border-white/10 !rounded-lg !overflow-hidden"
          maskColor="rgba(0,0,0,0.6)"
          nodeColor={(n: any) => {
            const s = n.data?.status;
            if (s === "completed") return "#4cd7f6";
            if (s === "running") return "#89ceff";
            if (s === "failed") return "#ff5252";
            return "#353437";
          }}
        />
      </ReactFlow>

      {/* Detail Panel Overlay */}
      <NodeDetailPanel
        node={selectedNodeData}
        onClose={() => setSelectedNodeData(null)}
      />
    </div>
  );
}

/* ───────── Wrapper with Provider ───────── */
export default function ExecutionGraph() {
  return (
    <ReactFlowProvider>
      <ExecutionGraphInner />
    </ReactFlowProvider>
  );
}
