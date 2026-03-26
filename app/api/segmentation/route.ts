import { NextRequest, NextResponse } from 'next/server';
import {
  assertCsvReadable,
  csvSourceLabel,
  readSegmentationCsvRows,
  resolveSegmentationCsvPath,
} from '#/lib/read-segmentation-csv';
import { summarizeSegmentationRows } from '#/lib/segmentation-workbench';

const DEFAULT_LIMIT = 5_000;
const MAX_LIMIT = 50_000;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('limit');
  const parsed = raw ? Number(raw) : DEFAULT_LIMIT;
  const limit = Math.min(
    MAX_LIMIT,
    Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_LIMIT,
  );

  const filePath = resolveSegmentationCsvPath();

  try {
    await assertCsvReadable(filePath);
  } catch {
    return NextResponse.json(
      {
        error: 'CSV not found',
        path: filePath,
        hint: 'Set SEGMENTATION_CSV_PATH in .env.local or add data/segment-nestle-sample.csv',
      },
      { status: 404 },
    );
  }

  try {
    const rows = await readSegmentationCsvRows(filePath, limit);
    return NextResponse.json({
      source: csvSourceLabel(filePath),
      path: filePath,
      limit,
      returned: rows.length,
      truncated: rows.length >= limit,
      columns: Object.keys(rows[0] ?? {}),
      summary: summarizeSegmentationRows(rows),
      rows,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to parse CSV';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
