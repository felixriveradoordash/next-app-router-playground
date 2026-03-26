import { z } from 'zod';

import {
  INITIATIVE_DEFINITIONS,
  INITIATIVE_ORDER,
  INITIAL_PORTFOLIO_STATE,
} from '#/lib/value-calculator/model';
import type {
  FormulaStep,
  HistogramDatum,
  InitiativeId,
  InitiativeResult,
  InitiativeState,
  PortfolioComputation,
  PortfolioState,
  ScenarioSettings,
  SensitivityDatum,
  SimulationRun,
  SimulationStats,
} from '#/lib/value-calculator/types';

const scenarioSchema = z.object({
  lowMultiplier: z.number().finite().min(0),
  baseMultiplier: z.number().finite().min(0),
  highMultiplier: z.number().finite().min(0),
  lowWeight: z.number().finite().min(0),
  baseWeight: z.number().finite().min(0),
  highWeight: z.number().finite().min(0),
});

const simulationSchema = z.object({
  iterations: z.number().int().min(50).max(5000),
  volatility: z.number().finite().min(0).max(2),
  seed: z.number().int().min(1).max(999999),
});

const sensitivitySchema = z.object({
  volume: z.number().finite().min(0).max(1),
  lift: z.number().finite().min(0).max(1),
  valuePerUnit: z.number().finite().min(0).max(1),
  confidence: z.number().finite().min(0).max(1),
});

const initiativeStateSchema = z.object({
  confidence: z.number().finite().min(0).max(1),
  values: z.record(z.string(), z.number().finite()),
});

const portfolioSchema = z.object({
  initiatives: z.record(z.string(), initiativeStateSchema),
  scenario: scenarioSchema,
  simulation: simulationSchema,
  sensitivity: sensitivitySchema,
});

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clampToPositive(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizeScenario(scenario: ScenarioSettings): ScenarioSettings {
  const safe = scenarioSchema.parse(scenario);
  const totalWeight = safe.lowWeight + safe.baseWeight + safe.highWeight;

  if (totalWeight === 0) {
    return { ...safe, lowWeight: 0.2, baseWeight: 0.5, highWeight: 0.3 };
  }

  return {
    ...safe,
    lowWeight: safe.lowWeight / totalWeight,
    baseWeight: safe.baseWeight / totalWeight,
    highWeight: safe.highWeight / totalWeight,
  };
}

function formatSubstitution(values: Array<number | string>) {
  return values
    .map((value) =>
      typeof value === 'number' ? value.toLocaleString() : value,
    )
    .join(' · ');
}

function percentile(sortedValues: number[], target: number) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const position = (sortedValues.length - 1) * target;
  const base = Math.floor(position);
  const rest = position - base;
  const start = sortedValues[base] ?? sortedValues[0];
  const end = sortedValues[base + 1] ?? start;
  return start + rest * (end - start);
}

function standardDeviation(values: number[]) {
  if (!values.length) {
    return 0;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function createSeededRandom(seed: number) {
  let current = seed >>> 0;
  return () => {
    current += 0x6d2b79f5;
    let t = current;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleStandardNormal(random: () => number) {
  let u = 0;
  let v = 0;

  while (u === 0) {
    u = random();
  }

  while (v === 0) {
    v = random();
  }

  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function buildHistogram(values: number[], bucketCount = 16): HistogramDatum[] {
  if (!values.length) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    return [
      {
        bucket: `${round(min, 0).toLocaleString()} - ${round(max, 0).toLocaleString()}`,
        start: min,
        end: max,
        count: values.length,
      },
    ];
  }

  const width = (max - min) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    bucket: '',
    start: min + width * index,
    end: index === bucketCount - 1 ? max : min + width * (index + 1),
    count: 0,
  }));

  for (const value of values) {
    const rawIndex = Math.floor((value - min) / width);
    const index = Math.min(bucketCount - 1, Math.max(0, rawIndex));
    buckets[index].count += 1;
  }

  return buckets.map((bucket) => ({
    ...bucket,
    bucket: `${round(bucket.start, 0).toLocaleString()} - ${round(
      bucket.end,
      0,
    ).toLocaleString()}`,
  }));
}

function computeReferenceImpact(
  id: InitiativeId,
  state: InitiativeState,
): FormulaStep {
  const values = state.values;

  switch (id) {
    case 'sdk-install': {
      const value =
        values.monthlyConversions *
        (values.newCoverage - values.oldCoverage) *
        values.averageOrderValue;

      return {
        label: 'Reference model impact',
        formula:
          'monthlyConversions * (newCoverage - oldCoverage) * averageOrderValue',
        detail: `${formatSubstitution([
          values.monthlyConversions,
          `(${values.newCoverage} - ${values.oldCoverage})`,
          values.averageOrderValue,
        ])} = ${round(value).toLocaleString()}`,
        value,
      };
    }
    case 'new-events': {
      const value =
        values.monthlyTraffic *
        (values.newConversionRate - values.oldConversionRate) *
        values.averageOrderValue;

      return {
        label: 'Reference model impact',
        formula:
          'monthlyTraffic * (newConversionRate - oldConversionRate) * averageOrderValue',
        detail: `${formatSubstitution([
          values.monthlyTraffic,
          `(${values.newConversionRate} - ${values.oldConversionRate})`,
          values.averageOrderValue,
        ])} = ${round(value).toLocaleString()}`,
        value,
      };
    }
    case 'attribution-model': {
      const value =
        values.monthlyMediaSpend *
        values.shareReallocated *
        values.performanceDelta *
        values.baselineRoas;

      return {
        label: 'Reference model impact',
        formula:
          'monthlyMediaSpend * shareReallocated * performanceDelta * baselineRoas',
        detail: `${formatSubstitution([
          values.monthlyMediaSpend,
          values.shareReallocated,
          values.performanceDelta,
          values.baselineRoas,
        ])} = ${round(value).toLocaleString()}`,
        value,
      };
    }
    case 'skan-tuning': {
      const value =
        values.monthlyIosSpend * values.baselineIosRoas * values.efficiencyGain;

      return {
        label: 'Reference model impact',
        formula: 'monthlyIosSpend * baselineIosRoas * efficiencyGain',
        detail: `${formatSubstitution([
          values.monthlyIosSpend,
          values.baselineIosRoas,
          values.efficiencyGain,
        ])} = ${round(value).toLocaleString()}`,
        value,
      };
    }
    case 'capi-server-side': {
      const value =
        values.monthlyConversions *
        values.estimatedSignalLoss *
        values.recoveryRate *
        values.averageOrderValue;

      return {
        label: 'Reference model impact',
        formula:
          'monthlyConversions * estimatedSignalLoss * recoveryRate * averageOrderValue',
        detail: `${formatSubstitution([
          values.monthlyConversions,
          values.estimatedSignalLoss,
          values.recoveryRate,
          values.averageOrderValue,
        ])} = ${round(value).toLocaleString()}`,
        value,
      };
    }
    case 'workflow-automation': {
      const value =
        (values.hoursSaved + values.errorHoursAvoided) *
          values.hourlyLaborRate +
        values.processesInfluenced *
          values.valueInfluencedPerProcess *
          values.performanceLift;

      return {
        label: 'Reference model impact',
        formula:
          '((hoursSaved + errorHoursAvoided) * hourlyLaborRate) + (processesInfluenced * valueInfluencedPerProcess * performanceLift)',
        detail: `(${values.hoursSaved} + ${values.errorHoursAvoided}) * ${values.hourlyLaborRate} + ${values.processesInfluenced} * ${values.valueInfluencedPerProcess} * ${values.performanceLift} = ${round(
          value,
        ).toLocaleString()}`,
        value,
      };
    }
    case 'self-service-tool': {
      const value =
        values.requestsEliminated *
          values.hoursPerRequest *
          values.analystHourlyRate +
        values.monthlyValueInfluenced * values.decisionLift;

      return {
        label: 'Reference model impact',
        formula:
          '(requestsEliminated * hoursPerRequest * analystHourlyRate) + (monthlyValueInfluenced * decisionLift)',
        detail: `${values.requestsEliminated} * ${values.hoursPerRequest} * ${values.analystHourlyRate} + ${values.monthlyValueInfluenced} * ${values.decisionLift} = ${round(
          value,
        ).toLocaleString()}`,
        value,
      };
    }
    case 'tool-value': {
      const value =
        values.monthlyActiveUsers *
          values.hoursSavedPerUser *
          values.hourlyRate +
        values.decisionsInfluenced * values.valuePerDecision;

      return {
        label: 'Reference model impact',
        formula:
          '(monthlyActiveUsers * hoursSavedPerUser * hourlyRate) + (decisionsInfluenced * valuePerDecision)',
        detail: `${values.monthlyActiveUsers} * ${values.hoursSavedPerUser} * ${values.hourlyRate} + ${values.decisionsInfluenced} * ${values.valuePerDecision} = ${round(
          value,
        ).toLocaleString()}`,
        value,
      };
    }
    case 'build-vs-buy': {
      const value =
        values.annualVendorCost -
        values.annualInternalBuildCost -
        values.annualMaintenanceCost +
        values.annualCustomizationValue +
        values.annualRevenueInfluenced * 0.05;

      return {
        label: 'Reference model impact',
        formula:
          'annualVendorCost - annualInternalBuildCost - annualMaintenanceCost + annualCustomizationValue + (annualRevenueInfluenced * 0.05)',
        detail: `${values.annualVendorCost} - ${values.annualInternalBuildCost} - ${values.annualMaintenanceCost} + ${values.annualCustomizationValue} + (${values.annualRevenueInfluenced} * 0.05) = ${round(
          value,
        ).toLocaleString()}`,
        value,
      };
    }
    case 'warehouse-efficiency': {
      const value =
        ((values.monthlyQueries * values.secondsSavedPerQuery) / 3600) *
          values.hourlyRate +
        (values.usersImpacted / 10) * values.monthlySpendInfluenced * 0.01;

      return {
        label: 'Reference model impact',
        formula:
          '((monthlyQueries * secondsSavedPerQuery) / 3600 * hourlyRate) + ((usersImpacted / 10) * monthlySpendInfluenced * 0.01)',
        detail: `((${values.monthlyQueries} * ${values.secondsSavedPerQuery}) / 3600 * ${values.hourlyRate}) + ((${values.usersImpacted} / 10) * ${values.monthlySpendInfluenced} * 0.01) = ${round(
          value,
        ).toLocaleString()}`,
        value,
      };
    }
    case 'risk-reduction': {
      const value =
        values.annualFailureProbability *
          values.costPerFailureEvent *
          values.mitigationRate +
        values.otherAvoidedLoss;

      return {
        label: 'Reference model impact',
        formula:
          '(annualFailureProbability * costPerFailureEvent * mitigationRate) + otherAvoidedLoss',
        detail: `${values.annualFailureProbability} * ${values.costPerFailureEvent} * ${values.mitigationRate} + ${values.otherAvoidedLoss} = ${round(
          value,
        ).toLocaleString()}`,
        value,
      };
    }
    case 'time-to-value': {
      // The workbook references inconsistent cells here; the app uses the label-aligned formula.
      const value =
        (values.weeksPulledForward / 52) *
          values.valuePerLaunch *
          values.launchesPerYear +
        values.annualSpendInfluenced * values.accelerationLift;

      return {
        label: 'Reference model impact',
        formula:
          '((weeksPulledForward / 52) * valuePerLaunch * launchesPerYear) + (annualSpendInfluenced * accelerationLift)',
        detail: `((${values.weeksPulledForward} / 52) * ${values.valuePerLaunch} * ${values.launchesPerYear}) + (${values.annualSpendInfluenced} * ${values.accelerationLift}) = ${round(
          value,
        ).toLocaleString()}`,
        value,
      };
    }
  }
}

function computeInitiativeResult(
  id: InitiativeId,
  state: InitiativeState,
  scenario: ScenarioSettings,
): InitiativeResult {
  const definition = INITIATIVE_DEFINITIONS[id];
  const confidence = clampToPositive(state.confidence);
  const referenceStep = computeReferenceImpact(id, state);
  const referenceMonthlyImpact = clampToPositive(referenceStep.value);
  const lowMonthlyImpact = referenceMonthlyImpact * scenario.lowMultiplier;
  const baseMonthlyImpact = referenceMonthlyImpact * scenario.baseMultiplier;
  const highMonthlyImpact = referenceMonthlyImpact * scenario.highMultiplier;
  const weightedMonthlyImpact =
    lowMonthlyImpact * scenario.lowWeight +
    baseMonthlyImpact * scenario.baseWeight +
    highMonthlyImpact * scenario.highWeight;
  const confidenceAdjustedMonthlyImpact = weightedMonthlyImpact * confidence;
  const implementationCost =
    state.values[
      definition.implementationCostKey as keyof typeof state.values
    ] ?? 0;
  const paybackPeriodMonths =
    confidenceAdjustedMonthlyImpact > 0
      ? implementationCost / confidenceAdjustedMonthlyImpact
      : Infinity;

  const formulaSteps: FormulaStep[] = [
    referenceStep,
    {
      label: 'Low case impact',
      formula: 'referenceMonthlyImpact * lowMultiplier',
      detail: `${round(referenceMonthlyImpact).toLocaleString()} * ${
        scenario.lowMultiplier
      } = ${round(lowMonthlyImpact).toLocaleString()}`,
      value: lowMonthlyImpact,
    },
    {
      label: 'Base case impact',
      formula: 'referenceMonthlyImpact * baseMultiplier',
      detail: `${round(referenceMonthlyImpact).toLocaleString()} * ${
        scenario.baseMultiplier
      } = ${round(baseMonthlyImpact).toLocaleString()}`,
      value: baseMonthlyImpact,
    },
    {
      label: 'High case impact',
      formula: 'referenceMonthlyImpact * highMultiplier',
      detail: `${round(referenceMonthlyImpact).toLocaleString()} * ${
        scenario.highMultiplier
      } = ${round(highMonthlyImpact).toLocaleString()}`,
      value: highMonthlyImpact,
    },
    {
      label: 'Scenario-weighted impact',
      formula:
        '(lowMonthlyImpact * lowWeight) + (baseMonthlyImpact * baseWeight) + (highMonthlyImpact * highWeight)',
      detail: `${round(lowMonthlyImpact).toLocaleString()} * ${round(
        scenario.lowWeight,
        3,
      )} + ${round(baseMonthlyImpact).toLocaleString()} * ${round(
        scenario.baseWeight,
        3,
      )} + ${round(highMonthlyImpact).toLocaleString()} * ${round(
        scenario.highWeight,
        3,
      )} = ${round(weightedMonthlyImpact).toLocaleString()}`,
      value: weightedMonthlyImpact,
    },
    {
      label: 'Confidence-adjusted impact',
      formula: 'weightedMonthlyImpact * confidence',
      detail: `${round(weightedMonthlyImpact).toLocaleString()} * ${confidence} = ${round(
        confidenceAdjustedMonthlyImpact,
      ).toLocaleString()}`,
      value: confidenceAdjustedMonthlyImpact,
    },
    {
      label: 'Payback period',
      formula: 'implementationCost / confidenceAdjustedMonthlyImpact',
      detail:
        confidenceAdjustedMonthlyImpact > 0
          ? `${round(implementationCost).toLocaleString()} / ${round(
              confidenceAdjustedMonthlyImpact,
            ).toLocaleString()} = ${round(paybackPeriodMonths, 2)} months`
          : 'No payback because confidence-adjusted impact is 0.',
      value: paybackPeriodMonths,
    },
  ];

  return {
    id,
    label: definition.label,
    shortLabel: definition.shortLabel,
    summaryLabel: definition.summaryLabel,
    description: definition.description,
    valueLever: definition.valueLever,
    primaryDriver: definition.primaryDriver,
    implementationCost,
    confidence,
    referenceMonthlyImpact,
    lowMonthlyImpact,
    baseMonthlyImpact,
    highMonthlyImpact,
    weightedMonthlyImpact,
    confidenceAdjustedMonthlyImpact,
    annualImpact: confidenceAdjustedMonthlyImpact * 12,
    paybackPeriodMonths,
    formulaSteps,
  };
}

function computeSimulation(
  monthlyImpact: number,
  volatility: number,
  iterations: number,
  seed: number,
) {
  const random = createSeededRandom(seed);
  const runs: SimulationRun[] = [];

  for (let run = 1; run <= iterations; run += 1) {
    const zScore = sampleStandardNormal(random);
    const impact = clampToPositive(monthlyImpact * (1 + volatility * zScore));
    runs.push({ run, zScore, impact });
  }

  const impacts = runs.map((item) => item.impact);
  const sorted = [...impacts].sort((left, right) => left - right);

  const stats: SimulationStats = {
    mean: impacts.reduce((sum, value) => sum + value, 0) / impacts.length,
    standardDeviation: standardDeviation(impacts),
    p10: percentile(sorted, 0.1),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
  };

  return { runs, stats, histogram: buildHistogram(impacts) };
}

function computeSensitivity(
  monthlyImpact: number,
  state: PortfolioState,
): SensitivityDatum[] {
  const safe = sensitivitySchema.parse(state.sensitivity);
  return [
    {
      driver: 'Volume',
      base: monthlyImpact,
      low: monthlyImpact * (1 - safe.volume),
      high: monthlyImpact * (1 + safe.volume),
      range: monthlyImpact * safe.volume * 2,
    },
    {
      driver: 'Lift',
      base: monthlyImpact,
      low: monthlyImpact * (1 - safe.lift),
      high: monthlyImpact * (1 + safe.lift),
      range: monthlyImpact * safe.lift * 2,
    },
    {
      driver: 'Value per unit',
      base: monthlyImpact,
      low: monthlyImpact * (1 - safe.valuePerUnit),
      high: monthlyImpact * (1 + safe.valuePerUnit),
      range: monthlyImpact * safe.valuePerUnit * 2,
    },
    {
      driver: 'Confidence',
      base: monthlyImpact,
      low: monthlyImpact * (1 - safe.confidence),
      high: monthlyImpact * (1 + safe.confidence),
      range: monthlyImpact * safe.confidence * 2,
    },
  ].sort((left, right) => right.range - left.range);
}

export function computePortfolio(
  rawState: PortfolioState,
): PortfolioComputation {
  const parsed = portfolioSchema.parse(rawState);
  const scenario = normalizeScenario(parsed.scenario);
  const moduleResults = INITIATIVE_ORDER.map((id) =>
    computeInitiativeResult(
      id,
      parsed.initiatives[id] ?? INITIAL_PORTFOLIO_STATE.initiatives[id],
      scenario,
    ),
  );

  const monthlyImpact = moduleResults.reduce(
    (sum, result) => sum + result.confidenceAdjustedMonthlyImpact,
    0,
  );
  const implementationCost = moduleResults.reduce(
    (sum, result) => sum + result.implementationCost,
    0,
  );
  const annualImpact = monthlyImpact * 12;
  const paybackPeriodMonths =
    monthlyImpact > 0 ? implementationCost / monthlyImpact : Infinity;

  let cumulative = 0;
  const waterfall = [
    { label: 'Baseline', base: 0, change: 0, cumulative: 0 },
    ...moduleResults.map((result) => {
      const datum = {
        label: result.shortLabel,
        base: cumulative,
        change: result.confidenceAdjustedMonthlyImpact,
        cumulative: cumulative + result.confidenceAdjustedMonthlyImpact,
      };
      cumulative = datum.cumulative;
      return datum;
    }),
  ];

  const scenarioComparison = moduleResults.map((result) => ({
    label: result.shortLabel,
    low: result.lowMonthlyImpact,
    base: result.baseMonthlyImpact,
    high: result.highMonthlyImpact,
    weighted: result.confidenceAdjustedMonthlyImpact,
  }));

  const simulation = computeSimulation(
    monthlyImpact,
    parsed.simulation.volatility,
    parsed.simulation.iterations,
    parsed.simulation.seed,
  );

  return {
    moduleResults,
    summary: {
      monthlyImpact,
      annualImpact,
      implementationCost,
      paybackPeriodMonths,
    },
    waterfall,
    scenarioComparison,
    simulationRuns: simulation.runs,
    simulationStats: simulation.stats,
    histogram: simulation.histogram,
    sensitivity: computeSensitivity(monthlyImpact, parsed),
  };
}
