import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  averageIgnoringNull,
  buildChartDates,
  buildDoctorSummary,
  calculateDailyMedicationAdherence,
  getRecordsInVisitPeriod,
  getVisitPeriod
} from "./analytics";
import { addDays, daysBetween, formatJapaneseDate, formatShortDate, todayString } from "./dateUtils";
import { ACTIVITY_OPTIONS, CONDITION_OPTIONS, createDailyRecord, createEmptyAppData, TIME_SLOTS } from "./defaults";
import { loadAppData, normalizeAppData, saveAppData } from "./storage";
import type { AppData, DailyRecord, VisitCycle } from "./types";

type TabKey = "today" | "period" | "visit" | "settings";
type SaveState = "読み込み中" | "保存済み" | "保存中" | "保存エラー";

const TABS: Array<{ id: TabKey; label: string }> = [
  { id: "today", label: "今日" },
  { id: "period", label: "4週間" },
  { id: "visit", label: "受診" },
  { id: "settings", label: "設定" }
];

const formatNullableNumber = (
  value: number | null,
  suffix = "",
  digits = 1,
  emptyLabel = "未入力"
): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return emptyLabel;
  const rounded = Number.isInteger(value) ? value.toLocaleString("ja-JP") : value.toFixed(digits);
  return `${rounded}${suffix}`;
};

const formatPercent = (value: number | null): string => formatNullableNumber(value, "%", 0, "記録なし");

const formatPeriod = (visitCycle: VisitCycle): string => {
  const period = getVisitPeriod(visitCycle);
  if (!period) return "受診日を設定してください";
  return `${formatJapaneseDate(period.startDate)}〜${formatJapaneseDate(period.endDate)}`;
};

const formatDaysUntil = (nextVisitDate: string | null): string => {
  if (!nextVisitDate) return "未設定";
  const difference = daysBetween(todayString(), nextVisitDate);
  if (difference < 0) return "更新してください";
  if (difference === 0) return "今日";
  return `あと${difference}日`;
};

const getRecordByDate = (records: DailyRecord[], date: string): DailyRecord | null =>
  records.find((record) => record.date === date) ?? null;

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [data, setData] = useState<AppData | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("読み込み中");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const currentDate = todayString();

  useEffect(() => {
    loadAppData()
      .then((loadedData) => {
        setData(loadedData);
        setSaveState("保存済み");
      })
      .catch((error: unknown) => {
        console.error(error);
        setData(createEmptyAppData());
        setErrorMessage("保存データの読み込みに失敗したため、空のデータで開始しました。");
        setSaveState("保存エラー");
      });
  }, []);

  const commitData = (updater: (previous: AppData) => AppData) => {
    setData((previous) => {
      const base = previous ?? createEmptyAppData();
      const next = normalizeAppData(updater(base));
      setSaveState("保存中");
      saveAppData(next)
        .then(() => setSaveState("保存済み"))
        .catch((error: unknown) => {
          console.error(error);
          setSaveState("保存エラー");
          setErrorMessage("保存に失敗しました。ブラウザの空き容量やプライベートブラウズ設定を確認してください。");
        });
      return next;
    });
  };

  const updateTodayRecord = (updater: (record: DailyRecord) => DailyRecord) => {
    commitData((previous) => {
      const existingRecord = getRecordByDate(previous.records, currentDate) ?? createDailyRecord(currentDate);
      const updatedRecord = {
        ...updater(existingRecord),
        date: currentDate,
        updatedAt: new Date().toISOString()
      };
      const nextRecords = previous.records
        .filter((record) => record.date !== currentDate)
        .concat(updatedRecord)
        .sort((a, b) => a.date.localeCompare(b.date));
      return { ...previous, records: nextRecords };
    });
  };

  const updateVisitCycle = (updates: Partial<VisitCycle>) => {
    commitData((previous) => ({
      ...previous,
      visitCycle: {
        ...previous.visitCycle,
        ...updates
      }
    }));
  };

  const todayRecord = useMemo(() => {
    if (!data) return null;
    return getRecordByDate(data.records, currentDate) ?? createDailyRecord(currentDate);
  }, [currentDate, data]);

  const periodRecords = useMemo(() => {
    if (!data) return [];
    return getRecordsInVisitPeriod(data.records, data.visitCycle);
  }, [data]);

  const doctorSummary = useMemo(() => {
    if (!data) return null;
    return buildDoctorSummary(data.records, data.visitCycle);
  }, [data]);

  const chartData = useMemo(() => {
    if (!data) return [];
    const recordMap = new Map(periodRecords.map((record) => [record.date, record]));
    return buildChartDates(data.visitCycle).map((date) => {
      const record = recordMap.get(date);
      return {
        date,
        label: formatShortDate(date),
        conditionScore: record?.condition ?? null,
        activityScore: record?.activityScore ?? null
      };
    });
  }, [data, periodRecords]);

  if (!data || !todayRecord || !doctorSummary) {
    return (
      <main className="app-shell loading-shell">
        <section className="card">
          <p className="eyebrow">読み込み中</p>
          <h1>服薬と受診サマリー</h1>
          <p>端末内の保存データを確認しています。</p>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">診察補助ツール</p>
          <h1>服薬と受診サマリー</h1>
        </div>
        <span className={`save-pill ${saveState === "保存エラー" ? "error" : ""}`}>{saveState}</span>
      </header>

      {errorMessage ? (
        <section className="notice notice-error" role="alert">
          {errorMessage}
        </section>
      ) : null}

      <main className="tab-content">
        {activeTab === "today" ? (
          <TodayTab record={todayRecord} updateRecord={updateTodayRecord} currentDate={currentDate} />
        ) : null}
        {activeTab === "period" ? (
          <PeriodTab data={data} records={periodRecords} chartData={chartData} summary={doctorSummary} />
        ) : null}
        {activeTab === "visit" ? (
          <VisitTab
            visitCycle={data.visitCycle}
            updateVisitCycle={updateVisitCycle}
            summary={doctorSummary}
            records={periodRecords}
          />
        ) : null}
        {activeTab === "settings" ? (
          <SettingsTab data={data} commitData={commitData} setErrorMessage={setErrorMessage} />
        ) : null}
      </main>

      <nav className="bottom-tabs" aria-label="主要画面">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "tab-button active" : "tab-button"}
            aria-label={`${tab.label}タブを開く`}
            aria-current={activeTab === tab.id ? "page" : undefined}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-dot" aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function TodayTab({
  record,
  updateRecord,
  currentDate
}: {
  record: DailyRecord;
  updateRecord: (updater: (record: DailyRecord) => DailyRecord) => void;
  currentDate: string;
}) {
  const medicationRate = calculateDailyMedicationAdherence(record);

  return (
    <div className="screen-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">今日の記録</p>
          <h2>{formatJapaneseDate(currentDate)}</h2>
        </div>
        <div className="hero-number">
          <span>{formatPercent(medicationRate)}</span>
          <small>今日の服薬</small>
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>服薬チェック</h2>
          <p>起床直後･コンサータを含めて、時間帯単位で記録します。</p>
        </div>
        <div className="med-grid">
          {TIME_SLOTS.map((slot) => {
            const medication = record.medications.find((item) => item.timeSlot === slot.id);
            const taken = Boolean(medication?.taken);
            return (
              <button
                key={slot.id}
                type="button"
                className={taken ? "med-button taken" : "med-button"}
                aria-pressed={taken}
                aria-label={`${slot.label}の服薬を${taken ? "未服薬" : "服薬済み"}にする`}
                onClick={() =>
                  updateRecord((previous) => ({
                    ...previous,
                    medications: TIME_SLOTS.map((timeSlot) => {
                      const existing =
                        previous.medications.find((item) => item.timeSlot === timeSlot.id) ??
                        { timeSlot: timeSlot.id, taken: false, takenAt: null };
                      if (timeSlot.id !== slot.id) return existing;
                      const nextTaken = !existing.taken;
                      return {
                        ...existing,
                        taken: nextTaken,
                        takenAt: nextTaken ? new Date().toISOString() : null
                      };
                    })
                  }))
                }
              >
                <span className="med-short">{slot.shortLabel}</span>
                <span>{slot.label}</span>
                <strong>{taken ? "済" : "未"}</strong>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>今日の体調</h2>
          <p>1 = かなり悪い / 3 = 普通 / 5 = かなり良い</p>
        </div>
        <div className="score-grid five-score-grid" role="group" aria-label="今日の体調">
          {CONDITION_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={record.condition === option.id ? "score-button active" : "score-button"}
              aria-pressed={record.condition === option.id}
              aria-label={`体調 ${option.id}、${option.detail}`}
              onClick={() => updateRecord((previous) => ({ ...previous, condition: option.id }))}
            >
              {option.label}
              <span>{option.detail}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>やる気・動ける度</h2>
          <p>1 = ほぼ動けない / 3 = 普通 / 5 = よく動ける</p>
        </div>
        <div className="score-grid five-score-grid" role="group" aria-label="やる気・動ける度">
          {ACTIVITY_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={record.activityScore === option.id ? "score-button active" : "score-button"}
              aria-pressed={record.activityScore === option.id}
              aria-label={`やる気・動ける度 ${option.id}、${option.detail}`}
              onClick={() => updateRecord((previous) => ({ ...previous, activityScore: option.id }))}
            >
              {option.label}
              <span>{option.detail}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <label className="field-label" htmlFor="today-memo">
          メモ
        </label>
        <textarea
          id="today-memo"
          value={record.memo}
          rows={5}
          placeholder="午後から眠気が強かった、診察で相談したいことがある、など"
          onChange={(event) => updateRecord((previous) => ({ ...previous, memo: event.target.value }))}
        />
      </section>
    </div>
  );
}

function PeriodTab({
  data,
  records,
  chartData,
  summary
}: {
  data: AppData;
  records: DailyRecord[];
  chartData: Array<Record<string, string | number | null>>;
  summary: NonNullable<ReturnType<typeof buildDoctorSummary>>;
}) {
  const period = getVisitPeriod(data.visitCycle);
  const kpis = [
    {
      label: "平均やる気・動ける度",
      value: formatNullableNumber(summary.averageActivityScore, "/5", 1, "記録なし"),
      detail: `2以下 ${summary.lowActivityDays}日`
    },
    {
      label: "平均体調",
      value: formatNullableNumber(summary.averageConditionScore, "/5", 1, "記録なし"),
      detail: `2以下 ${summary.badConditionDays}日`
    }
  ];

  return (
    <div className="screen-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">4週間サマリー</p>
          <h2>{period ? formatPeriod(data.visitCycle) : "受診日が未設定です"}</h2>
        </div>
        <div className="hero-number">
          <span>{records.length}</span>
          <small>記録日数</small>
        </div>
      </section>

      {!period ? (
        <section className="notice">
          前回受診日と次回診察日を受診タブで設定すると、対象期間のKPIとグラフを表示します。
        </section>
      ) : null}

      <section className="kpi-grid" aria-label="4週間のKPI">
        {kpis.map((kpi) => (
          <article className="kpi-card" key={kpi.label}>
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
            <small>{kpi.detail}</small>
          </article>
        ))}
      </section>

      <ChartCard
        title="体調の推移"
        data={chartData}
        dataKey="conditionScore"
        domain={[1, 5]}
        suffix="/5"
        color="#f97316"
      />
      <ChartCard
        title="やる気・動ける度の推移"
        data={chartData}
        dataKey="activityScore"
        domain={[1, 5]}
        suffix="/5"
        color="#2563eb"
      />
    </div>
  );
}

function VisitTab({
  visitCycle,
  updateVisitCycle,
  summary,
  records
}: {
  visitCycle: VisitCycle;
  updateVisitCycle: (updates: Partial<VisitCycle>) => void;
  summary: NonNullable<ReturnType<typeof buildDoctorSummary>>;
  records: DailyRecord[];
}) {
  const period = getVisitPeriod(visitCycle);
  const nextVisitIsPast = Boolean(visitCycle.nextVisitDate && visitCycle.nextVisitDate < todayString());

  return (
    <div className="screen-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">次回診察日</p>
          <h2>
            {visitCycle.nextVisitDate
              ? `${formatJapaneseDate(visitCycle.nextVisitDate)}${visitCycle.nextVisitTime ? ` ${visitCycle.nextVisitTime}` : ""}`
              : "受診日を設定してください"}
          </h2>
          <p className={nextVisitIsPast ? "status-text warn" : "status-text"}>
            {nextVisitIsPast ? "次回診察日を更新してください" : formatDaysUntil(visitCycle.nextVisitDate)}
          </p>
        </div>
        <div className="hero-number compact">
          <span>{records.length}</span>
          <small>期間内記録</small>
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>受診日の設定</h2>
          <p>対象期間は前回受診日から次回診察日の前日までです。</p>
        </div>
        <div className="input-grid">
          <DateField
            label="前回受診日"
            value={visitCycle.previousVisitDate}
            onChange={(value) => updateVisitCycle({ previousVisitDate: value })}
          />
          <DateField
            label="次回診察日"
            value={visitCycle.nextVisitDate}
            onChange={(value) => updateVisitCycle({ nextVisitDate: value })}
          />
          <label className="field">
            <span>診察時間</span>
            <input
              type="time"
              value={visitCycle.nextVisitTime ?? ""}
              onChange={(event) => updateVisitCycle({ nextVisitTime: event.target.value || null })}
            />
          </label>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            updateVisitCycle({
              previousVisitDate: todayString(),
              nextVisitDate: addDays(todayString(), 28)
            })
          }
        >
          今日から4週間後の診察として設定する
        </button>
        <label className="field-label" htmlFor="visit-memo">
          診察メモ
        </label>
        <textarea
          id="visit-memo"
          value={visitCycle.visitMemo}
          rows={5}
          placeholder="診察で相談したいこと、薬の相談、生活上の困りごとなど"
          onChange={(event) => updateVisitCycle({ visitMemo: event.target.value })}
        />
      </section>

      <section className="card summary-card">
        <div className="section-heading">
          <h2>診察用サマリー</h2>
          <p>1〜2分で状態を説明するための要約です。</p>
        </div>
        {!period ? (
          <p className="muted">前回受診日と次回診察日を設定すると、診察用サマリーを作成します。</p>
        ) : (
          <>
            <dl className="summary-list">
              <div>
                <dt>対象期間</dt>
                <dd>{formatPeriod(visitCycle)}</dd>
              </div>
              <div>
                <dt>平均やる気・動ける度</dt>
                <dd>{formatNullableNumber(summary.averageActivityScore, "/5", 1, "記録なし")}</dd>
              </div>
              <div>
                <dt>やる気・動ける度 2以下</dt>
                <dd>{summary.lowActivityDays}日</dd>
              </div>
              <div>
                <dt>平均体調</dt>
                <dd>{formatNullableNumber(summary.averageConditionScore, "/5", 1, "記録なし")}</dd>
              </div>
              <div>
                <dt>体調 2以下</dt>
                <dd>{summary.badConditionDays}日</dd>
              </div>
              <div>
                <dt>メモあり</dt>
                <dd>{summary.memoDays}日</dd>
              </div>
            </dl>
          </>
        )}
      </section>
    </div>
  );
}

function SettingsTab({
  data,
  commitData,
  setErrorMessage
}: {
  data: AppData;
  commitData: (updater: (previous: AppData) => AppData) => void;
  setErrorMessage: (message: string | null) => void;
}) {
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `medication-summary-${todayString()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const importedData = normalizeAppData(JSON.parse(await file.text()));
      commitData(() => importedData);
      setErrorMessage(null);
      setImportStatus("アプリ全体のJSONデータをインポートしました。");
    } catch (error) {
      console.error(error);
      setErrorMessage("JSONインポートに失敗しました。ファイル形式を確認してください。");
      setImportStatus(null);
    } finally {
      event.target.value = "";
    }
  };

  const deleteAllData = () => {
    const ok = window.confirm("端末内の全記録を削除します。この操作は取り消せません。続けますか？");
    if (!ok) return;
    commitData(() => createEmptyAppData());
  };

  return (
    <div className="screen-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">設定</p>
          <h2>データ管理と注意書き</h2>
        </div>
        <div className="hero-number compact">
          <span>{data.records.length}</span>
          <small>全記録</small>
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>データ管理</h2>
          <p>端末内保存のデータをJSONで移動できます。</p>
        </div>
        <div className="settings-actions">
          <button type="button" className="primary-button" onClick={exportJson}>
            JSONエクスポート
          </button>
          <label className="file-button">
            JSONインポート
            <input type="file" accept="application/json,.json" onChange={importJson} />
          </label>
          <button type="button" className="danger-button" onClick={deleteAllData}>
            全データ削除
          </button>
        </div>
        <p className="settings-note">
          JSONインポートはアプリ全体のバックアップ復元用です。端末やブラウザを変える前にエクスポートしてください。
        </p>
        {importStatus ? (
          <p className="import-status" role="status">
            {importStatus}
          </p>
        ) : null}
      </section>

      <section className="notice medical-notice">
        <h2>注意書き</h2>
        <p>
          このWebアプリは診察時の説明補助を目的とした記録ツールです。診断や治療方針の決定は医師の判断に従ってください。
        </p>
        <p>未入力やデータなしは0として扱いません。</p>
      </section>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="date" value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} />
    </label>
  );
}

function ChartCard({
  title,
  data,
  dataKey,
  domain,
  suffix,
  color
}: {
  title: string;
  data: Array<Record<string, string | number | null>>;
  dataKey: string;
  domain: [number | string, number | string];
  suffix: string;
  color: string;
}) {
  const availableValues = data.map((item) => item[dataKey] as number | null);
  const average = averageIgnoringNull(availableValues);

  return (
    <section className="card chart-card">
      <div className="section-heading row-heading">
        <div>
          <h2>{title}</h2>
          <p>欠損日は0にせず、線をつなぎません。</p>
        </div>
        <strong>{formatNullableNumber(average, suffix, suffix === "%" || suffix === "歩" || suffix === "bpm" ? 0 : 1, "記録なし")}</strong>
      </div>
      <div className="chart-frame" aria-label={title}>
        {data.length === 0 ? (
          <div className="empty-chart">受診期間を設定するとグラフを表示します。</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -24 }}>
              <CartesianGrid stroke="#cbd5e1" vertical={false} />
              <XAxis dataKey="label" stroke="#334155" tick={{ fontSize: 11, fontWeight: 700 }} interval={6} />
              <YAxis stroke="#334155" tick={{ fontSize: 11, fontWeight: 700 }} domain={domain} />
              <Tooltip content={<ChartTooltip suffix={suffix} />} />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  suffix
}: {
  active?: boolean;
  payload?: Array<{ value?: number | null }>;
  label?: string;
  suffix: string;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? null;
  return (
    <div className="chart-tooltip">
      <span>{label}</span>
      <strong>{formatNullableNumber(value, suffix, suffix === "時間" ? 1 : 0, "未入力")}</strong>
    </div>
  );
}

export default App;
