"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";

import AgentNode from "./AgentNode";
import AnimatedEdge from "./AnimatedEdge";
import { useExecutionStore } from "../../stores/execution-store";

const nodeTypes = {
  agentNode: AgentNode,
};

const edgeTypes = {
  animatedEdge: AnimatedEdge,
};

const nodeWidth = 320;
const nodeHeight = 180;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = "TB") => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

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

export default function ExecutionGraph() {
  const { executionSteps } = useExecutionStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (!executionSteps || executionSteps.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Convert store steps into nodes
    const initialNodes: Node[] = executionSteps.map((step, idx) => ({
      id: String(step.id || idx),
      type: "agentNode",
      position: { x: 0, y: 0 },
      data: {
        stepNumber: step.step_number || idx + 1,
        type: step.step_type,
        status: step.status,
        toolName: step.tool_name,
        toolInput: step.tool_input,
        reasoning: step.reasoning,
        error: step.error_message,
        tokens: step.tokens_used,
        latency: step.latency_ms,
      },
    }));

    // Create edges connecting step N to step N+1
    const initialEdges: Edge[] = [];
    for (let i = 0; i < executionSteps.length - 1; i++) {
      initialEdges.push({
        id: `e${executionSteps[i].id || i}-${executionSteps[i + 1].id || i + 1}`,
        source: String(executionSteps[i].id || i),
        target: String(executionSteps[i + 1].id || i + 1),
        type: "animatedEdge",
        animated: executionSteps[i + 1].status === "running",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: "rgba(255, 255, 255, 0.2)",
        },
        style: { stroke: "rgba(255, 255, 255, 0.2)", strokeWidth: 2 },
      });
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      "TB"
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [executionSteps, setNodes, setEdges]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        className="dark"
      >
        <Controls className="!bg-surface-container !border-glass !fill-on-surface" />
        <MiniMap
          className="!bg-surface-glass !border-glass backdrop-blur-md rounded-lg overflow-hidden"
          maskColor="rgba(0,0,0,0.5)"
          nodeColor={(n) => {
            if (n.data?.status === "completed") return "#4cd7f6"; // secondary
            if (n.data?.status === "running") return "#c0c1ff"; // primary
            if (n.data?.status === "failed") return "#ffb4ab"; // error
            return "#353437"; // surface-variant
          }}
        />
      </ReactFlow>
    </div>
  );
}
