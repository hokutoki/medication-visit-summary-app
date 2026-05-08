export type Condition = "good" | "normal" | "bad";

export type TimeSlot = "wakeConcerta" | "morning" | "lunch" | "evening" | "bedtime";

export type MedicationLog = {
  timeSlot: TimeSlot;
  taken: boolean;
  takenAt?: string | null;
};

export type HealthMetrics = {
  sleepHours?: number | null;
  restingHeartRate?: number | null;
  averageHeartRate?: number | null;
  steps?: number | null;
};

export type DailyRecord = {
  date: string;
  medications: MedicationLog[];
  condition: Condition;
  activityScore: number | null;
  health: HealthMetrics;
  memo: string;
  updatedAt: string;
};

export type VisitCycle = {
  previousVisitDate: string | null;
  nextVisitDate: string | null;
  nextVisitTime: string | null;
  visitMemo: string;
};

export type AppData = {
  version: 1;
  visitCycle: VisitCycle;
  records: DailyRecord[];
};

export type VisitPeriod = {
  startDate: string;
  endDate: string;
};

export type NotableDay = {
  date: string;
  reasons: string[];
  record: DailyRecord;
};

export type DoctorSummary = {
  period: VisitPeriod | null;
  medicationAdherence: number | null;
  averageActivityScore: number | null;
  lowActivityDays: number;
  badConditionDays: number;
  averageSleepHours: number | null;
  shortSleepDays: number;
  averageRestingHeartRate: number | null;
  averageSteps: number | null;
  memoDays: number;
  notableDays: NotableDay[];
  visitMemo: string;
};
