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
  threshold?: number;
  relationship?: "inverse" | "positive" | string;
  label?: string;
  description?: string;
  note?: string;
}

export interface DomainPack {
  id?: string;
  domainId?: string;
  name?: string;
  domainName?: string;
  subtitle?: string;
  tagline?: string;
  mode?: string;
  scaleMin?: number;
  scaleMax?: number;
  defaultOriginLabel?: string;
  axes: RadarAxis[];
  couplingRules?: CouplingRule[];
}