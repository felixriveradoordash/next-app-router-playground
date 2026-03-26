import 'server-only';

import snowflake, {
  type Connection,
  type ConnectionOptions,
} from 'snowflake-sdk';

export type SnowflakeRow = Record<string, unknown>;

const DEFAULT_SEGMENTATION_QUERY =
  'SELECT * FROM PRODDB.FELIXRIVERA.NESTLE_ANALYSIS_SAMPLE';

export function getSegmentationQuery() {
  return process.env.SEGMENTATION_SNOWFLAKE_QUERY?.trim()
    ? process.env.SEGMENTATION_SNOWFLAKE_QUERY.trim()
    : DEFAULT_SEGMENTATION_QUERY;
}

export function buildSegmentationQuery(limit?: number) {
  const baseQuery = getSegmentationQuery();

  if (!limit) return baseQuery;

  return `SELECT * FROM (${baseQuery}) AS segmentation_source LIMIT ${limit}`;
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getConnectionOptions(): ConnectionOptions {
  return {
    account: getRequiredEnv('SNOWFLAKE_ACCOUNT'),
    username:
      getOptionalEnv('SNOWFLAKE_USERNAME') ?? getRequiredEnv('SNOWFLAKE_USER'),
    password: getRequiredEnv('SNOWFLAKE_PASSWORD'),
    warehouse: getRequiredEnv('SNOWFLAKE_WAREHOUSE'),
    database: getOptionalEnv('SNOWFLAKE_DATABASE'),
    schema: getOptionalEnv('SNOWFLAKE_SCHEMA'),
    role: getOptionalEnv('SNOWFLAKE_ROLE'),
    clientSessionKeepAlive: true,
  };
}

async function connect() {
  const connection = snowflake.createConnection(getConnectionOptions());
  await connection.connectAsync();
  return connection;
}

async function destroy(connection: Connection) {
  await new Promise<void>((resolve) => {
    connection.destroy(() => resolve());
  });
}

async function withConnection<T>(callback: (connection: Connection) => Promise<T>) {
  const connection = await connect();

  try {
    return await callback(connection);
  } finally {
    await destroy(connection);
  }
}

export async function executeSnowflakeQuery<T extends SnowflakeRow = SnowflakeRow>(
  sqlText: string,
) {
  return withConnection<T[]>((connection) => {
    return new Promise<T[]>((resolve, reject) => {
      connection.execute({
        sqlText,
        rowMode: 'object',
        complete: (error, _statement, rows) => {
          if (error) {
            reject(error);
            return;
          }

          resolve((rows ?? []) as T[]);
        },
      });
    });
  });
}
