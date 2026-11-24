export interface RadarAxis {
  key?: string;
  id?: string;
  label: string;
  shortLabel?: string;
  description?: string;
  weight?: number;
  defaultWeight?: number;
  min?: number;
  max?: number;
}

export interface CouplingRule {
  id: string;
  axisIds?: string[];
  sourceAxis?: string;
  targetAxis?: string;
  relationship?: "inverse" | "positive" | string;
  label?: string;
  description?: string;
  note?: string;
}

export interface DomainPack {
  id: string;
  name: string;
  subtitle?: string;
  defaultOriginLabel?: string;
  axes: RadarAxis[];
  couplingRules?: CouplingRule[];
}