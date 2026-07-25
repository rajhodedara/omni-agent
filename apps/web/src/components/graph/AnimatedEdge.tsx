'use client';

import React from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath, Edge } from '@xyflow/react';

export interface AnimatedEdgeData extends Record<string, unknown> {
  sourceStatus?: string;
  targetStatus?: string;
}

export type AnimatedEdgeType = Edge<AnimatedEdgeData, 'animatedEdge'>;

export default function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  animated,
}: EdgeProps<AnimatedEdgeType>) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const sourceStatus = data?.sourceStatus;
  const targetStatus = data?.targetStatus;

  // Subtle color logic
  let strokeColor = 'rgba(255,255,255,0.06)';
  let particleColor = '#38bdf8';

  if (sourceStatus === 'completed' && targetStatus === 'running') {
    strokeColor = 'rgba(56, 189, 248, 0.25)';
    particleColor = '#38bdf8';
  } else if (sourceStatus === 'completed' && targetStatus === 'completed') {
    strokeColor = 'rgba(52, 211, 153, 0.18)';
    particleColor = '#34d399';
  } else if (sourceStatus === 'completed') {
    strokeColor = 'rgba(255,255,255,0.08)';
  }

  const isPending = !sourceStatus || sourceStatus === 'pending' || targetStatus === 'pending';
  const strokeWidth = animated ? 2 : isPending ? 1 : 1.5;

  return (
    <>
      {/* Base edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth,
          stroke: strokeColor,
          transition: 'stroke 0.5s ease',
        }}
        className={isPending ? 'edge-pending-dash' : ''}
      />

      {/* Single subtle particle on active edges */}
      {animated && (
        <>
          <circle r={2.5} fill={particleColor} opacity={0.8}>
            <animateMotion dur="2.5s" repeatCount="indefinite" path={edgePath} />
          </circle>
          <circle r={2} fill={particleColor} opacity={0.4}>
            <animateMotion dur="2.5s" repeatCount="indefinite" path={edgePath} begin="1.2s" />
          </circle>
        </>
      )}
    </>
  );
}
