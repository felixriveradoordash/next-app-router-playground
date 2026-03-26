export type NumericUnit =
  | '$'
  | '%'
  | 'count'
  | 'hrs'
  | 'hours'
  | 'sec'
  | 'weeks'
  | 'users'
  | 'months'
  | 'runs'
  | 'x';

export type InitiativeId =
  | 'sdk-install'
  | 'new-events'
  | 'attribution-model'
  | 'skan-tuning'
  | 'capi-server-side'
  | 'workflow-automation'
  | 'self-service-tool'
  | 'tool-value'
  | 'build-vs-buy'
  | 'warehouse-efficiency'
  | 'risk-reduction'
  | 'time-to-value';

export type SectionId =
  | 'overview'
  | 'calculator'
  | 'scenarios'
  | 'simulation'
  | 'sensitivity'
  | 'assumptions'
  | 'export';

export interface ScenarioSettings {
  lowMultiplier: number;
  baseMultiplier: number;
  highMultiplier: number;
  lowWeight: number;
  baseWeight: number;
  highWeight: number;
}

export interface SimulationSettings {
  iterations: number;
  volatility: number;
  seed: number;
}

export interface SensitivitySettings {
  volume: number;
  lift: number;
  valuePerUnit: number;
  confidence: number;
}

export interface NumericInputDefinition {
  key: string;
  label: string;
  unit: NumericUnit;
  description: string;
}

export interface InitiativeDefinition {
  id: InitiativeId;
  label: string;
  shortLabel: string;
  summaryLabel: string;
  description: string;
  valueLever: string;
  primaryDriver: string;
  implementationCostKey: string;
  confidenceKey: string;
  inputs: NumericInputDefinition[];
  referenceFormulaLabel: string;
}

export interface InitiativeState {
  confidence: number;
  values: Record<string, number>;
}

export interface PortfolioState {
  initiatives: Record<InitiativeId, InitiativeState>;
  scenario: ScenarioSettings;
  simulation: SimulationSettings;
  sensitivity: SensitivitySettings;
}

export interface FormulaStep {
  label: string;
  formula: string;
  detail: string;
  value: number;
}

export interface InitiativeResult {
  id: InitiativeId;
  label: string;
  shortLabel: string;
  summaryLabel: string;
  description: string;
  valueLever: string;
  primaryDriver: string;
  implementationCost: number;
  confidence: number;
  referenceMonthlyImpact: number;
  lowMonthlyImpact: number;
  baseMonthlyImpact: number;
  highMonthlyImpact: number;
  weightedMonthlyImpact: number;
  confidenceAdjustedMonthlyImpact: number;
  annualImpact: number;
  paybackPeriodMonths: number;
  formulaSteps: FormulaStep[];
}

export interface PortfolioSummary {
  monthlyImpact: number;
  annualImpact: number;
  implementationCost: number;
  paybackPeriodMonths: number;
}

export interface WaterfallDatum {
  label: string;
  base: number;
  change: number;
  cumulative: number;
}

export interface ScenarioDatum {
  label: string;
  low: number;
  base: number;
  high: number;
  weighted: number;
}

export interface SimulationRun {
  run: number;
  zScore: number;
  impact: number;
}

export interface SimulationStats {
  mean: number;
  standardDeviation: number;
  p10: number;
  p50: number;
  p90: number;
}

export interface HistogramDatum {
  bucket: string;
  start: number;
  end: number;
  count: number;
}

export interface SensitivityDatum {
  driver: string;
  base: number;
  low: number;
  high: number;
  range: number;
}

export interface PortfolioComputation {
  moduleResults: InitiativeResult[];
  summary: PortfolioSummary;
  waterfall: WaterfallDatum[];
  scenarioComparison: ScenarioDatum[];
  simulationRuns: SimulationRun[];
  simulationStats: SimulationStats;
  histogram: HistogramDatum[];
  sensitivity: SensitivityDatum[];
}
