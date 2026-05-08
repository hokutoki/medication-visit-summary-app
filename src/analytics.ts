import { addDays, listDatesInclusive } from "./dateUtils";
import { TIME_SLOTS } from "./defaults";
import type { DailyRecord, DoctorSummary, NotableDay, VisitCycle, VisitPeriod } from "./types";

export const getVisitPeriod = (visitCycle: VisitCycle): VisitPeriod | null => {
  if (!visitCycle.previousVisitDate || !visitCycle.nextVisitDate) return null;
  if (visitCycle.nextVisitDate <= visitCycle.previousVisitDate) return null;

  return {
    startDate: visitCycle.previousVisitDate,
    endDate: addDays(visitCycle.nextVisitDate, -1)
  };
};

export const getRecordsInVisitPeriod = (
  records: DailyRecord[],
  visitCycle: VisitCycle
): DailyRecord[] => {
  const period = getVisitPeriod(visitCycle);
  if (!period) return [];
  return records
    .filter((record) => record.date >= period.startDate && record.date <= period.endDate)
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const calculateDailyMedicationAdherence = (record: DailyRecord): number | null => {
  const total = record.medications.length || TIME_SLOTS.length;
  if (total === 0) return null;
  const taken = record.medications.filter((medication) => medication.taken).length;
  return (taken / total) * 100;
};

export const calculateMedicationAdherence = (records: DailyRecord[]): number | null => {
  const total = records.reduce((sum, record) => sum + record.medications.length, 0);
  if (total === 0) return null;
  const taken = records.reduce(
    (sum, record) => sum + record.medications.filter((medication) => medication.taken).length,
    0
  );
  return (taken / total) * 100;
};

export const averageIgnoringNull = (values: Array<number | null | undefined>): number | null => {
  const validValues = values.filter(
    (value): value is number => value !== null && value !== undefined && Number.isFinite(value)
  );
  if (validValues.length === 0) return null;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
};

export const countLowActivityDays = (records: DailyRecord[]): number =>
  records.filter((record) => record.activityScore !== null && record.activityScore <= 3).length;

export const countBadConditionDays = (records: DailyRecord[]): number =>
  records.filter((record) => record.condition === "bad").length;

export const countShortSleepDays = (records: DailyRecord[]): number =>
  records.filter(
    (record) => record.health.sleepHours !== null && record.health.sleepHours !== undefined && record.health.sleepHours < 6
  ).length;

export const getNotableDays = (records: DailyRecord[]): NotableDay[] =>
  records
    .map((record) => {
      const reasons: string[] = [];
      if (record.activityScore !== null && record.activityScore <= 3) {
        reasons.push(`やる気・動ける度 ${record.activityScore}`);
      }
      if (record.condition === "bad") reasons.push("体調「悪い」");
      if (record.health.sleepHours !== null && record.health.sleepHours !== undefined && record.health.sleepHours < 6) {
        reasons.push(`睡眠 ${record.health.sleepHours}時間`);
      }
      if (record.medications.some((medication) => !medication.taken)) reasons.push("服薬忘れあり");
      if (record.memo.trim()) reasons.push("メモあり");
      return { date: record.date, reasons, record };
    })
    .filter((day) => day.reasons.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

export const buildDoctorSummary = (
  records: DailyRecord[],
  visitCycle: VisitCycle
): DoctorSummary => {
  const period = getVisitPeriod(visitCycle);
  const periodRecords = getRecordsInVisitPeriod(records, visitCycle);

  return {
    period,
    medicationAdherence: calculateMedicationAdherence(periodRecords),
    averageActivityScore: averageIgnoringNull(periodRecords.map((record) => record.activityScore)),
    lowActivityDays: countLowActivityDays(periodRecords),
    badConditionDays: countBadConditionDays(periodRecords),
    averageSleepHours: averageIgnoringNull(periodRecords.map((record) => record.health.sleepHours)),
    shortSleepDays: countShortSleepDays(periodRecords),
    averageRestingHeartRate: averageIgnoringNull(
      periodRecords.map((record) => record.health.restingHeartRate)
    ),
    averageSteps: averageIgnoringNull(periodRecords.map((record) => record.health.steps)),
    memoDays: periodRecords.filter((record) => record.memo.trim()).length,
    notableDays: getNotableDays(periodRecords),
    visitMemo: visitCycle.visitMemo
  };
};

export const buildChartDates = (visitCycle: VisitCycle): string[] => {
  const period = getVisitPeriod(visitCycle);
  if (!period) return [];
  return listDatesInclusive(period.startDate, period.endDate);
};
