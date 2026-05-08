import { createDailyRecord, createDefaultMedications, createEmptyAppData, TIME_SLOTS } from "./defaults";
import type { AppData, Condition, DailyRecord, MedicationLog, TimeSlot } from "./types";

const DB_NAME = "medication-visit-summary";
const STORE_NAME = "app";
const DATA_KEY = "appData";
const LOCAL_STORAGE_KEY = "medication-visit-summary-app-data";

const hasIndexedDb = (): boolean => typeof indexedDB !== "undefined";

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const readFromIndexedDb = async (): Promise<AppData | null> => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(DATA_KEY);
    request.onsuccess = () => resolve(request.result?.value ?? null);
    request.onerror = () => reject(request.error);
  });
};

const writeToIndexedDb = async (data: AppData): Promise<void> => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put({ key: DATA_KEY, value: data });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const normalizeNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const normalizeMedicationLogs = (logs: unknown): MedicationLog[] => {
  const allowedSlots: TimeSlot[] = TIME_SLOTS.map((slot) => slot.id);
  const source = Array.isArray(logs) ? logs : [];

  return allowedSlots.map((slot) => {
    const raw = source.find(
      (item): item is Partial<MedicationLog> =>
        typeof item === "object" && item !== null && (item as Partial<MedicationLog>).timeSlot === slot
    );
    return {
      timeSlot: slot,
      taken: Boolean(raw?.taken),
      takenAt: typeof raw?.takenAt === "string" ? raw.takenAt : null
    };
  });
};

const normalizeCondition = (condition: unknown): Condition => {
  if (condition === "bad") return 2;
  if (condition === "normal") return 3;
  if (condition === "good") return 4;

  const numberValue = Number(condition);
  if (Number.isInteger(numberValue) && numberValue >= 1 && numberValue <= 5) {
    return numberValue as Condition;
  }
  return 3;
};

export const normalizeDailyRecord = (record: unknown): DailyRecord | null => {
  if (typeof record !== "object" || record === null) return null;
  const raw = record as Partial<DailyRecord> & { condition?: unknown };
  if (typeof raw.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) return null;
  const normalizedActivityScore = normalizeNumberOrNull(raw.activityScore);

  const base = createDailyRecord(raw.date);
  return {
    ...base,
    medications: normalizeMedicationLogs(raw.medications),
    condition: normalizeCondition(raw.condition),
    activityScore:
      normalizedActivityScore === null ? null : Math.max(0, Math.min(10, normalizedActivityScore)),
    memo: typeof raw.memo === "string" ? raw.memo : "",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString()
  };
};

export const normalizeAppData = (data: unknown): AppData => {
  const empty = createEmptyAppData();
  if (typeof data !== "object" || data === null) return empty;
  const raw = data as Partial<AppData>;
  const rawVisitCycle =
    typeof raw.visitCycle === "object" && raw.visitCycle !== null ? raw.visitCycle : empty.visitCycle;

  const records = Array.isArray(raw.records)
    ? raw.records
        .map(normalizeDailyRecord)
        .filter((record): record is DailyRecord => record !== null)
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  return {
    version: 1,
    visitCycle: {
      previousVisitDate:
        typeof rawVisitCycle.previousVisitDate === "string" ? rawVisitCycle.previousVisitDate : null,
      nextVisitDate: typeof rawVisitCycle.nextVisitDate === "string" ? rawVisitCycle.nextVisitDate : null,
      nextVisitTime: typeof rawVisitCycle.nextVisitTime === "string" ? rawVisitCycle.nextVisitTime : null,
      visitMemo: typeof rawVisitCycle.visitMemo === "string" ? rawVisitCycle.visitMemo : ""
    },
    records: records.map((record) => ({
      ...record,
      medications: record.medications.length ? record.medications : createDefaultMedications()
    }))
  };
};

export const loadAppData = async (): Promise<AppData> => {
  try {
    if (hasIndexedDb()) {
      const indexedDbData = await readFromIndexedDb();
      if (indexedDbData) return normalizeAppData(indexedDbData);
    }
  } catch (error) {
    console.warn("IndexedDB read failed. Falling back to localStorage.", error);
  }

  const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
  return localData ? normalizeAppData(JSON.parse(localData)) : createEmptyAppData();
};

export const saveAppData = async (data: AppData): Promise<void> => {
  const normalized = normalizeAppData(data);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));

  if (!hasIndexedDb()) return;
  try {
    await writeToIndexedDb(normalized);
  } catch (error) {
    console.warn("IndexedDB write failed. Data remains in localStorage fallback.", error);
  }
};
