import type {
  InitiativeDefinition,
  InitiativeId,
  PortfolioState,
  ScenarioSettings,
  SectionId,
  SensitivitySettings,
  SimulationSettings,
} from '#/lib/value-calculator/types';

export const NAV_SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'simulation', label: 'Simulation' },
  { id: 'sensitivity', label: 'Sensitivity' },
  { id: 'assumptions', label: 'Assumptions' },
  { id: 'export', label: 'Export' },
];

export const DEFAULT_SCENARIO: ScenarioSettings = {
  lowMultiplier: 0.8,
  baseMultiplier: 1,
  highMultiplier: 1.2,
  lowWeight: 0.2,
  baseWeight: 0.5,
  highWeight: 0.3,
};

export const DEFAULT_SIMULATION: SimulationSettings = {
  iterations: 300,
  volatility: 0.25,
  seed: 42,
};

export const DEFAULT_SENSITIVITY: SensitivitySettings = {
  volume: 0.1,
  lift: 0.2,
  valuePerUnit: 0.08,
  confidence: 0.05,
};

export const WORKBOOK_NOTES = [
  'The spreadsheet uses the same low/base/high scenario controls on every calculator tab, so the app centralizes those settings instead of duplicating them 12 times.',
  'Build-vs-buy keeps the workbook math as entered, even though several input labels are annualized; this preserves output compatibility with the Excel model.',
  'Time-to-value appears to have a broken cell reference in the workbook. The app uses the label-aligned formula: pulled-forward launch value plus acceleration lift on influenced value.',
  'Monte Carlo in Excel uses fixed z-score samples. The app replaces that with a seeded normal simulation so runs are reproducible while still behaving like a proper probabilistic model.',
];

export const INITIATIVE_ORDER: InitiativeId[] = [
  'sdk-install',
  'new-events',
  'attribution-model',
  'skan-tuning',
  'capi-server-side',
  'workflow-automation',
  'self-service-tool',
  'tool-value',
  'build-vs-buy',
  'warehouse-efficiency',
  'risk-reduction',
  'time-to-value',
];

export const INITIATIVE_DEFINITIONS: Record<
  InitiativeId,
  InitiativeDefinition
> = {
  'sdk-install': {
    id: 'sdk-install',
    label: 'SDK Installation',
    shortLabel: 'SDK',
    summaryLabel: 'SDK install',
    description:
      'Use when an SDK or measurement library expands user and event coverage and improves optimization.',
    valueLever: 'Measurement coverage',
    primaryDriver: 'Coverage delta x AOV x optimization',
    implementationCostKey: 'implementationCost',
    confidenceKey: 'confidence',
    referenceFormulaLabel:
      'monthly conversions x (new coverage - old coverage) x average order value',
    inputs: [
      {
        key: 'monthlyConversions',
        label: 'Total monthly conversions',
        unit: 'count',
        description: 'All conversions in scope.',
      },
      {
        key: 'oldCoverage',
        label: 'Old measurement coverage',
        unit: '%',
        description: 'Share measurable before SDK work.',
      },
      {
        key: 'newCoverage',
        label: 'New measurement coverage',
        unit: '%',
        description: 'Share measurable after SDK work.',
      },
      {
        key: 'averageOrderValue',
        label: 'Average order value',
        unit: '$',
        description: 'Revenue per conversion.',
      },
      {
        key: 'optimizationMultiplier',
        label: 'Optimization multiplier',
        unit: '%',
        description:
          'Reserved for future weighting; the workbook example leaves it out of the formula.',
      },
      {
        key: 'implementationCost',
        label: 'Implementation cost',
        unit: '$',
        description: 'Engineering, QA, and vendor cost.',
      },
    ],
  },
  'new-events': {
    id: 'new-events',
    label: 'New Event / Signal',
    shortLabel: 'Events',
    summaryLabel: 'New events',
    description:
      'Use when new events improve bidding, audiences, or funnel visibility.',
    valueLever: 'Optimization lift',
    primaryDriver: 'Traffic x CVR lift x AOV',
    implementationCostKey: 'implementationCost',
    confidenceKey: 'confidence',
    referenceFormulaLabel:
      'monthly traffic x (new conversion rate - old conversion rate) x average order value',
    inputs: [
      {
        key: 'monthlyTraffic',
        label: 'Monthly traffic / eligible users',
        unit: 'count',
        description: 'Sessions, users, or clicks exposed to optimization.',
      },
      {
        key: 'oldConversionRate',
        label: 'Old conversion rate',
        unit: '%',
        description: 'Baseline conversion rate.',
      },
      {
        key: 'newConversionRate',
        label: 'New conversion rate',
        unit: '%',
        description: 'Observed or expected CVR after event improvement.',
      },
      {
        key: 'averageOrderValue',
        label: 'Average order value',
        unit: '$',
        description: 'Revenue per conversion.',
      },
      {
        key: 'implementationCost',
        label: 'Implementation cost',
        unit: '$',
        description: 'Tagging, QA, and ETL cost.',
      },
    ],
  },
  'attribution-model': {
    id: 'attribution-model',
    label: 'Attribution Model Change',
    shortLabel: 'Attribution',
    summaryLabel: 'Attribution model',
    description:
      'Use when changing attribution logic and shifting budget to stronger channels.',
    valueLever: 'Budget efficiency',
    primaryDriver: 'Spend shifted x performance delta',
    implementationCostKey: 'implementationCost',
    confidenceKey: 'confidence',
    referenceFormulaLabel:
      'monthly media spend x share reallocated x performance delta x baseline ROAS',
    inputs: [
      {
        key: 'monthlyMediaSpend',
        label: 'Monthly media spend',
        unit: '$',
        description: 'Spend in scope.',
      },
      {
        key: 'shareReallocated',
        label: 'Share of spend reallocated',
        unit: '%',
        description: 'How much spend moves because of the model.',
      },
      {
        key: 'performanceDelta',
        label: 'Performance delta on moved spend',
        unit: '%',
        description: 'Expected improvement on moved spend.',
      },
      {
        key: 'baselineRoas',
        label: 'Baseline ROAS on moved spend',
        unit: 'x',
        description: 'Revenue-to-spend baseline.',
      },
      {
        key: 'implementationCost',
        label: 'Implementation cost',
        unit: '$',
        description: 'Analytics and data science cost.',
      },
    ],
  },
  'skan-tuning': {
    id: 'skan-tuning',
    label: 'SKAN / iOS Privacy Signal',
    shortLabel: 'SKAN',
    summaryLabel: 'SKAN tuning',
    description:
      'Use when conversion values or postback mapping improve iOS optimization.',
    valueLever: 'Signal quality',
    primaryDriver: 'iOS spend x ROAS x efficiency gain',
    implementationCostKey: 'implementationCost',
    confidenceKey: 'confidence',
    referenceFormulaLabel:
      'monthly iOS media spend x baseline iOS ROAS x efficiency gain',
    inputs: [
      {
        key: 'monthlyIosSpend',
        label: 'Monthly iOS media spend',
        unit: '$',
        description: 'Spend controlled by SKAN signal quality.',
      },
      {
        key: 'baselineIosRoas',
        label: 'Baseline iOS ROAS',
        unit: 'x',
        description: 'Revenue-to-spend baseline.',
      },
      {
        key: 'efficiencyGain',
        label: 'Efficiency gain from SKAN changes',
        unit: '%',
        description: 'Expected ROAS or efficiency improvement.',
      },
      {
        key: 'implementationCost',
        label: 'Implementation cost',
        unit: '$',
        description: 'Analytics and engineering cost.',
      },
    ],
  },
  'capi-server-side': {
    id: 'capi-server-side',
    label: 'CAPI / Server-Side Signal Recovery',
    shortLabel: 'CAPI',
    summaryLabel: 'CAPI / server-side',
    description:
      'Use when server-side events recover signal and improve ad platform learning.',
    valueLever: 'Signal recovery',
    primaryDriver: 'Recovered conversions x AOV x lift',
    implementationCostKey: 'implementationCost',
    confidenceKey: 'confidence',
    referenceFormulaLabel:
      'monthly conversions x estimated signal loss x recovery rate x average order value',
    inputs: [
      {
        key: 'monthlyConversions',
        label: 'Monthly conversions',
        unit: 'count',
        description: 'Total monthly conversion volume in scope.',
      },
      {
        key: 'estimatedSignalLoss',
        label: 'Estimated signal loss',
        unit: '%',
        description:
          'Share of conversions lost to browser or cookie restrictions.',
      },
      {
        key: 'recoveryRate',
        label: 'Recovery rate after CAPI',
        unit: '%',
        description: 'Share of lost conversions recovered.',
      },
      {
        key: 'averageOrderValue',
        label: 'Average order value',
        unit: '$',
        description: 'Revenue per conversion.',
      },
      {
        key: 'optimizationMultiplier',
        label: 'Optimization multiplier',
        unit: '%',
        description:
          'Reserved for future weighting; the workbook example leaves it out of the formula.',
      },
      {
        key: 'implementationCost',
        label: 'Implementation cost',
        unit: '$',
        description: 'Engineering, vendor, and QA cost.',
      },
    ],
  },
  'workflow-automation': {
    id: 'workflow-automation',
    label: 'Workflow Automation',
    shortLabel: 'Automation',
    summaryLabel: 'Workflow automation',
    description:
      'Use when automating repetitive campaign, reporting, or QA workflows.',
    valueLever: 'Operational efficiency',
    primaryDriver: 'Hours saved + faster execution',
    implementationCostKey: 'implementationCost',
    confidenceKey: 'confidence',
    referenceFormulaLabel:
      '((hours saved + rework hours avoided) x hourly rate) + (processes influenced x value influenced x performance lift)',
    inputs: [
      {
        key: 'hoursSaved',
        label: 'Hours saved per month',
        unit: 'hrs',
        description: 'Direct labor avoided by automation.',
      },
      {
        key: 'hourlyLaborRate',
        label: 'Hourly labor rate',
        unit: '$',
        description: 'Fully loaded team rate.',
      },
      {
        key: 'errorHoursAvoided',
        label: 'Error / rework hours avoided',
        unit: 'hrs',
        description: 'Additional avoided effort from fewer mistakes.',
      },
      {
        key: 'processesInfluenced',
        label: 'Campaigns / processes influenced',
        unit: 'count',
        description: 'How many launches or workflows benefit.',
      },
      {
        key: 'valueInfluencedPerProcess',
        label: 'Avg value influenced per campaign / process',
        unit: '$',
        description: 'Value managed per process.',
      },
      {
        key: 'performanceLift',
        label: 'Performance lift from faster execution',
        unit: '%',
        description: 'Expected gain from faster delivery.',
      },
      {
        key: 'implementationCost',
        label: 'Implementation cost',
        unit: '$',
        description: 'One-time build cost.',
      },
    ],
  },
  'self-service-tool': {
    id: 'self-service-tool',
    label: 'Self-Service Tool',
    shortLabel: 'Self-service',
    summaryLabel: 'Self-service tool',
    description:
      'Use when dashboards or self-serve tools reduce request volume and speed decisions.',
    valueLever: 'Scale enablement',
    primaryDriver: 'Requests removed + faster decisions',
    implementationCostKey: 'implementationCost',
    confidenceKey: 'confidence',
    referenceFormulaLabel:
      '(requests eliminated x hours per request x analyst hourly rate) + (monthly value influenced x lift from faster decisions)',
    inputs: [
      {
        key: 'requestsEliminated',
        label: 'Requests eliminated per month',
        unit: 'count',
        description: 'Analyst or ops requests no longer needed.',
      },
      {
        key: 'hoursPerRequest',
        label: 'Hours per request',
        unit: 'hrs',
        description: 'Average time required per request today.',
      },
      {
        key: 'analystHourlyRate',
        label: 'Analyst hourly rate',
        unit: '$',
        description: 'Fully loaded labor rate.',
      },
      {
        key: 'monthlyValueInfluenced',
        label: 'Monthly media / revenue influenced',
        unit: '$',
        description: 'Budget or revenue affected by faster decisions.',
      },
      {
        key: 'decisionLift',
        label: 'Lift from faster decisions',
        unit: '%',
        description: 'Expected improvement from shorter decision cycles.',
      },
      {
        key: 'implementationCost',
        label: 'Implementation cost',
        unit: '$',
        description: 'Build, enablement, and support cost.',
      },
    ],
  },
  'tool-value': {
    id: 'tool-value',
    label: 'Tool Value',
    shortLabel: 'Tool value',
    summaryLabel: 'Tool value',
    description:
      'Measures the value of an internal tool, dashboard, audience builder, or workflow layer.',
    valueLever: 'Platform leverage',
    primaryDriver: 'Adoption x time saved x decision value',
    implementationCostKey: 'implementationCost',
    confidenceKey: 'confidence',
    referenceFormulaLabel:
      '(monthly active users x hours saved per user x hourly rate) + (decisions influenced x value per influenced decision)',
    inputs: [
      {
        key: 'monthlyActiveUsers',
        label: 'Monthly active users',
        unit: 'users',
        description: 'Users actively using the tool each month.',
      },
      {
        key: 'hoursSavedPerUser',
        label: 'Hours saved per user',
        unit: 'hrs',
        description: 'Average hours saved per user per month.',
      },
      {
        key: 'hourlyRate',
        label: 'Hourly rate',
        unit: '$',
        description: 'Fully loaded labor rate.',
      },
      {
        key: 'decisionsInfluenced',
        label: 'Decisions influenced per month',
        unit: 'count',
        description: 'Decisions or actions supported by the tool.',
      },
      {
        key: 'valuePerDecision',
        label: 'Value per influenced decision',
        unit: '$',
        description: 'Average value of each decision.',
      },
      {
        key: 'implementationCost',
        label: 'Implementation cost',
        unit: '$',
        description: 'Build and enablement cost.',
      },
    ],
  },
  'build-vs-buy': {
    id: 'build-vs-buy',
    label: 'Build vs Buy',
    shortLabel: 'Build vs buy',
    summaryLabel: 'Build vs buy',
    description:
      'Compares internal build cost to vendor spend and the value of custom performance uplift.',
    valueLever: 'Economic tradeoff',
    primaryDriver: 'Avoided vendor cost + added custom value',
    implementationCostKey: 'implementationCost',
    confidenceKey: 'confidence',
    referenceFormulaLabel:
      'annual vendor cost - annual internal build cost - annual maintenance cost + annual customization value + (annual revenue influenced x 5%)',
    inputs: [
      {
        key: 'annualVendorCost',
        label: 'Annual vendor cost',
        unit: '$',
        description: 'Annual SaaS or vendor cost.',
      },
      {
        key: 'annualInternalBuildCost',
        label: 'Annual internal build cost',
        unit: '$',
        description: 'Internal build cost or fully loaded team cost.',
      },
      {
        key: 'annualMaintenanceCost',
        label: 'Annual maintenance cost',
        unit: '$',
        description: 'Ongoing maintenance and support cost.',
      },
      {
        key: 'annualCustomizationValue',
        label: 'Annual customization value',
        unit: '$',
        description: 'Expected value from custom capability.',
      },
      {
        key: 'annualRevenueInfluenced',
        label: 'Annual revenue influenced',
        unit: '$',
        description: 'Revenue or spend affected by the custom capability.',
      },
      {
        key: 'implementationCost',
        label: 'Implementation cost',
        unit: '$',
        description: 'One-time implementation cost.',
      },
    ],
  },
  'warehouse-efficiency': {
    id: 'warehouse-efficiency',
    label: 'Warehouse / Infrastructure Efficiency',
    shortLabel: 'Warehouse',
    summaryLabel: 'Warehouse efficiency',
    description:
      'Measures value created by query optimization, faster freshness, and lower decision latency.',
    valueLever: 'Infrastructure value',
    primaryDriver: 'Query time saved + faster decisions',
    implementationCostKey: 'implementationCost',
    confidenceKey: 'confidence',
    referenceFormulaLabel:
      '(monthly queries x seconds saved per query / 3600 x hourly rate) + ((users impacted / 10) x monthly spend influenced x 1%)',
    inputs: [
      {
        key: 'monthlyQueries',
        label: 'Monthly queries',
        unit: 'count',
        description: 'Queries or jobs run each month.',
      },
      {
        key: 'secondsSavedPerQuery',
        label: 'Seconds saved per query',
        unit: 'sec',
        description: 'Average reduction in query duration.',
      },
      {
        key: 'hourlyRate',
        label: 'Hourly rate',
        unit: '$',
        description: 'Analyst or engineer fully loaded rate.',
      },
      {
        key: 'usersImpacted',
        label: 'Users impacted',
        unit: 'count',
        description: 'Users or teams benefiting from faster responses.',
      },
      {
        key: 'monthlySpendInfluenced',
        label: 'Monthly spend / revenue influenced',
        unit: '$',
        description: 'Budget or revenue affected by faster decisions.',
      },
      {
        key: 'implementationCost',
        label: 'Implementation cost',
        unit: '$',
        description: 'Optimization and governance cost.',
      },
    ],
  },
  'risk-reduction': {
    id: 'risk-reduction',
    label: 'Risk Reduction',
    shortLabel: 'Risk',
    summaryLabel: 'Risk reduction',
    description:
      'Quantifies expected avoided loss from reducing tracking failure, data loss, or compliance risk.',
    valueLever: 'Risk reduction',
    primaryDriver: 'Expected loss avoided',
    implementationCostKey: 'implementationCost',
    confidenceKey: 'confidence',
    referenceFormulaLabel:
      '(annual failure probability x cost per failure event x mitigation rate) + other avoided loss',
    inputs: [
      {
        key: 'annualFailureProbability',
        label: 'Annual failure probability',
        unit: '%',
        description: 'Probability of the adverse event.',
      },
      {
        key: 'costPerFailureEvent',
        label: 'Cost per failure event',
        unit: '$',
        description: 'Expected cost if the event occurs.',
      },
      {
        key: 'mitigationRate',
        label: 'Mitigation rate',
        unit: '%',
        description: 'Fraction of risk reduced by the initiative.',
      },
      {
        key: 'otherAvoidedLoss',
        label: 'Other avoided loss',
        unit: '$',
        description: 'Additional avoided downtime or compliance loss.',
      },
      {
        key: 'implementationCost',
        label: 'Implementation cost',
        unit: '$',
        description: 'Cost to mitigate risk.',
      },
    ],
  },
  'time-to-value': {
    id: 'time-to-value',
    label: 'Time-to-Value',
    shortLabel: 'TTV',
    summaryLabel: 'Time-to-value',
    description:
      'Estimates value created when launches, tests, or campaigns arrive faster.',
    valueLever: 'Time-to-value acceleration',
    primaryDriver: 'Pulled-forward value from faster launches',
    implementationCostKey: 'implementationCost',
    confidenceKey: 'confidence',
    referenceFormulaLabel:
      '((weeks pulled forward / 52) x value per launch x launches per year) + (annual spend influenced x acceleration lift)',
    inputs: [
      {
        key: 'weeksPulledForward',
        label: 'Weeks pulled forward',
        unit: 'weeks',
        description: 'How much sooner the value is realized.',
      },
      {
        key: 'valuePerLaunch',
        label: 'Value per launch',
        unit: '$',
        description: 'Revenue or spend influenced by the launch.',
      },
      {
        key: 'launchesPerYear',
        label: 'Launches per year',
        unit: 'count',
        description: 'How many launches benefit annually.',
      },
      {
        key: 'annualSpendInfluenced',
        label: 'Annual spend / revenue influenced',
        unit: '$',
        description: 'Annual budget or revenue affected.',
      },
      {
        key: 'accelerationLift',
        label: 'Acceleration lift',
        unit: '%',
        description: 'Incremental value from faster iteration.',
      },
      {
        key: 'implementationCost',
        label: 'Implementation cost',
        unit: '$',
        description: 'Cost to shorten cycle time.',
      },
    ],
  },
};

export const INITIAL_PORTFOLIO_STATE: PortfolioState = {
  scenario: DEFAULT_SCENARIO,
  simulation: DEFAULT_SIMULATION,
  sensitivity: DEFAULT_SENSITIVITY,
  initiatives: {
    'sdk-install': {
      confidence: 0.85,
      values: {
        monthlyConversions: 10000,
        oldCoverage: 0.4,
        newCoverage: 0.85,
        averageOrderValue: 30,
        optimizationMultiplier: 0.1,
        implementationCost: 15000,
      },
    },
    'new-events': {
      confidence: 0.85,
      values: {
        monthlyTraffic: 100000,
        oldConversionRate: 0.02,
        newConversionRate: 0.023,
        averageOrderValue: 40,
        implementationCost: 8000,
      },
    },
    'attribution-model': {
      confidence: 0.85,
      values: {
        monthlyMediaSpend: 1000000,
        shareReallocated: 0.2,
        performanceDelta: 0.25,
        baselineRoas: 1,
        implementationCost: 25000,
      },
    },
    'skan-tuning': {
      confidence: 0.85,
      values: {
        monthlyIosSpend: 200000,
        baselineIosRoas: 1,
        efficiencyGain: 0.12,
        implementationCost: 12000,
      },
    },
    'capi-server-side': {
      confidence: 0.85,
      values: {
        monthlyConversions: 5000,
        estimatedSignalLoss: 0.3,
        recoveryRate: 0.5,
        averageOrderValue: 50,
        optimizationMultiplier: 0.1,
        implementationCost: 10000,
      },
    },
    'workflow-automation': {
      confidence: 0.85,
      values: {
        hoursSaved: 80,
        hourlyLaborRate: 75,
        errorHoursAvoided: 16,
        processesInfluenced: 10,
        valueInfluencedPerProcess: 20000,
        performanceLift: 0.02,
        implementationCost: 18000,
      },
    },
    'self-service-tool': {
      confidence: 0.85,
      values: {
        requestsEliminated: 50,
        hoursPerRequest: 2,
        analystHourlyRate: 60,
        monthlyValueInfluenced: 500000,
        decisionLift: 0.05,
        implementationCost: 22000,
      },
    },
    'tool-value': {
      confidence: 0.85,
      values: {
        monthlyActiveUsers: 20,
        hoursSavedPerUser: 5,
        hourlyRate: 75,
        decisionsInfluenced: 120,
        valuePerDecision: 150,
        implementationCost: 25000,
      },
    },
    'build-vs-buy': {
      confidence: 0.85,
      values: {
        annualVendorCost: 120000,
        annualInternalBuildCost: 70000,
        annualMaintenanceCost: 15000,
        annualCustomizationValue: 30000,
        annualRevenueInfluenced: 500000,
        implementationCost: 20000,
      },
    },
    'warehouse-efficiency': {
      confidence: 0.85,
      values: {
        monthlyQueries: 10000,
        secondsSavedPerQuery: 5,
        hourlyRate: 90,
        usersImpacted: 40,
        monthlySpendInfluenced: 2000000,
        implementationCost: 30000,
      },
    },
    'risk-reduction': {
      confidence: 0.85,
      values: {
        annualFailureProbability: 0.1,
        costPerFailureEvent: 200000,
        mitigationRate: 0.5,
        otherAvoidedLoss: 10000,
        implementationCost: 15000,
      },
    },
    'time-to-value': {
      confidence: 0.85,
      values: {
        weeksPulledForward: 2,
        valuePerLaunch: 500000,
        launchesPerYear: 8,
        annualSpendInfluenced: 1000000,
        accelerationLift: 0.02,
        implementationCost: 18000,
      },
    },
  },
};
