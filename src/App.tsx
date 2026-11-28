import React, { useEffect, useMemo, useState } from 'react';
import { Header, AppTab } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { DataInputView } from './components/DataInputView';
import { StatisticsView } from './components/StatisticsView';
import { BacktestingView } from './components/BacktestingView';
import { TelegramGroupView } from './components/TelegramGroupView';
import { LotteryCardModal } from './components/LotteryCardModal';
import {
  LOTTERY_4D_LIST,
  LOTTERY_4D_META_MAP,
  build4DPredictionSummary,
  getAllDefault4DStore,
  getDefault4DDraws,
  getNextDrawInfo4D
} from './data/lottery4DDatabase';
import { AIPrediction4DResult, Lottery4DType, LotteryDraw4D } from './types/lottery';

const LOCAL_DRAWS_STORAGE_KEY = 'ai_4d_draws_store_v2';
const ALL_LOTTERY_KEYS: Lottery4DType[] = ['lao', 'malay', 'vietnam', 'thai', 'baac', 'gsb'];

function readLocalDrawsBackup(): Partial<Record<Lottery4DType, LotteryDraw4D[]>> {
  try {
    const raw = localStorage.getItem(LOCAL_DRAWS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeLocalDrawsBackup(store: Record<Lottery4DType, LotteryDraw4D[]>) {
  try {
    localStorage.setItem(LOCAL_DRAWS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore quota errors cleanly
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [lotteryType, setLotteryType] = useState<Lottery4DType>('lao');
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  const [drawsStore, setDrawsStore] = useState<Record<Lottery4DType, LotteryDraw4D[]>>(() => {
    const defaults = getAllDefault4DStore();
    const localBackup = readLocalDrawsBackup();
    ALL_LOTTERY_KEYS.forEach((t) => {
      if (Array.isArray(localBackup[t]) && localBackup[t]!.length >= 10) {
        defaults[t] = localBackup[t]!;
      }
    });
    return defaults;
  });

  // Non-destructive sync: never let cold-started server seed draws overwrite local imported draws
  useEffect(() => {
    let active = true;
    fetch(`/api/4d/draws?lotteryType=${lotteryType}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active || !data?.success || !Array.isArray(data.draws) || data.draws.length === 0) return;
        const serverDraws: LotteryDraw4D[] = data.draws;

        const localBackup = readLocalDrawsBackup();
        const localDraws: LotteryDraw4D[] = Array.isArray(localBackup[lotteryType])
          ? localBackup[lotteryType]!
          : [];

        const localRealDraws = localDraws.filter((d) => d.source !== 'database');
        const serverRealKeys = new Set(
          serverDraws
            .filter((d) => d.source !== 'database')
            .map((d) => `${d.dateIso}:${d.number4D}`)
        );
        const missingOnServer = localRealDraws.filter(
          (d) => !serverRealKeys.has(`${d.dateIso}:${d.number4D}`)
        );

        const realDates = new Set([
          ...serverDraws.filter((d) => d.source !== 'database').map((d) => d.dateIso),
          ...localRealDraws.map((d) => d.dateIso)
        ]);

        const mergedMap = new Map<string, LotteryDraw4D>();
        for (const item of serverDraws) {
          if (item.source === 'database' && realDates.has(item.dateIso)) continue;
          mergedMap.set(`${item.dateIso}:${item.number4D}`, item);
        }
        for (const item of localRealDraws) {
          mergedMap.set(`${item.dateIso}:${item.number4D}`, item);
        }
        const merged = Array.from(mergedMap.values()).sort((a, b) =>
          b.dateIso.localeCompare(a.dateIso)
        );

        if (missingOnServer.length > 0) {
          fetch('/api/4d/draws/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lotteryType,
              source: missingOnServer[0].source || 'manual',
              items: missingOnServer
            })
          }).catch(() => {});
        }

        setDrawsStore((prev) => {
          const next = { ...prev, [lotteryType]: merged };
          writeLocalDrawsBackup(next);
          return next;
        });
      })
      .catch(() => {
        // Fallback smoothly to initialized default + localStorage draws
      });

    return () => {
      active = false;
    };
  }, [lotteryType]);

  const currentDraws = useMemo(
    () => drawsStore[lotteryType] || getDefault4DDraws(lotteryType),
    [drawsStore, lotteryType]
  );

  const nextDraw = useMemo(() => getNextDrawInfo4D(lotteryType), [lotteryType]);

  const prediction = useMemo<AIPrediction4DResult>(
    () => build4DPredictionSummary(currentDraws, lotteryType, nextDraw),
    [currentDraws, lotteryType, nextDraw]
  );

  const allPredictions = useMemo<Record<Lottery4DType, AIPrediction4DResult>>(() => {
    return {
      lao:
        lotteryType === 'lao'
          ? prediction
          : build4DPredictionSummary(drawsStore.lao, 'lao', getNextDrawInfo4D('lao')),
      malay:
        lotteryType === 'malay'
          ? prediction
          : build4DPredictionSummary(drawsStore.malay, 'malay', getNextDrawInfo4D('malay')),
      vietnam:
        lotteryType === 'vietnam'
          ? prediction
          : build4DPredictionSummary(drawsStore.vietnam, 'vietnam', getNextDrawInfo4D('vietnam')),
      thai:
        lotteryType === 'thai'
          ? prediction
          : build4DPredictionSummary(drawsStore.thai, 'thai', getNextDrawInfo4D('thai')),
      baac:
        lotteryType === 'baac'
          ? prediction
          : build4DPredictionSummary(drawsStore.baac, 'baac', getNextDrawInfo4D('baac')),
      gsb:
        lotteryType === 'gsb'
          ? prediction
          : build4DPredictionSummary(drawsStore.gsb, 'gsb', getNextDrawInfo4D('gsb'))
    };
  }, [lotteryType, prediction, drawsStore]);

  const handleDrawsUpdated = (nextDraws: LotteryDraw4D[]) => {
    setDrawsStore((prev) => {
      const next = { ...prev, [lotteryType]: nextDraws };
      writeLocalDrawsBackup(next);
      return next;
    });
  };

  const handleResetDraws = async () => {
    try {
      const res = await fetch('/api/4d/draws/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotteryType })
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data.draws)) {
        handleDrawsUpdated(data.draws);
        return;
      }
    } catch {
      // Fallback reset locally
    }
    handleDrawsUpdated(getDefault4DDraws(lotteryType));
  };

  const activeMeta = LOTTERY_4D_META_MAP[lotteryType];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header
        nextDraw={nextDraw}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onQuickIngest={() => setActiveTab('ingest')}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Global Lottery Switcher Bar (4 Countries 4D + ธ.ก.ส. & ออมสิน Win-4 -> 3D) */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="font-semibold text-white">{activeMeta.name}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-400">{activeMeta.scheduleLabel}</span>
            <span aria-hidden="true" className="text-slate-600 hidden md:inline">·</span>
            <span className="text-amber-300/90 hidden md:inline">{activeMeta.strictParsingRule}</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full shrink-0">
            {LOTTERY_4D_LIST.map((item) => {
              const isSelected = lotteryType === item.id;
              const activeClass =
                item.accentColor === 'emerald'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : item.accentColor === 'sky'
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : item.accentColor === 'rose'
                      ? 'bg-rose-500 text-white font-semibold'
                      : item.accentColor === 'teal'
                        ? 'bg-teal-400 text-slate-950 font-semibold'
                        : item.accentColor === 'pink'
                          ? 'bg-pink-400 text-slate-950 font-semibold'
                          : 'bg-amber-500 text-slate-950 font-semibold';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLotteryType(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? activeClass
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70 font-medium'
                  }`}
                >
                  {item.shortName}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <DashboardView
            prediction={prediction}
            nextDraw={nextDraw}
            totalDrawsInDb={currentDraws.length}
            onDrawsUpdated={handleDrawsUpdated}
            onNavigateToIngest={() => setActiveTab('ingest')}
            onNavigateToStatistics={() => setActiveTab('statistics')}
            onNavigateToBacktest={() => setActiveTab('backtest')}
            onNavigateToTelegram={() => setActiveTab('telegram')}
            onOpenCardModal={() => setIsCardModalOpen(true)}
          />
        )}

        {activeTab === 'ingest' && (
          <DataInputView
            lotteryType={lotteryType}
            draws={currentDraws}
            onDrawsUpdated={handleDrawsUpdated}
            onResetDraws={handleResetDraws}
            onNavigateToStatistics={() => setActiveTab('statistics')}
          />
        )}

        {activeTab === 'statistics' && (
          <StatisticsView
            draws={currentDraws}
            lotteryType={lotteryType}
          />
        )}

        {activeTab === 'backtest' && (
          <BacktestingView
            draws={currentDraws}
            lotteryType={lotteryType}
            onNavigateToIngest={() => setActiveTab('ingest')}
          />
        )}

        {activeTab === 'telegram' && (
          <TelegramGroupView
            prediction={prediction}
            nextDraw={nextDraw}
            allPredictions={allPredictions}
          />
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto space-y-2">
          <p className="text-slate-400">
            ระบบวิเคราะห์หวยชุด 4 ประเทศ (ลาวพัฒนา · มาเลย์ 4D · เวียดนาม/ฮานอย · ไทย 4D) และสลาก ธ.ก.ส. · ออมสิน (วิน 4 ตัวแตก 3 ตัว)
          </p>
          <p className="text-slate-600">
            คำเตือน: ข้อมูลเป็นการคำนวณความน่าจะเป็นทางสถิติย้อนหลัง 200 งวดและตารางชนเลข 22 แหล่งเท่านั้น โปรดใช้วิจารณญาณในการตัดสินใจ
          </p>
        </div>
      </footer>

      <LotteryCardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        prediction={prediction}
      />
    </div>
  );
}
