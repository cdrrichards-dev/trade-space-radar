export interface RadarAxis {
  key: string;
  id?: string;
  label: string;
  shortLabel: string;
  description: string;
  defaultWeight?: number;
  min: number;
  max: number;
}

export interface CouplingRule {
  id: string;
  sourceAxis: string;
  targetAxis: string;
  relationship: "inverse" | "positive";
  note: string;
}

export interface DomainPack {
  id: string;
  name: string;
  subtitle?: string;
  defaultOriginLabel?: string;
  axes: RadarAxis[];
  couplingRules?: CouplingRule[];
}