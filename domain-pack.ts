export type RadarMode = "constraint" | "overlay";

export interface RadarAxis {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  weight: number; // Relative priority weight (e.g., 0.5 to 2.0)
  invertBetter?: boolean; // True if lower raw input means higher advantage
}

export interface RadarEntity {
  id: string;
  name: string;
  subtitle?: string;
  badge?: string;
  color: string; // Hex color (e.g., "#06b6d4" or "#f59e0b")
  scores: Record<string, number>; // Maps axis.id -> normalized 1.0 to 10.0 score
}

export interface CouplingRule {
  id: string;
  axisIds: string[];
  threshold: number;
  operator: "gte" | "lte";
  severity: "info" | "warning" | "critical";
  title: string;
  recommendation: string;
}

export interface DomainPack {
  domainId: string;
  domainName: string;
  tagline: string;
  mode: RadarMode;
  scaleMin: number;
  scaleMax: number;
  axes: RadarAxis[];
  primaryEntity: RadarEntity;
  comparisonEntity?: RadarEntity;
  targetThreshold?: Record<string, number>; // Dashed equilibrium or acuity ring
  couplingRules: CouplingRule[];
}