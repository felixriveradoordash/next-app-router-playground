import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { csvSourceLabel, resolveSegmentationCsvPath } from '#/lib/read-segmentation-csv';

export type SegmentationRow = Record<string, string>;

export type SegmentationRollup = {
  label: string;
  rows: number;
  users: number;
};

export type SegmentationFillRate = {
  field: string;
  rate: number;
};

export type SegmentationSummary = {
  campaigns: number;
  brands: number;
  totalUsers: number;
  uniqueConsumers: number;
  modelMatchRate: number;
  currentDashPassRate: number;
  everDashPassRate: number;
  knownGenderRate: number;
  knownEthnicityRate: number;
  knownChildrenRate: number;
  topCampaigns: SegmentationRollup[];
  topBrands: SegmentationRollup[];
  topGenerations: SegmentationRollup[];
  topIncomeBuckets: SegmentationRollup[];
  fillRates: SegmentationFillRate[];
};

export type SegmentationWorkbenchData = {
  source: string;
  path: string;
  columns: string[];
  totalRows: number;
  previewRows: SegmentationRow[];
  summary: SegmentationSummary;
};

const UNKNOWN = 'UNKNOWN';

export async function readSegmentationWorkbenchData(
  previewLimit = 12,
): Promise<SegmentationWorkbenchData> {
  const filePath = resolveSegmentationCsvPath();
  const raw = await readFile(filePath, 'utf8');
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as SegmentationRow[];

  return {
    source: csvSourceLabel(filePath),
    path: filePath,
    columns: Object.keys(rows[0] ?? {}),
    totalRows: rows.length,
    previewRows: rows.slice(0, previewLimit),
    summary: summarizeSegmentationRows(rows),
  };
}

export function summarizeSegmentationRows(
  rows: SegmentationRow[],
): SegmentationSummary {
  const campaigns = new Set(rows.map((row) => normalizeValue(row.CAMPAIGN_ID)));
  const brands = new Set(rows.map((row) => normalizeValue(row.L1_BRAND_NAME)));

  return {
    campaigns: campaigns.size,
    brands: brands.size,
    totalUsers: rows.reduce((sum, row) => sum + toNumber(row.user_count, 1), 0),
    uniqueConsumers: new Set(
      rows.map((row) => normalizeValue(row.consumer_id)).filter(isKnownValue),
    ).size,
    modelMatchRate: ratio(rows, (row) => toBoolean(row.GENDER_MODEL_MATCH)),
    currentDashPassRate: ratio(rows, (row) => toBoolean(row.IS_CURRENT_DASHPASS)),
    everDashPassRate: ratio(rows, (row) => toBoolean(row.IS_EVER_DASHPASS)),
    knownGenderRate: ratio(rows, (row) => isKnownValue(normalizeValue(row.GENDER))),
    knownEthnicityRate: ratio(rows, (row) =>
      isKnownValue(normalizeValue(row.ETHNICITY)),
    ),
    knownChildrenRate: ratio(rows, (row) =>
      isKnownValue(normalizeValue(row.PRESENCE_OF_CHILDREN_IND)),
    ),
    topCampaigns: rollup(rows, 'CAMPAIGN_NAME'),
    topBrands: rollup(rows, 'L1_BRAND_NAME'),
    topGenerations: rollup(rows, 'GENERATION'),
    topIncomeBuckets: rollup(rows, 'INCOME_BUCKET'),
    fillRates: averageFillRates(rows),
  };
}

function rollup(rows: SegmentationRow[], key: string, limit = 5) {
  const counts = new Map<string, SegmentationRollup>();

  for (const row of rows) {
    const label = normalizeValue(row[key]);
    const current = counts.get(label) ?? { label, rows: 0, users: 0 };
    current.rows += 1;
    current.users += toNumber(row.user_count, 1);
    counts.set(label, current);
  }

  return Array.from(counts.values())
    .sort((left, right) => right.users - left.users || right.rows - left.rows)
    .slice(0, limit);
}

function averageFillRates(rows: SegmentationRow[]) {
  const fillRateColumns = Object.keys(rows[0] ?? {}).filter((column) =>
    column.endsWith('_fill_rate'),
  );

  return fillRateColumns
    .map((field) => {
      const values = rows
        .map((row) => toNumber(row[field], Number.NaN))
        .filter((value) => Number.isFinite(value));

      if (!values.length) return null;

      const total = values.reduce((sum, value) => sum + value, 0);
      return { field, rate: total / values.length };
    })
    .filter((value): value is SegmentationFillRate => value !== null)
    .sort((left, right) => right.rate - left.rate);
}

function ratio(
  rows: SegmentationRow[],
  predicate: (row: SegmentationRow) => boolean,
) {
  if (!rows.length) return 0;
  const matches = rows.filter(predicate).length;
  return matches / rows.length;
}

function normalizeValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : UNKNOWN;
}

function isKnownValue(value: string) {
  return value !== UNKNOWN;
}

function toBoolean(value: string | undefined) {
  return value?.trim().toUpperCase() === 'TRUE';
}

function toNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
