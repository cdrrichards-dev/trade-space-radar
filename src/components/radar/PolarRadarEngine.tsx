"use client";

import React, { useMemo, useRef, useState } from "react";
import { DomainPack, RadarAxis } from "@/types/domain-pack";

export interface RadarFacility {
  id: string;
  cms_provider_id: string;
  name: string;
  city: string;
  state: string;
  nci_or_coe_badge?: string | null;
  normalized_scores: Record<string, number>;
}

interface PolarRadarEngineProps {
  domainPack: DomainPack;
  primaryFacility: RadarFacility | null;
  comparisonFacility?: RadarFacility | null;
  weights?: Record<string, number>;
  calibratedScores?: Record<string, number> | null;
  onCalibrateScore?: (axisKey: string, newValue: number) => void;
  size?: number;
}

export default function PolarRadarEngine({
  domainPack,
  primaryFacility,
  comparisonFacility = null,
  weights = {},
  calibratedScores = null,
  onCalibrateScore,
  size = 440,
}: PolarRadarEngineProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingAxis, setDraggingAxis] = useState<string | null>(null);
  const [hoveredAxis, setHoveredAxis] = useState<string | null>(null);

  const axes = domainPack.axes;
  const numAxes = axes.length;
  const center = size / 2;
  const maxRadius = size * 0.34;
  const rings = [2, 4, 6, 8, 10];

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
      .map((axis, idx) => {
        const val = scores[axis.key] ?? 0;
        const pt = getPoint(idx, val);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      })
      .join(" ");

  const activePrimaryScores = useMemo(() => {
    if (!primaryFacility) return null;
    return {
      ...primaryFacility.normalized_scores,
      ...(calibratedScores ?? {}),
    };
  }, [primaryFacility, calibratedScores]);

  const computeWeightedScore = (scores: Record<string, number> | null) => {
    if (!scores) return 0;
    let weightedSum = 0;
    let totalWeight = 0;
    for (const axis of axes) {
      const w = weights[axis.key] ?? axis.defaultWeight ?? 1;
      const val = scores[axis.key] ?? 0;
      weightedSum += val * w;
      totalWeight += w;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  const primaryComposite = useMemo(
    () => computeWeightedScore(activePrimaryScores),
    [activePrimaryScores, axes, weights]
  );

  const comparisonComposite = useMemo(
    () =>
      comparisonFacility
        ? computeWeightedScore(comparisonFacility.normalized_scores)
        : 0,
    [comparisonFacility, axes, weights]
  );

  const handlePointerMove = (e