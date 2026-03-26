'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { computePortfolio } from '#/lib/value-calculator/engine';
import {
  INITIATIVE_DEFINITIONS,
  INITIATIVE_ORDER,
  NAV_SECTIONS,
  WORKBOOK_NOTES,
} from '#/lib/value-calculator/model';
import type {
  InitiativeId,
  PortfolioState,
  SectionId,
} from '#/lib/value-calculator/types';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
  return currency.format(Number.isFinite(value) ? value : 0);
}

function formatCompactCurrency(value: number) {
  return compactCurrency.format(Number.isFinite(value) ? value : 0);
}

function formatPercent(value: number) {
  return percent.format(value);
}

function formatMonths(value: number) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }

  return `${value.toFixed(2)} mo`;
}

function encodeState(state: PortfolioState) {
  const json = JSON.stringify(state);
  return btoa(unescape(encodeURIComponent(json)));
}

function decodeState(value: string) {
  const json = decodeURIComponent(escape(atob(value)));
  return JSON.parse(json) as PortfolioState;
}

function downloadFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: SectionId;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6"
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.24em] text-cyan-300/80 uppercase">
          {title}
        </p>
        <p className="max-w-3xl text-sm text-slate-300">{description}</p>
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </div>
  );
}

function TooltipCard({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl">
      {label ? (
        <p className="mb-2 text-xs font-medium text-slate-300">{label}</p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <span className="text-slate-400">{entry.name}</span>
            <span className="font-medium text-white">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ValueOsApp({ initialState }: { initialState: PortfolioState }) {
  const [state, setState] = useState<PortfolioState>(initialState);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedSection, setSelectedSection] = useState<SectionId>('overview');
  const [selectedInitiative, setSelectedInitiative] =
    useState<InitiativeId>('sdk-install');
  const [shareStatus, setShareStatus] = useState<string>('');

  useEffect(() => {
    setIsMounted(true);

    if (typeof window === 'undefined') {
      return;
    }

    const hash = window.location.hash;
    if (!hash.startsWith('#state=')) {
      return;
    }

    try {
      const decoded = decodeState(hash.replace('#state=', ''));
      setState(decoded);
      setShareStatus('Loaded shared scenario from URL.');
    } catch {
      setShareStatus('Could not load shared scenario from URL.');
    }
  }, []);

  const computation = useMemo(() => computePortfolio(state), [state]);
  const selectedModuleResult = computation.moduleResults.find(
    (result) => result.id === selectedInitiative,
  );
  const selectedModuleDefinition = INITIATIVE_DEFINITIONS[selectedInitiative];
  const selectedModuleState = state.initiatives[selectedInitiative];

  const updateInitiativeValue = (
    initiativeId: InitiativeId,
    key: string,
    value: number,
  ) => {
    setState((current) => ({
      ...current,
      initiatives: {
        ...current.initiatives,
        [initiativeId]: {
          ...current.initiatives[initiativeId],
          values: {
            ...current.initiatives[initiativeId].values,
            [key]: Number.isFinite(value) ? value : 0,
          },
        },
      },
    }));
  };

  const updateInitiativeConfidence = (
    initiativeId: InitiativeId,
    value: number,
  ) => {
    setState((current) => ({
      ...current,
      initiatives: {
        ...current.initiatives,
        [initiativeId]: {
          ...current.initiatives[initiativeId],
          confidence: Number.isFinite(value) ? value : 0,
        },
      },
    }));
  };

  const updateScenarioValue = (
    key: keyof PortfolioState['scenario'],
    value: number,
  ) => {
    setState((current) => ({
      ...current,
      scenario: {
        ...current.scenario,
        [key]: Number.isFinite(value) ? value : 0,
      },
    }));
  };

  const updateSimulationValue = (
    key: keyof PortfolioState['simulation'],
    value: number,
  ) => {
    setState((current) => ({
      ...current,
      simulation: {
        ...current.simulation,
        [key]:
          key === 'iterations' || key === 'seed'
            ? Math.max(1, Math.round(value))
            : Number.isFinite(value)
              ? value
              : 0,
      },
    }));
  };

  const updateSensitivityValue = (
    key: keyof PortfolioState['sensitivity'],
    value: number,
  ) => {
    setState((current) => ({
      ...current,
      sensitivity: {
        ...current.sensitivity,
        [key]: Number.isFinite(value) ? value : 0,
      },
    }));
  };

  const exportJson = () => {
    downloadFile(
      'martech-value-os-state.json',
      JSON.stringify(
        {
          state,
          summary: computation.summary,
          moduleResults: computation.moduleResults,
          simulationStats: computation.simulationStats,
        },
        null,
        2,
      ),
      'application/json',
    );
  };

  const exportCsv = () => {
    const header = [
      'Initiative',
      'Low Monthly Impact',
      'Base Monthly Impact',
      'High Monthly Impact',
      'Confidence Adjusted Monthly Impact',
      'Annual Impact',
      'Implementation Cost',
      'Payback Period (Months)',
    ];

    const rows = computation.moduleResults.map((result) => [
      result.summaryLabel,
      result.lowMonthlyImpact,
      result.baseMonthlyImpact,
      result.highMonthlyImpact,
      result.confidenceAdjustedMonthlyImpact,
      result.annualImpact,
      result.implementationCost,
      result.paybackPeriodMonths,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => JSON.stringify(cell)).join(','))
      .join('\n');

    downloadFile('martech-value-os-summary.csv', csv, 'text/csv;charset=utf-8');
  };

  const copyShareLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#state=${encodeState(
      state,
    )}`;

    try {
      await navigator.clipboard.writeText(url);
      setShareStatus('Share link copied to clipboard.');
    } catch {
      setShareStatus(
        'Clipboard permission unavailable. Copy the URL manually.',
      );
      window.history.replaceState(null, '', url);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#020617_35%,_#111827_100%)] text-white">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
        <aside className="top-6 h-fit rounded-3xl border border-white/10 bg-slate-950/70 p-4 backdrop-blur lg:sticky lg:w-80">
          <div className="space-y-3 border-b border-white/10 pb-4">
            <p className="text-xs font-semibold tracking-[0.28em] text-cyan-300/80 uppercase">
              MarTech Value OS
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Executive-ready impact modeling on the web
            </h1>
            <p className="text-sm leading-6 text-slate-300">
              A Vercel-ready calculator that turns the workbook into a
              transparent, scenario-aware operating system for MarTech
              investment decisions.
            </p>
          </div>

          <nav className="mt-4 space-y-2">
            {NAV_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={() => setSelectedSection(section.id)}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition ${
                  selectedSection === section.id
                    ? 'bg-cyan-400/15 text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{section.label}</span>
                <span className="text-xs text-slate-500">
                  0{NAV_SECTIONS.indexOf(section) + 1}
                </span>
              </a>
            ))}
          </nav>

          <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
            <p className="text-sm font-medium text-cyan-100">
              Portfolio monthly impact
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {formatCompactCurrency(computation.summary.monthlyImpact)}
            </p>
            <p className="mt-2 text-sm text-cyan-50/80">
              Confidence-adjusted across {computation.moduleResults.length}{' '}
              initiative models.
            </p>
          </div>
        </aside>

        <main className="flex-1 space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Weighted monthly impact"
              value={formatCompactCurrency(computation.summary.monthlyImpact)}
              detail="Confidence-adjusted portfolio value based on the workbook scenarios."
            />
            <MetricCard
              label="Weighted annual impact"
              value={formatCompactCurrency(computation.summary.annualImpact)}
              detail="Annualized from the modeled monthly portfolio contribution."
            />
            <MetricCard
              label="Portfolio payback"
              value={formatMonths(computation.summary.paybackPeriodMonths)}
              detail="Total implementation cost divided by confidence-adjusted monthly impact."
            />
          </section>

          <Section
            id="overview"
            title="Overview"
            description="The portfolio roll-up mirrors the spreadsheet summary sheet: confidence-adjusted module impacts, total annualized value, and a cumulative waterfall that tells the story for executives."
          >
            <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Portfolio waterfall
                    </h2>
                    <p className="text-sm text-slate-400">
                      Confidence-adjusted contribution by initiative.
                    </p>
                  </div>
                </div>
                <div className="h-[360px]">
                  {isMounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={computation.waterfall}>
                        <CartesianGrid
                          stroke="rgba(148,163,184,0.12)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                        />
                        <YAxis
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                          tickFormatter={(value) =>
                            formatCompactCurrency(value)
                          }
                        />
                        <Tooltip content={<TooltipCard />} />
                        <Bar
                          dataKey="base"
                          stackId="waterfall"
                          fill="rgba(0,0,0,0)"
                          stroke="rgba(0,0,0,0)"
                        />
                        <Bar
                          dataKey="change"
                          name="Impact"
                          stackId="waterfall"
                          fill="#22d3ee"
                          radius={[6, 6, 0, 0]}
                        >
                          {computation.waterfall.map((entry) => (
                            <Cell
                              key={entry.label}
                              fill={
                                entry.label === 'Baseline'
                                  ? '#334155'
                                  : '#22d3ee'
                              }
                            />
                          ))}
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-500">
                      Waterfall chart renders after hydration.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <h2 className="text-lg font-semibold text-white">
                  Portfolio summary
                </h2>
                <div className="mt-4 space-y-3">
                  {computation.moduleResults.map((result) => (
                    <div
                      key={result.id}
                      className="rounded-2xl border border-white/8 bg-white/[0.02] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-white">
                            {result.summaryLabel}
                          </p>
                          <p className="text-sm text-slate-400">
                            {result.primaryDriver}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-cyan-300">
                            {formatCompactCurrency(
                              result.confidenceAdjustedMonthlyImpact,
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatMonths(result.paybackPeriodMonths)} payback
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section
            id="calculator"
            title="Calculator"
            description="Each module preserves the workbook logic but exposes assumptions as editable inputs, with transparent formula steps and module-level outputs for low, base, high, weighted, and confidence-adjusted value."
          >
            <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
              <div className="space-y-2 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                {INITIATIVE_ORDER.map((initiativeId) => {
                  const result = computation.moduleResults.find(
                    (item) => item.id === initiativeId,
                  );

                  return (
                    <button
                      key={initiativeId}
                      type="button"
                      onClick={() => setSelectedInitiative(initiativeId)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        selectedInitiative === initiativeId
                          ? 'border-cyan-400/50 bg-cyan-400/10'
                          : 'border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
                      }`}
                    >
                      <p className="font-medium text-white">
                        {INITIATIVE_DEFINITIONS[initiativeId].label}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {INITIATIVE_DEFINITIONS[initiativeId].valueLever}
                      </p>
                      <p className="mt-2 text-sm text-cyan-300">
                        {result
                          ? formatCompactCurrency(
                              result.confidenceAdjustedMonthlyImpact,
                            )
                          : ''}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                  <div className="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-white">
                        {selectedModuleDefinition.label}
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm text-slate-400">
                        {selectedModuleDefinition.description}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
                      <p className="text-xs tracking-[0.24em] text-cyan-200/70 uppercase">
                        Confidence-adjusted monthly
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {selectedModuleResult
                          ? formatCurrency(
                              selectedModuleResult.confidenceAdjustedMonthlyImpact,
                            )
                          : formatCurrency(0)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {selectedModuleDefinition.inputs.map((input) => (
                      <label key={input.key} className="space-y-2">
                        <span className="text-sm font-medium text-white">
                          {input.label}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {input.description}
                        </span>
                        <div className="rounded-2xl border border-white/10 bg-slate-900/90 px-3 py-2">
                          <div className="mb-1 text-[11px] tracking-[0.24em] text-slate-500 uppercase">
                            {input.unit}
                          </div>
                          <input
                            type="number"
                            value={selectedModuleState.values[input.key] ?? 0}
                            step="any"
                            onChange={(event) =>
                              updateInitiativeValue(
                                selectedInitiative,
                                input.key,
                                Number(event.target.value),
                              )
                            }
                            className="w-full border-0 bg-transparent p-0 text-base text-white outline-none focus:ring-0"
                          />
                        </div>
                      </label>
                    ))}

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-white">
                        Confidence factor
                      </span>
                      <span className="block text-xs text-slate-500">
                        Applied as the final risk discount on the weighted
                        scenario output.
                      </span>
                      <div className="rounded-2xl border border-white/10 bg-slate-900/90 px-3 py-2">
                        <div className="mb-1 text-[11px] tracking-[0.24em] text-slate-500 uppercase">
                          %
                        </div>
                        <input
                          type="number"
                          value={selectedModuleState.confidence}
                          step="any"
                          onChange={(event) =>
                            updateInitiativeConfidence(
                              selectedInitiative,
                              Number(event.target.value),
                            )
                          }
                          className="w-full border-0 bg-transparent p-0 text-base text-white outline-none focus:ring-0"
                        />
                      </div>
                    </label>
                  </div>
                </div>

                {selectedModuleResult ? (
                  <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                      <h3 className="text-lg font-semibold text-white">
                        Formula transparency
                      </h3>
                      <p className="mt-2 text-sm text-slate-400">
                        Workbook translation:{' '}
                        {selectedModuleDefinition.referenceFormulaLabel}
                      </p>
                      <div className="mt-4 space-y-3">
                        {selectedModuleResult.formulaSteps.map((step) => (
                          <div
                            key={step.label}
                            className="rounded-2xl border border-white/8 bg-white/[0.02] p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium text-white">
                                  {step.label}
                                </p>
                                <p className="mt-1 font-mono text-xs text-cyan-200">
                                  {step.formula}
                                </p>
                                <p className="mt-2 text-sm text-slate-400">
                                  {step.detail}
                                </p>
                              </div>
                              <p className="text-right font-semibold text-cyan-300">
                                {step.label === 'Payback period'
                                  ? formatMonths(step.value)
                                  : formatCurrency(step.value)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                      <h3 className="text-lg font-semibold text-white">
                        Module output
                      </h3>
                      <div className="mt-4 grid gap-3">
                        {[
                          [
                            'Reference monthly impact',
                            formatCurrency(
                              selectedModuleResult.referenceMonthlyImpact,
                            ),
                          ],
                          [
                            'Low case',
                            formatCurrency(
                              selectedModuleResult.lowMonthlyImpact,
                            ),
                          ],
                          [
                            'Base case',
                            formatCurrency(
                              selectedModuleResult.baseMonthlyImpact,
                            ),
                          ],
                          [
                            'High case',
                            formatCurrency(
                              selectedModuleResult.highMonthlyImpact,
                            ),
                          ],
                          [
                            'Weighted monthly impact',
                            formatCurrency(
                              selectedModuleResult.weightedMonthlyImpact,
                            ),
                          ],
                          [
                            'Confidence-adjusted monthly impact',
                            formatCurrency(
                              selectedModuleResult.confidenceAdjustedMonthlyImpact,
                            ),
                          ],
                          [
                            'Annual impact',
                            formatCurrency(selectedModuleResult.annualImpact),
                          ],
                          [
                            'Payback period',
                            formatMonths(
                              selectedModuleResult.paybackPeriodMonths,
                            ),
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3"
                          >
                            <span className="text-sm text-slate-400">
                              {label}
                            </span>
                            <span className="font-semibold text-white">
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </Section>

          <Section
            id="scenarios"
            title="Scenarios"
            description="Low, base, and high views are applied consistently across the portfolio. Scenario weights are normalized in the engine so executives can compare deterministic ranges and the expected confidence-adjusted outcome."
          >
            <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <h3 className="text-lg font-semibold text-white">
                  Scenario controls
                </h3>
                <div className="mt-4 grid gap-4">
                  {[
                    ['Low multiplier', 'lowMultiplier'],
                    ['Base multiplier', 'baseMultiplier'],
                    ['High multiplier', 'highMultiplier'],
                    ['Low weight', 'lowWeight'],
                    ['Base weight', 'baseWeight'],
                    ['High weight', 'highWeight'],
                  ].map(([label, key]) => (
                    <label key={key} className="space-y-2">
                      <span className="text-sm text-white">{label}</span>
                      <input
                        type="number"
                        step="any"
                        value={
                          state.scenario[
                            key as keyof PortfolioState['scenario']
                          ]
                        }
                        onChange={(event) =>
                          updateScenarioValue(
                            key as keyof PortfolioState['scenario'],
                            Number(event.target.value),
                          )
                        }
                        className="w-full rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <h3 className="text-lg font-semibold text-white">
                  Low / base / high comparison
                </h3>
                <div className="mt-4 h-[420px]">
                  {isMounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={computation.scenarioComparison}
                        barGap={8}
                      >
                        <CartesianGrid
                          stroke="rgba(148,163,184,0.12)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                        />
                        <YAxis
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                          tickFormatter={(value) =>
                            formatCompactCurrency(value)
                          }
                        />
                        <Tooltip content={<TooltipCard />} />
                        <Bar
                          dataKey="low"
                          fill="#1d4ed8"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="base"
                          fill="#22d3ee"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="high"
                          fill="#a78bfa"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-500">
                      Scenario chart renders after hydration.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Section>

          <Section
            id="simulation"
            title="Simulation"
            description="Monte Carlo simulation turns the deterministic portfolio total into a distribution. The app uses a seeded normal model so the output is shareable, reproducible, and suitable for downside and upside discussions."
          >
            <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <h3 className="text-lg font-semibold text-white">
                  Simulation controls
                </h3>
                <div className="mt-4 grid gap-4">
                  {[
                    ['Iterations', 'iterations'],
                    ['Volatility', 'volatility'],
                    ['Seed', 'seed'],
                  ].map(([label, key]) => (
                    <label key={key} className="space-y-2">
                      <span className="text-sm text-white">{label}</span>
                      <input
                        type="number"
                        step="any"
                        value={
                          state.simulation[
                            key as keyof PortfolioState['simulation']
                          ]
                        }
                        onChange={(event) =>
                          updateSimulationValue(
                            key as keyof PortfolioState['simulation'],
                            Number(event.target.value),
                          )
                        }
                        className="w-full rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none"
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-5 grid gap-3">
                  <MetricCard
                    label="P10"
                    value={formatCompactCurrency(
                      computation.simulationStats.p10,
                    )}
                    detail="Downside outcome."
                  />
                  <MetricCard
                    label="P50"
                    value={formatCompactCurrency(
                      computation.simulationStats.p50,
                    )}
                    detail="Median outcome."
                  />
                  <MetricCard
                    label="P90"
                    value={formatCompactCurrency(
                      computation.simulationStats.p90,
                    )}
                    detail="Upside outcome."
                  />
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <h3 className="text-lg font-semibold text-white">
                    Monte Carlo distribution
                  </h3>
                  <div className="mt-4 h-[320px]">
                    {isMounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={computation.histogram}>
                          <CartesianGrid
                            stroke="rgba(148,163,184,0.12)"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="bucket"
                            tick={false}
                            axisLine={{ stroke: 'rgba(148,163,184,0.2)' }}
                          />
                          <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) {
                                return null;
                              }

                              const datum = payload[0].payload as {
                                bucket: string;
                                count: number;
                              };

                              return (
                                <div className="rounded-xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl">
                                  <p className="text-xs text-slate-400">
                                    {datum.bucket}
                                  </p>
                                  <p className="mt-2 text-sm font-medium text-white">
                                    {datum.count} simulations
                                  </p>
                                </div>
                              );
                            }}
                          />
                          <ReferenceLine
                            x={
                              computation.histogram[
                                Math.floor(computation.histogram.length / 2)
                              ]?.bucket
                            }
                            stroke="rgba(255,255,255,0.08)"
                          />
                          <Bar
                            dataKey="count"
                            fill="#22d3ee"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-500">
                        Distribution chart renders after hydration.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                  <h3 className="text-lg font-semibold text-white">
                    Simulation summary
                  </h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <MetricCard
                      label="Mean"
                      value={formatCompactCurrency(
                        computation.simulationStats.mean,
                      )}
                      detail="Average across all simulation runs."
                    />
                    <MetricCard
                      label="Std dev"
                      value={formatCompactCurrency(
                        computation.simulationStats.standardDeviation,
                      )}
                      detail="Dispersion around the portfolio expectation."
                    />
                    <MetricCard
                      label="Modeled monthly base"
                      value={formatCompactCurrency(
                        computation.summary.monthlyImpact,
                      )}
                      detail="Confidence-adjusted deterministic portfolio output."
                    />
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section
            id="sensitivity"
            title="Sensitivity"
            description="Tornado analysis highlights the highest-leverage assumptions in the portfolio, using volume, lift, value-per-unit, and confidence ranges that mirror the workbook’s directional analysis."
          >
            <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <h3 className="text-lg font-semibold text-white">
                  Sensitivity controls
                </h3>
                <div className="mt-4 grid gap-4">
                  {[
                    ['Volume sensitivity', 'volume'],
                    ['Lift sensitivity', 'lift'],
                    ['Value-per-unit sensitivity', 'valuePerUnit'],
                    ['Confidence sensitivity', 'confidence'],
                  ].map(([label, key]) => (
                    <label key={key} className="space-y-2">
                      <span className="text-sm text-white">{label}</span>
                      <input
                        type="number"
                        step="any"
                        value={
                          state.sensitivity[
                            key as keyof PortfolioState['sensitivity']
                          ]
                        }
                        onChange={(event) =>
                          updateSensitivityValue(
                            key as keyof PortfolioState['sensitivity'],
                            Number(event.target.value),
                          )
                        }
                        className="w-full rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <h3 className="text-lg font-semibold text-white">
                  Sensitivity tornado
                </h3>
                <div className="mt-4 h-[360px]">
                  {isMounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={computation.sensitivity}
                        layout="vertical"
                        margin={{ left: 24, right: 16, top: 10, bottom: 10 }}
                      >
                        <CartesianGrid
                          stroke="rgba(148,163,184,0.12)"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          tickFormatter={(value) =>
                            formatCompactCurrency(value)
                          }
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="driver"
                          tick={{ fill: '#e2e8f0', fontSize: 13 }}
                          width={110}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) {
                              return null;
                            }

                            const datum = payload[0].payload as {
                              low: number;
                              high: number;
                              range: number;
                            };

                            return (
                              <div className="rounded-xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl">
                                <p className="text-xs text-slate-400">
                                  {label}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  Low: {formatCurrency(datum.low)}
                                </p>
                                <p className="text-xs text-slate-400">
                                  High: {formatCurrency(datum.high)}
                                </p>
                                <p className="mt-2 text-sm font-medium text-white">
                                  Range: {formatCurrency(datum.range)}
                                </p>
                              </div>
                            );
                          }}
                        />
                        <Bar
                          dataKey="range"
                          fill="#a78bfa"
                          radius={[0, 8, 8, 0]}
                        >
                          <LabelList
                            dataKey="range"
                            position="right"
                            formatter={(value) =>
                              formatCompactCurrency(Number(value ?? 0))
                            }
                            fill="#cbd5e1"
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-500">
                      Tornado chart renders after hydration.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Section>

          <Section
            id="assumptions"
            title="Assumptions"
            description="Defaults are seeded from the workbook sample rows. This section gives operators a fast way to audit the active assumptions, units, and risk discounts across the portfolio."
          >
            <div className="space-y-5">
              {INITIATIVE_ORDER.map((initiativeId) => {
                const definition = INITIATIVE_DEFINITIONS[initiativeId];
                const initiative = state.initiatives[initiativeId];

                return (
                  <div
                    key={initiativeId}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-5"
                  >
                    <div className="flex flex-col gap-2 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {definition.label}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {definition.valueLever}
                        </p>
                      </div>
                      <p className="text-sm text-cyan-300">
                        Confidence: {formatPercent(initiative.confidence)}
                      </p>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {definition.inputs.map((input) => (
                        <div
                          key={input.key}
                          className="rounded-2xl border border-white/8 bg-white/[0.02] p-4"
                        >
                          <p className="text-sm text-slate-400">
                            {input.label}
                          </p>
                          <p className="mt-2 text-lg font-semibold text-white">
                            {input.unit === '$'
                              ? formatCurrency(
                                  initiative.values[input.key] ?? 0,
                                )
                              : input.unit === '%'
                                ? formatPercent(
                                    initiative.values[input.key] ?? 0,
                                  )
                                : `${initiative.values[input.key] ?? 0} ${input.unit}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section
            id="export"
            title="Export"
            description="Results can be exported for downstream analysis or shared through a URL snapshot of the current assumptions. The notes below document the workbook assumptions carried into the web model."
          >
            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <h3 className="text-lg font-semibold text-white">Actions</h3>
                <div className="mt-4 grid gap-3">
                  <button
                    type="button"
                    onClick={exportJson}
                    className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    Export JSON
                  </button>
                  <button
                    type="button"
                    onClick={exportCsv}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.05]"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={copyShareLink}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.05]"
                  >
                    Copy share link
                  </button>
                </div>
                {shareStatus ? (
                  <p className="mt-4 text-sm text-cyan-200">{shareStatus}</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <h3 className="text-lg font-semibold text-white">
                  Workbook assumptions
                </h3>
                <div className="mt-4 space-y-3">
                  {WORKBOOK_NOTES.map((note) => (
                    <div
                      key={note}
                      className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm leading-6 text-slate-300"
                    >
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}
