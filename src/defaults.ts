import type { ActivityScore, AppData, Condition, DailyRecord, MedicationLog, TimeSlot } from "./types";

export const CONDITION_OPTIONS: Array<{ id: Condition; label: string; detail: string }> = [
  { id: 1, label: "1", detail: "かなり悪い" },
  { id: 2, label: "2", detail: "悪い" },
  { id: 3, label: "3", detail: "普通" },
  { id: 4, label: "4", detail: "良い" },
  { id: 5, label: "5", detail: "かなり良い" }
];

export const getConditionLabel = (condition: Condition): string =>
  CONDITION_OPTIONS.find((option) => option.id === condition)?.detail ?? "未設定";

export const ACTIVITY_OPTIONS: Array<{ id: ActivityScore; label: string; detail: string }> = [
  { id: 1, label: "1", detail: "ほぼ動けない" },
  { id: 2, label: "2", detail: "かなり低い" },
  { id: 3, label: "3", detail: "普通" },
  { id: 4, label: "4", detail: "動ける" },
  { id: 5, label: "5", detail: "よく動ける" }
];

export const getActivityLabel = (score: ActivityScore): string =>
  ACTIVITY_OPTIONS.find((option) => option.id === score)?.detail ?? "未設定";

export const TIME_SLOTS: Array<{ id: TimeSlot; label: string; shortLabel: string }> = [
  { id: "wakeConcerta", label: "起床直後･コンサータ", shortLabel: "起" },
  { id: "morning", label: "朝食後", shortLabel: "朝" },
  { id: "lunch", label: "昼食後", shortLabel: "昼" },
  { id: "evening", label: "夕食後", shortLabel: "夕" },
  { id: "bedtime", label: "就寝前", shortLabel: "寝" }
];

export const createDefaultMedications = (): MedicationLog[] =>
  TIME_SLOTS.map((slot) => ({
    timeSlot: slot.id,
    taken: false,
    takenAt: null
  }));

export const createDailyRecord = (date: string): DailyRecord => ({
  date,
  medications: createDefaultMedications(),
  condition: 3,
  activityScore: null,
  memo: "",
  updatedAt: new Date().toISOString()
});

export const createEmptyAppData = (): AppData => ({
  version: 2,
  visitCycle: {
    previousVisitDate: null,
    nextVisitDate: null,
    nextVisitTime: null,
    visitMemo: ""
  },
  records: []
});
