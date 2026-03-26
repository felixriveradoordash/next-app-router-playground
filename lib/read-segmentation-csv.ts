import { createReadStream } from 'fs';
import { access } from 'fs/promises';
import { basename, join } from 'path';
import { parse } from 'csv-parse';

export function resolveSegmentationCsvPath(): string {
  const fromEnv = process.env.SEGMENTATION_CSV_PATH?.trim();
  if (fromEnv) return fromEnv;
  return join(process.cwd(), 'data', 'segment-nestle-sample.csv');
}

export async function assertCsvReadable(filePath: string): Promise<void> {
  await access(filePath);
}

export async function readSegmentationCsvRows(
  filePath: string,
  limit: number,
): Promise<Record<string, string>[]> {
  const rows: Record<string, string>[] = [];
  const readStream = createReadStream(filePath);
  const parser = readStream.pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      cast: false,
    }),
  );

  try {
    for await (const row of parser) {
      rows.push(row as Record<string, string>);
      if (rows.length >= limit) {
        readStream.destroy();
        parser.destroy();
        break;
      }
    }
  } catch (e) {
    readStream.destroy();
    parser.destroy();
    throw e;
  }

  return rows;
}

export function csvSourceLabel(filePath: string): string {
  return basename(filePath);
}
