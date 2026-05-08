export type Condition = 1 | 2 | 3 | 4 | 5;

export type TimeSlot = "wakeConcerta" | "morning" | "lunch" | "evening" | "bedtime";

export type MedicationLog = {
  timeSlot: TimeSlot;
  taken: boolean;
  takenAt?: string | null;
};

export type DailyRecord = {
  date: string;
  medications: MedicationLog[];
  condition: Condition;
  activityScore: number | null;
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
  averageConditionScore: number | null;
  lowActivityDays: number;
  badConditionDays: number;
  memoDays: number;
  notableDays: NotableDay[];
  visitMemo: string;
};
