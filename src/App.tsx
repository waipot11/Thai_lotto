import React, { useState, useEffect, useMemo } from 'react';
import { Header, AppTab } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { AnalyzerView } from './components/AnalyzerView';
import { FacebookAutoPostView } from './components/FacebookAutoPostView';
import { TelegramGroupView } from './components/TelegramGroupView';
import { StatisticsView } from './components/StatisticsView';
import { BacktestingView } from './components/BacktestingView';
import { LotteryCardModal } from './components/LotteryCardModal';
import { LiveDrawModal } from './components/LiveDrawModal';
import {
  evaluateRealDatabaseAccuracy,
  getHistoricalDrawsByType,
  generateDynamicLotteryPrediction
} from './data/lotteryHistory';
import {
  LOTTERY_LIST,
  LOTTERY_META_MAP,
  getAvailableDrawsByType,
  getNextDrawInfoByType
} from './data/specialLotteries';
import { getSourcesForDayOfWeek } from './data/sourcesData';
import { AIPredictionResult, LotterySourceItem, LotteryType } from './types/lottery';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [lotteryType, setLotteryType] = useState<LotteryType>('gov');
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isLiveDrawModalOpen, setIsLiveDrawModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoPostEnabled, setIsAutoPostEnabled] = useState(true);
  const [isTelegramEnabled, setIsTelegramEnabled] = useState(true);

  const nextDraw = useMemo(() => getNextDrawInfoByType(lotteryType), [lotteryType]);
  const [sources, setSources] = useState<LotterySourceItem[]>(() => getSourcesForDayOfWeek(nextDraw.dayOfWeek));

  const currentDrawsPool = useMemo(() => getHistoricalDrawsByType(lotteryType), [lotteryType]);
  const currentAccuracyReport = useMemo(
    () => evaluateRealDatabaseAccuracy(currentDrawsPool),
    [currentDrawsPool]
  );

  const [accuracyOverrides, setAccuracyOverrides] = useState<Partial<Record<LotteryType, { rate: number; total: number }>>>({});
  const currentAccuracyRate = accuracyOverrides[lotteryType]?.rate ?? currentAccuracyReport.overallRate;
  const currentTotalDraws = accuracyOverrides[lotteryType]?.total ?? currentAccuracyReport.total;

  // Multi-Draw Switcher Options per lottery type
  const availableDraws = useMemo(
    () => getAvailableDrawsByType(lotteryType, nextDraw),
    [lotteryType, nextDraw]
  );

  const [selectedDrawId, setSelectedDrawId] = useState<string>('next');

  // Dynamic initial prediction state for the active lottery & draw
  const [prediction, setPrediction] = useState<AIPredictionResult>(() =>
    generateDynamicLotteryPrediction(
      nextDraw.drawDateStr,
      nextDraw.dayOfWeek,
      nextDraw.drawDateIso,
      sources,
      lotteryType
    )
  );

  // Precomputed predictions across all 3 lotteries for combined Telegram group alerts
  const allPredictions = useMemo<Record<LotteryType, AIPredictionResult>>(() => {
    const govNext = getNextDrawInfoByType('gov');
    const baacNext = getNextDrawInfoByType('baac');
    const gsbNext = getNextDrawInfoByType('gsb');
    return {
      gov:
        lotteryType === 'gov'
          ? prediction
          : generateDynamicLotteryPrediction(govNext.drawDateStr, govNext.dayOfWeek, govNext.drawDateIso, undefined, 'gov'),
      baac:
        lotteryType === 'baac'
          ? prediction
          : generateDynamicLotteryPrediction(baacNext.drawDateStr, baacNext.dayOfWeek, baacNext.drawDateIso, undefined, 'baac'),
      gsb:
        lotteryType === 'gsb'
          ? prediction
          : generateDynamicLotteryPrediction(gsbNext.drawDateStr, gsbNext.dayOfWeek, gsbNext.drawDateIso, undefined, 'gsb')
    };
  }, [lotteryType, prediction]);

  const handleSelectLotteryType = (nextType: LotteryType) => {
    if (nextType === lotteryType) return;
    setLotteryType(nextType);
    setSelectedDrawId('next');
    const targetNextDraw = getNextDrawInfoByType(nextType);
    const customOnes = sources.filter((s) => s.id.startsWith('custom-'));
    const refreshedSources = [...customOnes, ...getSourcesForDayOfWeek(targetNextDraw.dayOfWeek)];
    setSources(refreshedSources);
    const pred = generateDynamicLotteryPrediction(
      targetNextDraw.drawDateStr,
      targetNextDraw.dayOfWeek,
      targetNextDraw.drawDateIso,
      refreshedSources,
      nextType
    );
    setPrediction(pred);
  };

  const handleSelectDraw = (drawId: string) => {
    setSelectedDrawId(drawId);
    const target = availableDraws.find((d) => d.id === drawId);
    if (target) {
      const customOnes = sources.filter((s) => s.id.startsWith('custom-'));
      const refreshedSources = [...customOnes, ...getSourcesForDayOfWeek(target.dayOfWeek)];
      setSources(refreshedSources);
      const pred = generateDynamicLotteryPrediction(
        target.drawDateStr,
        target.dayOfWeek,
        target.drawDateIso,
        refreshedSources,
        lotteryType
      );
      setPrediction(pred);
    }
  };

  const handleDrawAdded = (newRate: number, newTotal: number) => {
    setAccuracyOverrides((prev) => ({
      ...prev,
      [lotteryType]: { rate: newRate, total: newTotal }
    }));
    const meta = LOTTERY_META_MAP[lotteryType];
    setPrediction((prev) => ({
      ...prev,
      confidenceScore: newRate,
      aiNarrative: `🔬 อัปเดตฐานข้อมูล${meta.name}ในระบบเป็น ${newTotal} งวดแล้ว พบว่าความแม่นยำรวมอยู่ที่ ${newRate}% พร้อมสรุป 3 ตัวตรง VIP จาก ${prev.totalSourcesAnalyzed || 22} แหล่งข้อมูล`
    }));
  };

  // Fetch initial Facebook Auto-Post & Telegram configurations
  useEffect(() => {
    fetch('/api/facebook/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          setIsAutoPostEnabled(data.config.isAutoPostEnabled ?? true);
        }
      })
      .catch((e) => console.error('Error fetching facebook config:', e));

    fetch('/api/telegram/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          setIsTelegramEnabled(data.config.isTelegramEnabled ?? true);
        }
      })
      .catch((e) => console.error('Error fetching telegram config:', e));
  }, []);

  // Run AI Analysis function
  const handleRunAnalysis = async (customNotes: string = '') => {
    setIsLoading(true);
    try {
      const currentTarget = availableDraws.find((d) => d.id === selectedDrawId) || availableDraws[0];
      const response = await fetch('/api/analyze-lottery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotteryType,
          drawDate: currentTarget.drawDateStr,
          dayOfWeek: currentTarget.dayOfWeek,
          sources: sources,
          customNotes: customNotes
        })
      });

      const resData = await response.json();
      if (resData.success && resData.data) {
        setPrediction(resData.data);
        setActiveTab('dashboard');
      }
    } catch (error) {
      console.error('Error analyzing lottery:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const activeMeta = LOTTERY_META_MAP[lotteryType];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Prompt',sans-serif]">
      {/* Header */}
      <Header
        nextDraw={nextDraw}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAutoPostEnabled={isAutoPostEnabled}
        isTelegramEnabled={isTelegramEnabled}
        lotteryShortName={activeMeta.shortName}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Global Lottery Type Selector Bar (รัฐบาล · ธ.ก.ส. · ออมสิน) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="font-semibold text-white">ประเภทสลากที่วิเคราะห์:</span>
            <span className="text-slate-400">{activeMeta.scheduleLabel}</span>
            <span aria-hidden="true" className="text-slate-600 hidden sm:inline">·</span>
            <span className="text-slate-400 hidden sm:inline">{activeMeta.prizeFormatLabel}</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
            {LOTTERY_LIST.map((item) => {
              const isSelected = lotteryType === item.id;
              const activeClass =
                item.id === 'baac'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : item.id === 'gsb'
                    ? 'bg-pink-500 text-slate-950 font-semibold'
                    : 'bg-amber-500 text-slate-950 font-semibold';
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectLotteryType(item.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 ${
                    isSelected
                      ? activeClass
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70 font-medium'
                  }`}
                >
                  {item.shortName === 'รัฐบาล' ? 'สลากรัฐบาล' : `หวย ${item.shortName}`}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <DashboardView
            prediction={prediction}
            nextDraw={nextDraw}
            realAccuracyRate={currentAccuracyRate}
            totalRealDraws={currentTotalDraws}
            availableDraws={availableDraws}
            selectedDrawId={selectedDrawId}
            onSelectDraw={handleSelectDraw}
            onNavigateToAutoPost={() => setActiveTab('autopost')}
            onNavigateToTelegram={() => setActiveTab('telegram')}
            onNavigateToBacktest={() => setActiveTab('backtest')}
            onOpenCardModal={() => setIsCardModalOpen(true)}
            onOpenLiveDrawModal={() => setIsLiveDrawModalOpen(true)}
            onReAnalyze={() => handleRunAnalysis()}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'analyzer' && (
          <AnalyzerView
            sources={sources}
            setSources={setSources}
            nextDraw={nextDraw}
            onRunAnalysis={handleRunAnalysis}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'telegram' && (
          <TelegramGroupView
            prediction={prediction}
            nextDraw={nextDraw}
            allPredictions={allPredictions}
            onEnabledChange={setIsTelegramEnabled}
          />
        )}

        {activeTab === 'autopost' && (
          <FacebookAutoPostView
            prediction={prediction}
            nextDraw={nextDraw}
          />
        )}

        {activeTab === 'statistics' && (
          <StatisticsView
            draws={currentDrawsPool}
            lotteryType={lotteryType}
          />
        )}

        {activeTab === 'backtest' && (
          <BacktestingView
            onOpenLiveDrawModal={() => setIsLiveDrawModalOpen(true)}
            draws={currentDrawsPool}
            lotteryType={lotteryType}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto space-y-2">
          <p className="text-slate-400">
            ระบบวิเคราะห์ความน่าจะเป็นสลากรัฐบาล · หวย ธ.ก.ส. · หวยออมสิน AI (Thai Lottery AI Statistical Analyzer)
          </p>
          <p>
            วิเคราะห์เชิงลึกด้วยแบบจำลองคณิตศาสตร์ความถี่สถิติ ร่วมกับโมเดลสังเคราะห์ข้อความและข้อมูลหลายแหล่ง
          </p>
          <p className="text-slate-600">
            ⚠️ คำเตือน: การเสี่ยงโชคมีความเสี่ยง ข้อมูลในระบบเป็นการคำนวณทางสถิติและความน่าจะเป็นเท่านั้น ไม่มีการการันตีผลรางวัล 100% โปรดใช้วิจารณญาณในการตัดสินใจ
          </p>
        </div>
      </footer>

      {/* Visual Lottery Fortune Card Modal */}
      <LotteryCardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        prediction={prediction}
      />

      {/* Real-Time Live Draw Entry Modal */}
      <LiveDrawModal
        isOpen={isLiveDrawModalOpen}
        onClose={() => setIsLiveDrawModalOpen(false)}
        onDrawAdded={handleDrawAdded}
        currentAccuracyRate={currentAccuracyRate}
        lotteryType={lotteryType}
      />
    </div>
  );
}
