import React, { useState, useEffect, useMemo } from 'react';
import { Header, AppTab } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { AnalyzerView } from './components/AnalyzerView';
import { FacebookAutoPostView } from './components/FacebookAutoPostView';
import { LineNotifyView } from './components/LineNotifyView';
import { TelegramGroupView } from './components/TelegramGroupView';
import { StatisticsView } from './components/StatisticsView';
import { BacktestingView } from './components/BacktestingView';
import { LotteryCardModal } from './components/LotteryCardModal';
import { LiveDrawModal } from './components/LiveDrawModal';
import {
  getNextDrawInfo,
  evaluateRealDatabaseAccuracy,
  HISTORICAL_DRAWS,
  generateDynamicLotteryPrediction
} from './data/lotteryHistory';
import { getSourcesForDayOfWeek } from './data/sourcesData';
import { AIPredictionResult, LotterySourceItem } from './types/lottery';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [nextDraw] = useState(getNextDrawInfo());
  const [sources, setSources] = useState<LotterySourceItem[]>(() => getSourcesForDayOfWeek(nextDraw.dayOfWeek));
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isLiveDrawModalOpen, setIsLiveDrawModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoPostEnabled, setIsAutoPostEnabled] = useState(true);
  const [isLineEnabled, setIsLineEnabled] = useState(true);
  const [isTelegramEnabled, setIsTelegramEnabled] = useState(true);

  // Compute live verified accuracy from real database
  const initialReport = useMemo(() => {
    return evaluateRealDatabaseAccuracy(HISTORICAL_DRAWS);
  }, []);

  const [currentAccuracyRate, setCurrentAccuracyRate] = useState<number>(initialReport.overallRate);
  const [currentTotalDraws, setCurrentTotalDraws] = useState<number>(initialReport.total);

  // Multi-Draw Switcher Options (แต่ละงวดแยกสูตรและตัวเลขตามวันออกรางวัล)
  const availableDraws = useMemo(() => [
    {
      id: 'next',
      drawDateStr: nextDraw.drawDateStr, // '16 พฤศจิกายน 2569'
      dayOfWeek: nextDraw.dayOfWeek, // 'วันจันทร์'
      drawDateIso: nextDraw.drawDateIso,
      badge: 'งวดถัดไป'
    },
    {
      id: '2569-11-01',
      drawDateStr: '1 พฤศจิกายน 2569',
      dayOfWeek: 'วันอาทิตย์',
      drawDateIso: '2026-11-01',
      badge: 'งวด 1 พ.ย.'
    },
    {
      id: '2569-10-16',
      drawDateStr: '16 ตุลาคม 2569',
      dayOfWeek: 'วันศุกร์',
      drawDateIso: '2026-10-16',
      badge: 'งวด 16 ต.ค.'
    }
  ], [nextDraw]);

  const [selectedDrawId, setSelectedDrawId] = useState<string>('next');

  // Dynamic initial prediction state for the upcoming draw (using all 22 sources)
  const [prediction, setPrediction] = useState<AIPredictionResult>(() =>
    generateDynamicLotteryPrediction(nextDraw.drawDateStr, nextDraw.dayOfWeek, nextDraw.drawDateIso, sources)
  );

  const handleSelectDraw = (drawId: string) => {
    setSelectedDrawId(drawId);
    const target = availableDraws.find((d) => d.id === drawId);
    if (target) {
      const customOnes = sources.filter((s) => s.id.startsWith('custom-'));
      const refreshedSources = [...customOnes, ...getSourcesForDayOfWeek(target.dayOfWeek)];
      setSources(refreshedSources);
      const pred = generateDynamicLotteryPrediction(target.drawDateStr, target.dayOfWeek, target.drawDateIso, refreshedSources);
      setPrediction(pred);
    }
  };

  const handleDrawAdded = (newRate: number, newTotal: number) => {
    setCurrentAccuracyRate(newRate);
    setCurrentTotalDraws(newTotal);
    setPrediction((prev) => ({
      ...prev,
      confidenceScore: newRate,
      aiNarrative: `🔬 อัปเดตฐานข้อมูลสลากกินแบ่งรัฐบาลจริงในระบบเป็น ${newTotal} งวดแล้ว พบว่าความแม่นยำรวมอยู่ที่ ${newRate}% พร้อมสรุป 3 ตัวตรง VIP จาก ${prev.totalSourcesAnalyzed || 22} แหล่งข้อมูล`
    }));
  };

  // Fetch initial Facebook Auto-Post & LINE Notification configurations
  useEffect(() => {
    fetch('/api/facebook/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          setIsAutoPostEnabled(data.config.isAutoPostEnabled ?? true);
        }
      })
      .catch((e) => console.error('Error fetching facebook config:', e));

    fetch('/api/line/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          setIsLineEnabled(data.config.isLineEnabled ?? true);
        }
      })
      .catch((e) => console.error('Error fetching line config:', e));

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Prompt',sans-serif]">
      {/* Header */}
      <Header
        nextDraw={nextDraw}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAutoPostEnabled={isAutoPostEnabled}
        isLineEnabled={isLineEnabled}
        isTelegramEnabled={isTelegramEnabled}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
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
            onNavigateToLineNotify={() => setActiveTab('linenotify')}
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

        {activeTab === 'linenotify' && (
          <LineNotifyView
            prediction={prediction}
            nextDraw={nextDraw}
            onEnabledChange={setIsLineEnabled}
          />
        )}

        {activeTab === 'telegram' && (
          <TelegramGroupView
            prediction={prediction}
            nextDraw={nextDraw}
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
          <StatisticsView />
        )}

        {activeTab === 'backtest' && (
          <BacktestingView
            onOpenLiveDrawModal={() => setIsLiveDrawModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto space-y-2">
          <p className="text-slate-400">
            ระบบวิเคราะห์ความน่าจะเป็นสลากกินแบ่งรัฐบาล AI (Thai Lottery AI Statistical Analyzer)
          </p>
          <p>
            วิเคราะห์เชิงลึกด้วยแบบจำลองคณิตศาสตร์ความถี่สถิติ 10 ปี ร่วมกับโมเดลสังเคราะห์ข้อความและข้อมูลหลายแหล่ง
          </p>
          <p className="text-slate-600">
            ⚠️ คำเตือน: สลากกินแบ่งรัฐบาลมีความเสี่ยง ข้อมูลในระบบเป็นการคำนวณทางสถิติและความน่าจะเป็นเท่านั้น ไม่มีการการันตีผลรางวัล 100% โปรดใช้วิจารณญาณในการตัดสินใจ
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
      />
    </div>
  );
}
