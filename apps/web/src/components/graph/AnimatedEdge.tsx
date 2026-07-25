import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';

export default function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  animated,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <defs>
        <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <radialGradient id={`particleGlow-${id}`}>
          <stop offset="0%" stopColor="#89ceff" stopOpacity="1" />
          <stop offset="50%" stopColor="#4cd7f6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#89ceff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Base Path (Glowing) */}
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          strokeWidth: animated ? 3 : 2,
          stroke: animated ? 'rgba(137, 206, 255, 0.6)' : 'rgba(255, 255, 255, 0.1)',
          filter: animated ? `url(#glow-${id})` : 'none',
          transition: 'all 0.3s ease',
        }} 
        className={animated ? "animate-pulse" : ""}
      />

      {/* Animated Data Particle */}
      {animated && (
        <circle r="6" fill={`url(#particleGlow-${id})`} filter={`url(#glow-${id})`}>
          <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
}
