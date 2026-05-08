const DATE_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short"
});

export const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const todayString = (): string => toDateInputValue(new Date());

export const parseDateString = (value: string): Date => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const addDays = (value: string, days: number): string => {
  const date = parseDateString(value);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
};

export const formatJapaneseDate = (value: string | null): string => {
  if (!value) return "未設定";
  return DATE_FORMATTER.format(parseDateString(value));
};

export const formatShortDate = (value: string): string => {
  const date = parseDateString(value);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

export const daysBetween = (from: string, to: string): number => {
  const fromDate = parseDateString(from);
  const toDate = parseDateString(to);
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(0, 0, 0, 0);
  return Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000);
};

export const listDatesInclusive = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  let current = startDate;
  while (current <= endDate) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
};
