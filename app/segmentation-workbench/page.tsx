import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import {
  getDisplayValue,
  readSegmentationWorkbenchData,
  type SegmentationRollup,
} from '#/lib/segmentation-workbench';
import { Boundary } from '#/ui/boundary';

export const metadata: Metadata = {
  title: 'Segmentation Workbench',
  description:
    'A Snowflake-backed audience segmentation dashboard for the Nestle analysis sample.',
};

const PREVIEW_COLUMNS = [
  'CAMPAIGN_NAME',
  'L1_BRAND_NAME',
  'PREDICTED_GENDER',
  'GENERATION',
  'AGE_BUCKET',
  'INCOME_BUCKET',
  'IS_CURRENT_DASHPASS',
] as const;

export default function Page() {
  return (
    <Suspense fallback={<WorkbenchSkeleton />}>
      <SegmentationContent />
    </Suspense>
  );
}

async function SegmentationContent() {
  await connection();
  const dataset = await readSegmentationWorkbenchData(12);

  return (
    <Boundary
      label={['snowflake', 'segmentation', 'dashboard']}
      animateRerendering={false}
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col gap-3">
        <p className="font-mono text-xs tracking-[0.24em] text-cyan-400 uppercase">
          DoorDash Ads Prototype
        </p>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-white">
            Snowflake Segmentation Workbench
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-gray-400">
            This page queries Snowflake directly and summarizes the
            <span className="mx-1 font-mono text-gray-300">
              PRODDB.FELIXRIVERA.NESTLE_ANALYSIS_SAMPLE
            </span>
            audience table for quick inspection on Vercel or locally.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <MetricCard
          label="Source"
          value={dataset.source}
          helper={`${dataset.totalRows} rows returned by query`}
        />
        <MetricCard
          label="Addressable users"
          value={numberFormatter.format(dataset.summary.totalUsers)}
          helper={`${numberFormatter.format(dataset.summary.uniqueConsumers)} unique consumers`}
        />
        <MetricCard
          label="Coverage"
          value={`${dataset.summary.campaigns} campaigns / ${dataset.summary.brands} brands`}
          helper={`Model match ${formatPercent(dataset.summary.modelMatchRate)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Boundary
          label="Query"
          size="small"
          color="cyan"
          animateRerendering={false}
          className="flex flex-col gap-3"
        >
          <p className="text-sm leading-6 text-gray-400">
            The page uses the shared server-side query below. Override it with
            <span className="mx-1 font-mono text-gray-300">
              SEGMENTATION_SNOWFLAKE_QUERY
            </span>
            if you want a narrower slice.
          </p>
          <pre className="overflow-x-auto rounded-md border border-gray-800 bg-gray-900/70 p-3 font-mono text-xs leading-6 text-gray-300">
            {dataset.query}
          </pre>
        </Boundary>

        <Boundary
          label="Data health"
          size="small"
          color="blue"
          animateRerendering={false}
          className="grid gap-3"
        >
          <HealthRow
            label="Known gender"
            value={formatPercent(dataset.summary.knownGenderRate)}
          />
          <HealthRow
            label="Known ethnicity"
            value={formatPercent(dataset.summary.knownEthnicityRate)}
          />
          <HealthRow
            label="Known children flag"
            value={formatPercent(dataset.summary.knownChildrenRate)}
          />
          <HealthRow
            label="Current DashPass"
            value={formatPercent(dataset.summary.currentDashPassRate)}
          />
          <HealthRow
            label="Ever DashPass"
            value={formatPercent(dataset.summary.everDashPassRate)}
          />
        </Boundary>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RollupCard
          title="Top campaigns"
          rows={dataset.summary.topCampaigns}
          color="orange"
        />
        <RollupCard
          title="Top brands"
          rows={dataset.summary.topBrands}
          color="violet"
        />
        <RollupCard
          title="Top generations"
          rows={dataset.summary.topGenerations}
          color="pink"
        />
        <RollupCard
          title="Top income buckets"
          rows={dataset.summary.topIncomeBuckets}
          color="red"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
        <Boundary
          label="Average fill rates"
          size="small"
          color="cyan"
          animateRerendering={false}
          className="flex flex-col gap-3"
        >
          {dataset.summary.fillRates.map((metric) => (
            <div
              key={metric.field}
              className="flex items-center justify-between gap-4 rounded-md border border-gray-800 bg-gray-900/60 px-3 py-2"
            >
              <span className="font-mono text-[11px] tracking-wide text-gray-400 uppercase">
                {metric.field.replace(/_fill_rate$/i, '')}
              </span>
              <span className="text-sm font-semibold text-white">
                {formatPercent(metric.rate)}
              </span>
            </div>
          ))}
        </Boundary>

        <Boundary
          label="Preview rows"
          size="small"
          animateRerendering={false}
          className="overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  {PREVIEW_COLUMNS.map((column) => (
                    <th
                      key={column}
                      className="border-b border-gray-800 px-3 py-2 text-left font-mono text-[11px] tracking-wide text-gray-500 uppercase"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataset.previewRows.map((row, index) => (
                  <tr key={`${getDisplayValue(row, 'CONSUMER_ID')}-${index}`}>
                    {PREVIEW_COLUMNS.map((column) => (
                      <td
                        key={`${index}-${column}`}
                        className="border-b border-gray-900 px-3 py-3 text-sm text-gray-300"
                      >
                        {getDisplayValue(row, column)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Boundary>
      </div>
    </Boundary>
  );
}

function WorkbenchSkeleton() {
  return (
    <Boundary
      label={['snowflake', 'segmentation', 'dashboard']}
      animateRerendering={false}
      className="flex flex-col gap-4"
    >
      <div className="h-8 w-72 animate-pulse rounded bg-gray-800" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-28 animate-pulse rounded border border-gray-800 bg-gray-900/60" />
        <div className="h-28 animate-pulse rounded border border-gray-800 bg-gray-900/60" />
        <div className="h-28 animate-pulse rounded border border-gray-800 bg-gray-900/60" />
      </div>
      <div className="h-96 animate-pulse rounded border border-gray-800 bg-gray-900/60" />
    </Boundary>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Boundary
      label={label}
      size="small"
      animateRerendering={false}
      className="flex flex-col gap-2"
    >
      <div className="text-lg font-semibold text-white">{value}</div>
      <p className="text-sm text-gray-500">{helper}</p>
    </Boundary>
  );
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-gray-800 bg-gray-900/60 px-3 py-2">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function RollupCard({
  title,
  rows,
  color,
}: {
  title: string;
  rows: SegmentationRollup[];
  color: 'orange' | 'violet' | 'pink' | 'red';
}) {
  return (
    <Boundary
      label={title}
      size="small"
      color={color}
      animateRerendering={false}
      className="flex flex-col gap-3"
    >
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-4 rounded-md border border-gray-800 bg-gray-900/60 px-3 py-2"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white">{row.label}</div>
            <div className="font-mono text-[11px] tracking-wide text-gray-500 uppercase">
              {row.rows} rows
            </div>
          </div>
          <div className="text-sm font-semibold text-cyan-300">
            {numberFormatter.format(row.users)}
          </div>
        </div>
      ))}
    </Boundary>
  );
}

function formatPercent(value: number) {
  return percentFormatter.format(value);
}

const numberFormatter = new Intl.NumberFormat('en-US');
const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
});
