"use client";

import React, { useMemo, useRef, useState } from "react";
import { DomainPack, RadarAxis } from "@/types/domain-pack";

export interface PolarRadarEngineProps {
  pack: DomainPack;
  primaryScores: Record<string, number>;
  comparisonScores?: Record<string, number> | null;
  primaryLabel?: string;
  comparisonLabel?: string;
  weights?: Record<string, number>;
  onScoreChange?: (axisId: string, newValue: number) => void;
  size?: number;
}

export default function PolarRadarEngine({
  pack,
  primaryScores,
  comparisonScores = null,
  primaryLabel = "Primary Facility",
  comparisonLabel = "Comparison Facility",
  weights = {},
  onScoreChange,
  size = 440,
}: PolarRadarEngineProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingAxis, setDraggingAxis] = useState<string | null>(null);
  const [hoveredAxis, setHoveredAxis] = useState<string | null>(null);

  const axes = pack.axes;
  const numAxes = axes.length;
  const center = size / 2;
  const maxRadius = size * 0.34;
  const rings = [2, 4, 6, 8, 10];

  const getAxisId = (axis: RadarAxis) => axis.id ?? axis.key ?? axis.label;

  const getPoint = (axisIndex: number, value: number) => {
    const angle = (Math.PI * 2 * axisIndex) / numAxes - Math.PI / 2;
    const clamped = Math.max(0, Math.min(10, value));
    const r = (clamped / 10) * maxRadius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const buildPolygonPoints = (scores: Record<string, number>) =>
    axes
      .map((axis: RadarAxis, idx: number) => {
        const key = getAxisId(axis);
        const val = scores[key] ?? (axis.key ? scores[axis.key] : undefined) ?? 0;
        const pt = getPoint(idx, val);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      })
      .join(" ");

  const computeWeightedScore = (scores: Record<string, number> | null) => {
    if (!scores) return 0;
    let weightedSum = 0;
    let totalWeight = 0;
    for (const axis of axes) {
      const key = getAxisId(axis);
      const w =
        weights[key] ??
        (axis.key ? weights[axis.key] : undefined) ??
        axis.weight ??
        axis.defaultWeight ??
        1;
      const val = scores[key] ?? (axis.key ? scores[axis.key] : undefined) ?? 0;
      weightedSum += val * w;
      totalWeight += w;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  const primaryComposite = useMemo(
    () => computeWeightedScore(primaryScores),
    [primaryScores, axes, weights]
  );

  const comparisonComposite = useMemo(
    () => (comparisonScores ? computeWeightedScore(comparisonScores) : 0),
    [comparisonScores, axes, weights]
  );

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingAxis || !onScoreChange || !svgRef.current) return;
    const axisIndex = axes.findIndex(
      (a: RadarAxis) => getAxisId(a) === draggingAxis
    );
    if (axisIndex === -1) return;

    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * size - center;
    const py = ((e.clientY - rect.top) / rect.height) * size - center;

    const angle = (Math.PI * 2 * axisIndex) / numAxes - Math.PI / 2;
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);

    const projectedRadius = Math.max(0, Math.min(maxRadius, px * ux + py * uy));
    const rawScore = (projectedRadius / maxRadius) * 10;
    const snapped = Math.round(rawScore * 10) / 10;
    onScoreChange(draggingAxis, snapped);
  };

  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-800 bg-slate-950/90 p-5 shadow-xl">
      <div className="mb-3 flex w-full flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3 text-xs">
        <div>
          <span className="font-semibold uppercase tracking-wider text-slate-400">
            Trade-Space Vector
          </span>
          <h3 className="text-sm font-semibold text-slate-100">{pack.name}</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[11px] text-cyan-400">{primaryLabel}</div>
            <div className="font-mono text-base font-bold text-cyan-300">
              {primaryComposite.toFixed(2)}{" "}
              <span className="text-xs font-normal text-slate-400">/ 10</span>
            </div>
          </div>
          {comparisonScores && (
            <div className="border-l border-slate-800 pl-4 text-right">
              <div className="text-[11px] text-amber-400">
                {comparisonLabel}
              </div>
              <div className="font-mono text-base font-bold text-amber-300">
                {comparisonComposite.toFixed(2)}{" "}
                <span className="text-xs font-normal text-slate-400">/ 10</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[440px] touch-none select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDraggingAxis(null)}
        onPointerLeave={() => setDraggingAxis(null)}
      >
        {rings.map((ring: number) => {
          const ringPoints = axes
            .map((_: RadarAxis, idx: number) => {
              const pt = getPoint(idx, ring);
              return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
            })
            .join(" ");
          return (
            <polygon
              key={ring}
              points={ringPoints}
              fill="none"
              stroke="#1e293b"
              strokeWidth={ring === 10 ? 1.5 : 1}
              strokeDasharray={ring === 10 ? undefined : "3 3"}
            />
          );
        })}

        {axes.map((axis: RadarAxis, idx: number) => {
          const axisId = getAxisId(axis);
          const outer = getPoint(idx, 10);
          const labelPt = getPoint(idx, 11.7);
          const isHovered = hoveredAxis === axisId;
          const weightVal =
            weights[axisId] ??
            (axis.key ? weights[axis.key] : undefined) ??
            axis.weight ??
            axis.defaultWeight ??
            1;

          return (
            <g
              key={axisId}
              onMouseEnter={() => setHoveredAxis(axisId)}
              onMouseLeave={() => setHoveredAxis(null)}
            >
              <line
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                stroke={isHovered ? "#38bdf8" : "#334155"}
                strokeWidth={isHovered ? 1.75 : 1}
              />
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className={`text-[11px] font-medium ${
                  isHovered ? "fill-cyan-300" : "fill-slate-300"
                }`}
              >
                {axis.shortLabel ?? axis.label}
              </text>
              <text
                x={labelPt.x}
                y={labelPt.y + 13}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-500 font-mono text-[9px]"
              >
                {weightVal.toFixed(2)}x
              </text>
            </g>
          );
        })}

        {comparisonScores && (
          <polygon
            points={buildPolygonPoints(comparisonScores)}
            fill="rgba(251, 191, 36, 0.16)"
            stroke="#fbbf24"
            strokeWidth={2}
          />
        )}

        {primaryScores && (
          <polygon
            points={buildPolygonPoints(primaryScores)}
            fill="rgba(34, 211, 238, 0.22)"
            stroke="#22d3ee"
            strokeWidth={2.5}
          />
        )}

        {primaryScores &&
          axes.map((axis: RadarAxis, idx: number) => {
            const axisId = getAxisId(axis);
            const val =
              primaryScores[axisId] ??
              (axis.key ? primaryScores[axis.key] : undefined) ??
              0;
            const pt = getPoint(idx, val);
            return (
              <g key={`handle-${axisId}`}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={onScoreChange ? 6 : 4}
                  fill="#0891b2"
                  stroke="#ecfeff"
                  strokeWidth={2}
                  className={
                    onScoreChange
                      ? "cursor-grab active:cursor-grabbing"
                      : undefined
                  }
                  onPointerDown={(e) => {
                    if (!onScoreChange) return;
                    e.stopPropagation();
                    setDraggingAxis(axisId);
                  }}
                />
              </g>
            );
          })}
      </svg>

      {onScoreChange && (
        <p className="mt-2 text-center text-[11px] text-slate-400">
          Drag any cyan vertex along its spoke to run a live what-if trade-space
          calibration.
        </p>
      )}
    </div>
  );
}