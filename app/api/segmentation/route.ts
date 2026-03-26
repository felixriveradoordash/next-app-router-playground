import {
  readSegmentationRows,
  summarizeSegmentationRows,
} from '#/lib/segmentation-workbench';
import { getSegmentationQuery } from '#/lib/snowflake';
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_LIMIT = 5_000;
const MAX_LIMIT = 50_000;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('limit');
  const parsed = raw ? Number(raw) : DEFAULT_LIMIT;
  const limit = Math.min(
    MAX_LIMIT,
    Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_LIMIT,
  );

  try {
    const rows = await readSegmentationRows(limit);

    return NextResponse.json({
      source: 'snowflake',
      query: getSegmentationQuery(),
      limit,
      returned: rows.length,
      truncated: rows.length >= limit,
      columns: Object.keys(rows[0] ?? {}),
      summary: summarizeSegmentationRows(rows),
      rows,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to query Snowflake';

    return NextResponse.json(
      {
        error: message,
        hint:
          'Set SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER or SNOWFLAKE_USERNAME, SNOWFLAKE_PASSWORD, SNOWFLAKE_WAREHOUSE, and optionally SEGMENTATION_SNOWFLAKE_QUERY in .env.local.',
      },
      { status: 500 },
    );
  }
}
