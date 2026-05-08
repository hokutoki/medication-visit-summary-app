import type { AppData, DailyRecord, MedicationLog, TimeSlot } from "./types";

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
  condition: "normal",
  activityScore: null,
  memo: "",
  updatedAt: new Date().toISOString()
});

export const createEmptyAppData = (): AppData => ({
  version: 1,
  visitCycle: {
    previousVisitDate: null,
    nextVisitDate: null,
    nextVisitTime: null,
    visitMemo: ""
  },
  records: []
});
