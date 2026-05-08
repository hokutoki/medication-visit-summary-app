import { createDailyRecord } from "./defaults";
import { normalizeNumberOrNull } from "./storage";
import type { AppData, HealthMetrics } from "./types";

type HealthMetricKey = keyof HealthMetrics;

export type HealthKitImportRecord = {
  date: string;
  health: Partial<Record<HealthMetricKey, number | null>>;
};

export type HealthKitImportParseResult = {
  records: HealthKitImportRecord[];
  ignoredRows: number;
};

export type HealthKitImportMergeResult = {
  data: AppData;
  importedRecords: number;
  updatedRecords: number;
  updatedFields: number;
};

const HEALTH_KEYS: HealthMetricKey[] = [
  "sleepHours",
  "restingHeartRate",
  "averageHeartRate",
  "steps"
];

const isRecordObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const isDateString = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const normalizeHealthValue = (key: HealthMetricKey, value: unknown): number | null => {
  const normalized = normalizeNumberOrNull(value);
  if (normalized === null) return null;
  if (normalized < 0) return null;
  return key === "steps" ? Math.round(normalized) : normalized;
};

const getImportRows = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!isRecordObject(payload)) return [];
  if (Array.isArray(payload.records)) return payload.records;
  if (Array.isArray(payload.metrics)) return payload.metrics;
  if (Array.isArray(payload.healthMetrics)) return payload.healthMetrics;
  return [];
};

export const parseHealthKitImport = (payload: unknown): HealthKitImportParseResult => {
  const rows = getImportRows(payload);
  const records: HealthKitImportRecord[] = [];
  let ignoredRows = 0;

  for (const row of rows) {
    if (!isRecordObject(row) || !isDateString(row.date)) {
      ignoredRows += 1;
      continue;
    }

    const sourceHealth = isRecordObject(row.health) ? row.health : row;
    const health: HealthKitImportRecord["health"] = {};

    for (const key of HEALTH_KEYS) {
      if (hasOwn(sourceHealth, key)) {
        health[key] = normalizeHealthValue(key, sourceHealth[key]);
      }
    }

    if (Object.keys(health).length === 0) {
      ignoredRows += 1;
      continue;
    }

    records.push({ date: row.date, health });
  }

  if (records.length === 0) {
    throw new Error("No valid HealthKit import records found.");
  }

  return { records, ignoredRows };
};

export const mergeHealthKitImport = (
  data: AppData,
  importRecords: HealthKitImportRecord[]
): HealthKitImportMergeResult => {
  const recordsByDate = new Map(data.records.map((record) => [record.date, record]));
  let updatedFields = 0;

  for (const imported of importRecords) {
    const existing = recordsByDate.get(imported.date) ?? createDailyRecord(imported.date);
    const health = { ...existing.health };

    for (const key of HEALTH_KEYS) {
      if (hasOwn(imported.health, key)) {
        health[key] = imported.health[key] ?? null;
        updatedFields += 1;
      }
    }

    recordsByDate.set(imported.date, {
      ...existing,
      health,
      updatedAt: new Date().toISOString()
    });
  }

  return {
    data: {
      ...data,
      records: Array.from(recordsByDate.values()).sort((a, b) => a.date.localeCompare(b.date))
    },
    importedRecords: importRecords.length,
    updatedRecords: new Set(importRecords.map((record) => record.date)).size,
    updatedFields
  };
};
