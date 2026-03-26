import 'server-only';

import {
  buildSegmentationQuery,
  executeSnowflakeQuery,
  getSegmentationQuery,
  type SnowflakeRow,
} from '#/lib/snowflake';

export type SegmentationRow = SnowflakeRow;

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
  source: 'snowflake';
  query: string;
  columns: string[];
  totalRows: number;
  previewRows: SegmentationRow[];
  summary: SegmentationSummary;
};

const UNKNOWN = 'UNKNOWN';

export async function readSegmentationWorkbenchData(
  previewLimit = 12,
): Promise<SegmentationWorkbenchData> {
  const query = getSegmentationQuery();
  const rows = await executeSnowflakeQuery<SegmentationRow>(query);

  return {
    source: 'snowflake',
    query,
    columns: Object.keys(rows[0] ?? {}),
    totalRows: rows.length,
    previewRows: rows.slice(0, previewLimit),
    summary: summarizeSegmentationRows(rows),
  };
}

export async function readSegmentationRows(limit: number) {
  const query = buildSegmentationQuery(limit);
  return executeSnowflakeQuery<SegmentationRow>(query);
}

export function summarizeSegmentationRows(rows: SegmentationRow[]): SegmentationSummary {
  const campaigns = new Set(rows.map((row) => normalizeValue(getValue(row, 'CAMPAIGN_ID'))));
  const brands = new Set(rows.map((row) => normalizeValue(getValue(row, 'L1_BRAND_NAME'))));

  return {
    campaigns: campaigns.size,
    brands: brands.size,
    totalUsers: rows.reduce((sum, row) => sum + toNumber(getValue(row, 'USER_COUNT'), 1), 0),
    uniqueConsumers: new Set(
      rows
        .map((row) => normalizeValue(getValue(row, 'CONSUMER_ID')))
        .filter(isKnownValue),
    ).size,
    modelMatchRate: ratio(rows, (row) => toBoolean(getValue(row, 'GENDER_MODEL_MATCH'))),
    currentDashPassRate: ratio(rows, (row) =>
      toBoolean(getValue(row, 'IS_CURRENT_DASHPASS')),
    ),
    everDashPassRate: ratio(rows, (row) => toBoolean(getValue(row, 'IS_EVER_DASHPASS'))),
    knownGenderRate: ratio(rows, (row) =>
      isKnownValue(normalizeValue(getValue(row, 'GENDER'))),
    ),
    knownEthnicityRate: ratio(rows, (row) =>
      isKnownValue(normalizeValue(getValue(row, 'ETHNICITY'))),
    ),
    knownChildrenRate: ratio(rows, (row) =>
      isKnownValue(normalizeValue(getValue(row, 'PRESENCE_OF_CHILDREN_IND'))),
    ),
    topCampaigns: rollup(rows, 'CAMPAIGN_NAME'),
    topBrands: rollup(rows, 'L1_BRAND_NAME'),
    topGenerations: rollup(rows, 'GENERATION'),
    topIncomeBuckets: rollup(rows, 'INCOME_BUCKET'),
    fillRates: averageFillRates(rows),
  };
}

export function getDisplayValue(row: SegmentationRow, key: string) {
  const value = getValue(row, key);
  if (value === null || typeof value === 'undefined') return '—';

  const text = String(value).trim();
  return text.length > 0 ? text : '—';
}

function getValue(row: SegmentationRow, key: string) {
  const matchedKey = Object.keys(row).find(
    (candidate) => candidate.toUpperCase() === key.toUpperCase(),
  );

  if (!matchedKey) return undefined;
  return row[matchedKey];
}

function rollup(rows: SegmentationRow[], key: string, limit = 5) {
  const counts = new Map<string, SegmentationRollup>();

  for (const row of rows) {
    const label = normalizeValue(getValue(row, key));
    const current = counts.get(label) ?? { label, rows: 0, users: 0 };
    current.rows += 1;
    current.users += toNumber(getValue(row, 'USER_COUNT'), 1);
    counts.set(label, current);
  }

  return Array.from(counts.values())
    .sort((left, right) => right.users - left.users || right.rows - left.rows)
    .slice(0, limit);
}

function averageFillRates(rows: SegmentationRow[]) {
  const fillRateColumns = Object.keys(rows[0] ?? {}).filter((column) =>
    column.toUpperCase().endsWith('_FILL_RATE'),
  );

  return fillRateColumns
    .map((field) => {
      const values = rows
        .map((row) => toNumber(getValue(row, field), Number.NaN))
        .filter((value) => Number.isFinite(value));

      if (!values.length) return null;

      const total = values.reduce((sum, value) => sum + value, 0);
      return { field, rate: total / values.length };
    })
    .filter((value): value is SegmentationFillRate => value !== null)
    .sort((left, right) => right.rate - left.rate);
}

function ratio(rows: SegmentationRow[], predicate: (row: SegmentationRow) => boolean) {
  if (!rows.length) return 0;
  return rows.filter(predicate).length / rows.length;
}

function normalizeValue(value: unknown) {
  if (value === null || typeof value === 'undefined') return UNKNOWN;

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : UNKNOWN;
}

function isKnownValue(value: string) {
  return value !== UNKNOWN;
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  return String(value).trim().toUpperCase() === 'TRUE';
}

function toNumber(value: unknown, fallback: number) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
