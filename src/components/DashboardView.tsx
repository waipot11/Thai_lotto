import React, { useEffect, useMemo, useState } from 'react';
import {
  AIPrediction4DResult,
  LotteryDraw4D,
  NextDrawInfo,
  PostDrawScorecard,
  Source4DCategory
} from '../types/lottery';
import {
  Target,
  ShieldCheck,
  AlertTriangle,
  PauseCircle,
  Sparkles,
  Download,
  Send,
  BarChart2,
  Sliders,
  Globe,
  Flame,
  BookOpen,
  Table2,
  ListChecks,
  Search,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Award,
  Zap
} from 'lucide-react';

interface DashboardViewProps {
  prediction: AIPrediction4DResult;
  nextDraw: NextDrawInfo;
  totalDrawsInDb: number;
  onDrawsUpdated?: (nextDraws: LotteryDraw4D[]) => void;
  onNavigateToIngest: () => void;
  onNavigateToStatistics: () => void;
  onNavigateToBacktest: () => void;
  onNavigateToTelegram: () => void;
  onOpenCardModal: () => void;
}

type ConsensusSubTab = 'collision' | 'sources' | 'deep_analysis';
type CategoryFilter = 'all' | Source4DCategory;

export const DashboardView: React.FC<DashboardViewProps> = ({
  prediction,
  nextDraw,
  totalDrawsInDb,
  onDrawsUpdated,
  onNavigateToIngest,
  onNavigateToStatistics,
  onNavigateToBacktest,
  onNavigateToTelegram,
  onOpenCardModal
}) => {
  const cb = prediction.circuitBreaker;
  const isWin4Mode = prediction.strategyMode === 'win4_3d';
  const digits = isWin4Mode
    ? prediction.win4Breakdown.coreDigits4
    : prediction.superNumber4D.split('');
  const positionNames = isWin4Mode
    ? ['แกนวิน 1', 'แกนวิน 2', 'แกนวิน 3', 'แกนวิน 4']
    : ['หลักพัน', 'หลักร้อย', 'หลักสิบ', 'หลักหน่วย'];

  const [consensusTab, setConsensusTab] = useState<ConsensusSubTab>('collision');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sourceQuery, setSourceQuery] = useState('');
  const [copied24Sets, setCopied24Sets] = useState(false);
  const [copiedHedge, setCopiedHedge] = useState(false);
  const [isVerifyingLatest, setIsVerifyingLatest] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [lastScorecard, setLastScorecard] = useState<PostDrawScorecard | null>(null);

  useEffect(() => {
    setLastScorecard(null);
    setVerifyNotice(null);
  }, [prediction.lotteryType]);

  const handleCopy24Sets = () => {
    const text = prediction.win4Breakdown.threeDigitStraight24Sets.join(' ');
    navigator.clipboard.writeText(text);
    setCopied24Sets(true);
    setTimeout(() => setCopied24Sets(false), 2000);
  };

  const handleCopyHedgeSets = () => {
    const hb = prediction.hedgingBreakdown;
    const text = `3 ตัวหน้า: ${hb.threeDigitFront.join(' ')} | 3 ตัวหลัง: ${hb.threeDigitBack.join(' ')} | 2 ตัวหน้า: ${hb.twoDigitFront.join(' ')} | 2 ตัวท้าย: ${hb.twoDigitBack.join(' ')}`;
    navigator.clipboard.writeText(text);
    setCopiedHedge(true);
    setTimeout(() => setCopiedHedge(false), 2000);
  };

  const handleVerifyLatestDraw = async () => {
    setIsVerifyingLatest(true);
    setVerifyNotice(null);
    try {
      const res = await fetch('/api/4d/verify-latest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotteryType: prediction.lotteryType })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถตรวจผลล่าสุดอัตโนมัติได้');
      }
      if (Array.isArray(data.draws) && onDrawsUpdated) {
        onDrawsUpdated(data.draws);
      }
      if (data.scorecard) {
        setLastScorecard(data.scorecard as PostDrawScorecard);
      }
      const latest = data.latestVerified;
      setVerifyNotice({
        ok: true,
        text:
          data.addedCount > 0
            ? `อัปเดตผลจริงงวดล่าสุดแล้ว (${latest?.drawDate}: ${latest?.number4D}) · เพิ่มใหม่ ${data.addedCount} งวดและปรับจูน 22 แหล่งทันที`
            : `ฐานข้อมูลตรงกับงวดล่าสุดแล้ว (${latest?.drawDate}: ${latest?.number4D})`
      });
    } catch (err: any) {
      setVerifyNotice({
        ok: false,
        text: err?.message || 'ตรวจผลอัตโนมัติไม่สำเร็จ'
      });
    } finally {
      setIsVerifyingLatest(false);
    }
  };

  const filteredSources = useMemo(() => {
    return prediction.sources22.filter((src) => {
      if (categoryFilter !== 'all' && src.category !== categoryFilter) return false;
      if (sourceQuery.trim()) {
        const q = sourceQuery.trim().toLowerCase();
        return (
          src.sourceName.toLowerCase().includes(q) ||
          src.candidate4D.includes(q) ||
          src.rationale.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [prediction.sources22, categoryFilter, sourceQuery]);

  const cbVisual =
    cb.status === 'red_pause'
      ? {
          box: 'bg-rose-950/30 border-rose-500/40',
          label: 'text-rose-300',
          icon: <PauseCircle className="w-5 h-5 text-rose-400 shrink-0" />
        }
      : cb.status === 'yellow_nearmiss'
        ? {
            box: 'bg-amber-950/30 border-amber-500/40',
            label: 'text-amber-300',
            icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          }
        : {
            box: 'bg-emerald-950/25 border-emerald-500/35',
            label: 'text-emerald-300',
            icon: <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          };

  return (
    <div className="space-y-6">
      {/* Hero Section: Super Number 4D + Circuit Breaker Decision */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800 pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="text-amber-400 font-semibold">{prediction.lotteryName}</span>
              <span aria-hidden="true">·</span>
              <span>งวด {nextDraw.drawDateStr} ({nextDraw.dayOfWeek})</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">ฐานข้อมูล {totalDrawsInDb} งวด</span>
              <span aria-hidden="true">·</span>
              <span className="text-sky-300 font-medium tabular-nums">
                ชนเลขครบ {prediction.totalSourcesAnalyzed} แหล่งข้อมูล
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {isWin4Mode
                ? `วิน 4 ตัว แตก 3 ตัว 24 ชุด & 4 ชุดเน้น · ตารางชน ${prediction.totalSourcesAnalyzed} แหล่ง`
                : `Super Number 4 ตัวเม็ดเดียว & ตารางชน ${prediction.totalSourcesAnalyzed} แหล่งข้อมูล`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
              {prediction.narrative}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleVerifyLatestDraw}
              disabled={isVerifyingLatest}
              className="px-3.5 py-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {isVerifyingLatest ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>{isVerifyingLatest ? 'กำลังตรวจผล...' : 'ตรวจผลล่าสุด AI'}</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToIngest}
              className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Globe className="w-4 h-4" />
              <span>ดึงผล AI / อัปเดตสถิติ</span>
            </button>
            <button
              type="button"
              onClick={onOpenCardModal}
              className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>{isWin4Mode ? 'แชร์การ์ดวงวิน 4 ตัว' : 'แชร์การ์ด 4D'}</span>
            </button>
          </div>
        </div>

        {verifyNotice && (
          <div
            className={`rounded-xl border px-4 py-2.5 text-xs flex items-center justify-between gap-2 ${
              verifyNotice.ok
                ? 'bg-emerald-950/35 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/35 border-rose-500/40 text-rose-200'
            }`}
          >
            <span>{verifyNotice.text}</span>
            <button
              type="button"
              onClick={() => setVerifyNotice(null)}
              className="text-slate-400 hover:text-white cursor-pointer shrink-0"
            >
              ปิด
            </button>
          </div>
        )}

        {lastScorecard && (
          <div
            className={`rounded-2xl border p-4 sm:p-5 space-y-3 ${
              lastScorecard.hitStatus === 'exact_focus' ||
              lastScorecard.hitStatus === 'hit_4d' ||
              lastScorecard.hitStatus === 'hit_24'
                ? 'bg-emerald-950/35 border-emerald-500/45'
                : lastScorecard.hitStatus === 'hit_2d' || lastScorecard.hitStatus === 'near_miss'
                  ? 'bg-amber-950/30 border-amber-500/40'
                  : 'bg-slate-950/75 border-slate-700'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white">
                <Award className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Post-Draw Scorecard · เทียบผลจริงงวด {lastScorecard.drawDate}</span>
              </div>
              <button
                type="button"
                onClick={() => setLastScorecard(null)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ซ่อนรายงาน
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs tabular-nums">
              <div className="md:col-span-4 flex items-center gap-3">
                <div>
                  <div className="text-[11px] text-slate-400">ผลออกจริง 4D (3 ตัวท้าย)</div>
                  <div className="text-xl font-mono font-extrabold text-amber-300 tracking-wider">
                    {lastScorecard.actual4D}{' '}
                    <span className="text-sm text-emerald-300">({lastScorecard.actual3D})</span>
                  </div>
                </div>
              </div>
              <div className="md:col-span-5 space-y-0.5">
                <div className="font-semibold text-white">{lastScorecard.hitMessage}</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  ชุดก่อนออก: {lastScorecard.predictedHeadline} ({lastScorecard.predictedSets.join(' · ')})
                </div>
              </div>
              <div className="md:col-span-3 md:text-right space-y-0.5">
                <div className="text-[11px] text-sky-300 font-semibold font-mono">
                  แหล่งเข้าเป้า ≥2 หลัก: {lastScorecard.matchedSourcesCount22}/22 แหล่ง
                </div>
                {lastScorecard.topMatchedSources.length > 0 && (
                  <div className="text-[11px] text-slate-400 truncate">
                    {lastScorecard.topMatchedSources.slice(0, 2).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Centerpiece Super Number 4D / Win-4 Core + Live KPI Strip */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 bg-slate-950/70 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                <Target className="w-4 h-4" />
                <span>
                  {isWin4Mode
                    ? `แกนวิน 4 ตัวลงทุน (${prediction.win4Breakdown.coreDigits4.join('-')}) & เม็ดเดียว 3 ตัวตรง`
                    : 'ชุดเน้นสูงสุดอันดับ 1 (Super Number 4D)'}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {isWin4Mode
                  ? `เม็ดเดียว 3 ตัว: ${prediction.win4Breakdown.megaThreeStraight} · ชนเฉลี่ย ${prediction.deepAnalysis.averageAgreementOutOf22}/22 แหล่ง · มั่นใจ ${prediction.sniperSets[0]?.confidence || 92}%`
                  : `ความมั่นใจ ${prediction.sniperSets[0]?.confidence || 92}% · ชนเฉลี่ย ${prediction.deepAnalysis.averageAgreementOutOf22}/22 แหล่ง · แต้มรวม ${prediction.sniperSets[0]?.sum}`}
              </span>
            </div>

            {/* 4 Positional Tiles */}
            <div className="grid grid-cols-4 gap-3 sm:gap-4 max-w-md mx-auto">
              {digits.map((dg, idx) => {
                const leader = prediction.deepAnalysis.positionalLeaders[idx];
                const matrixRow = prediction.collisionMatrix.find((r) => r.digit === dg);
                const subVotesText = isWin4Mode
                  ? `ชน ${matrixRow?.uniqueSourcesCount ?? 0}/22 แหล่ง`
                  : leader
                    ? `ชน ${leader.votesOutOf22}/22 แหล่ง`
                    : '';

                return (
                  <div key={idx} className="text-center space-y-1.5">
                    <div className="h-20 sm:h-24 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 font-mono font-extrabold text-4xl sm:text-5xl flex items-center justify-center shadow-lg shadow-amber-500/15 tabular-nums">
                      {dg}
                    </div>
                    <div className="text-[11px] sm:text-xs font-medium text-slate-300">
                      {positionNames[idx]}
                    </div>
                    {subVotesText && (
                      <div className="text-[11px] text-amber-300/90 font-mono tabular-nums">
                        {subVotesText}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {isWin4Mode ? (
              <div className="text-center space-y-1 pt-1">
                <div className="text-xs sm:text-sm font-semibold text-emerald-300 font-mono tabular-nums">
                  4 ชุดเน้น: {prediction.win4Breakdown.threeDigitStraightSets.join(' · ')} (เม็ดเดียว {prediction.win4Breakdown.megaThreeStraight})
                </div>
                <div className="text-xs text-slate-400">
                  {prediction.win4Breakdown.rationale}
                </div>
              </div>
            ) : prediction.hotOutliersSummary.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-amber-200">
                <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  ตรวจพบ Hot Outlier (&ge;2x ค่าเฉลี่ย):{' '}
                  {prediction.hotOutliersSummary
                    .map((h) => `${h.positionLabel} เลข ${h.digit} (${h.ratioToAvg}x)`)
                    .join(' · ')}
                </span>
              </div>
            ) : (
              <div className="text-center text-xs text-slate-400">
                ผสานสถิติ {totalDrawsInDb} งวด + ตารางชนเลข {prediction.totalSourcesAnalyzed} แหล่ง · กระจายตัวเลขทั้ง 4 ชุดเพื่อลดความเสี่ยงซ้ำตำแหน่ง
              </div>
            )}
          </div>

          {/* Right Panel: Circuit Breaker + Defensive Scaling Recommendation */}
          <div className="lg:col-span-5 space-y-4">
            <div className={`rounded-2xl border p-5 space-y-3 ${cbVisual.box}`}>
              <div className="flex items-start gap-3">
                {cbVisual.icon}
                <div className="space-y-1">
                  <div className={`text-xs font-semibold ${cbVisual.label}`}>
                    {cb.statusBadgeText}
                  </div>
                  <div className="text-sm font-bold text-white">{cb.statusTitle}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {cb.defensiveRecommendation}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center tabular-nums">
                <div>
                  <div className="text-[11px] text-slate-400">จำนวนชุดแนะนำ</div>
                  <div className="text-sm font-bold text-white font-mono">{cb.recommendedSetsCount} ชุด</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">งบแนะนำ/งวด</div>
                  <div className="text-sm font-bold text-amber-300 font-mono">{cb.recommendedBudgetBaht} บ.</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">เสถียรภาพ 200 งวด</div>
                  <div className="text-sm font-bold text-emerald-300 font-mono">{prediction.consistencyScore}/100</div>
                </div>
              </div>
            </div>

            {/* Backup 3-Toad & 2-Back */}
            <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">ชุดประคองทุน (3 ตัวโต๊ด & 2 ตัวท้าย)</span>
                <span className="text-slate-400 font-mono tabular-nums">
                  เข้า/เฉียด {prediction.nearMissOrWinRate200}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-[11px] text-slate-400 mb-1">3 ตัวโต๊ดกันพลาด</div>
                  <div className="flex flex-wrap gap-1.5 font-mono">
                    {prediction.backupThreeToad.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-sky-300 font-semibold">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 mb-1">2 ตัวท้ายประคองพอร์ต</div>
                  <div className="flex flex-wrap gap-1.5 font-mono">
                    {prediction.backupTwoBack.map((b) => (
                      <span key={b} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-emerald-300 font-semibold">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dual-Window Momentum (60% 7-Draw vs 40% 200-Draw) & Anchor Digits */}
      {prediction.dualWindowMomentum && (
        <div className="rounded-2xl bg-slate-900/75 border border-slate-800 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="text-xs font-medium text-emerald-400">
                Dual-Window Momentum · 60% ระยะสั้น ({prediction.dualWindowMomentum.recentWindowDraws} งวด) + 40% ฐานสถิติ ({prediction.dualWindowMomentum.longWindowDraws} งวด)
              </div>
              <h2 className="text-lg font-bold text-white">
                ตารางจับเลขไหล & ล็อกเลขยืนพื้น (Anchor Digits) · Pure Math 100%
              </h2>
              <p className="text-xs text-slate-400">
                {prediction.dualWindowMomentum.summaryNote}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums shrink-0">
              <div>
                <div className="text-[11px] text-slate-400 font-sans">Top 3 ({prediction.dualWindowMomentum.recentWindowDraws} งวดล่าสุด)</div>
                <div className="text-sm font-bold text-sky-300">
                  {prediction.dualWindowMomentum.recent7TopDigitsOverall.join(' · ')}
                </div>
              </div>
              <div className="h-7 w-px bg-slate-800" aria-hidden="true" />
              <div>
                <div className="text-[11px] text-slate-400 font-sans">Top 3 ({prediction.dualWindowMomentum.longWindowDraws} งวดหลัก)</div>
                <div className="text-sm font-bold text-slate-200">
                  {prediction.dualWindowMomentum.long200TopDigitsOverall.join(' · ')}
                </div>
              </div>
              <div className="h-7 w-px bg-slate-800" aria-hidden="true" />
              <div>
                <div className="text-[11px] text-slate-400 font-sans">เลขยืนพื้นรวม</div>
                <div className="text-sm font-bold text-amber-300">
                  {prediction.dualWindowMomentum.anchorDigitsOverall.length > 0
                    ? prediction.dualWindowMomentum.anchorDigitsOverall.join(' · ')
                    : 'ไม่มีเลขชน Top 3 ซ้ำ'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 lg:divide-x divide-slate-800/90 tabular-nums">
            {prediction.dualWindowMomentum.perPositionSummary.map((posItem, idx) => (
              <div key={posItem.positionIndex} className={idx > 0 ? 'pt-3 sm:pt-0 lg:pl-4 space-y-2' : 'space-y-2'}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{posItem.positionLabel}</span>
                  {posItem.anchorDigits.length > 0 ? (
                    <span className="font-mono font-bold text-amber-300">
                      ยืนพื้น {posItem.anchorDigits.join(',')} · ล็อก {posItem.lockedSetCount}/4 ชุด
                    </span>
                  ) : (
                    <span className="text-slate-500">ไม่มีเลขยืนพื้นเฉพาะหลัก</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 font-sans">7 งวด (60%):</span>
                  <span className="text-sky-300 font-semibold">{posItem.recent7Top3.join(' · ')}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 font-sans">200 งวด (40%):</span>
                  <span className="text-slate-200 font-semibold">{posItem.long200Top3.join(' · ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy Output: Win-4 -> 24 Sets + 4 Focus Sets (BAAC/GSB) OR 4D Diverse Sniper Sets */}
      {isWin4Mode ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>4 ชุดเน้นหลัก + แตก 3 ตัว 24 ชุด ({prediction.lotteryName})</span>
              </h2>
              <p className="text-xs text-slate-400">
                แกนวิน 4 ตัว ({prediction.win4Breakdown.coreDigits4.join(' - ')}) แตก 3 ตัวตรง 24 ชุด (ไม่รวมเบิ้ล/หาม) เล่นร่วมกับ 4 ชุดเน้นเพื่อคุมทุนและเพิ่มกำไรเมื่อเข้าตัวหลัก
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono tabular-nums">
              เรทบาทละ 1,000 · จุดคุ้มทุน 24 ชุด: 1 ใน 41 งวด
            </div>
          </div>

          {/* 4 Focus Sets (4 ชุดเน้น) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {prediction.win4Breakdown.threeDigitStraightSets.map((num3, idx) => {
              const rank = idx + 1;
              const isActiveUnderScaling =
                cb.recommendedSetsCount === 0 ? false : rank <= cb.recommendedSetsCount;
              const toadRef = prediction.win4Breakdown.threeDigitToadSets[idx] || '-';
              const setConfidence = prediction.sniperSets[idx]?.confidence || Math.max(80, 94 - idx * 3);

              return (
                <div
                  key={`${num3}-${idx}`}
                  className={`rounded-2xl border p-5 space-y-3 transition-colors ${
                    isActiveUnderScaling
                      ? 'bg-slate-900/80 border-amber-500/40'
                      : 'bg-slate-950/50 border-slate-800/70 opacity-65'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      ชุดเน้นที่ {rank}{' '}
                      {rank === 1 && cb.status === 'yellow_nearmiss' && '· เม็ดเดียวประคองพอร์ต'}
                      {rank === 1 && cb.status === 'normal' && '· เม็ดเดียวเน้น'}
                      {cb.status === 'yellow_nearmiss' && rank > 1 && '· งดเล่นชั่วคราว'}
                    </span>
                    <span className="font-mono font-bold text-amber-300 tabular-nums">
                      {setConfidence}%
                    </span>
                  </div>

                  <div className="text-3xl font-mono font-extrabold tracking-[0.22em] text-amber-300 tabular-nums">
                    {num3}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums pt-1 border-t border-slate-800/80">
                    <span>กลุ่มโต๊ด: <strong className="text-sky-300">{toadRef}</strong></span>
                    <span>2 ตัวท้าย: <strong className="text-emerald-300">{num3.slice(-2)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* All 24 Straight Sets (แตก 3 ตัว 24 ชุด) + Optional Backup Strip */}
          <div className="rounded-2xl bg-slate-900/75 border border-slate-800 p-5 space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-white">
                    แตก 3 ตัวตรงครบ 24 ชุด (ไม่รวมเบิ้ล/หาม · จัดเรียงตามคะแนนสถิติ & 22 แหล่ง)
                  </div>
                  <div className="text-xs text-slate-400">
                    กรอบสีทอง = 4 ชุดเน้นหลักสำหรับอัดน้ำหนักเพิ่ม · อีก 20 ชุดเป็นชุดคลุมกันพลาดจากแกนวิน {prediction.win4Breakdown.coreDigits4.join('-')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopy24Sets}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  {copied24Sets ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied24Sets ? 'คัดลอกครบ 24 ชุดแล้ว' : 'คัดลอกทั้ง 24 ชุด'}</span>
                </button>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 font-mono tabular-nums">
                {prediction.win4Breakdown.threeDigitStraight24Sets.map((num3, idx) => {
                  const isFocus = prediction.win4Breakdown.threeDigitStraightSets.includes(num3);
                  return (
                    <div
                      key={`${num3}-${idx}`}
                      className={`py-2 px-1 rounded-lg border text-center transition-colors ${
                        isFocus
                          ? 'bg-amber-500/15 border-amber-400/70 text-amber-300 font-extrabold'
                          : 'bg-slate-950 border-slate-800 text-slate-200 font-semibold'
                      }`}
                    >
                      <div className="text-sm tracking-wider">{num3}</div>
                      <div className="text-[10px] font-sans text-slate-400">
                        {isFocus ? '★ เน้น' : `#${idx + 1}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4 border-t border-slate-800">
              <div className="lg:col-span-7 space-y-2">
                <div className="text-xs font-semibold text-slate-200">
                  ตัวเลือกประคองทุน: วิน 2 ตัว 12 หาง (ไม่รวมเบิ้ล)
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 font-mono tabular-nums">
                  {prediction.win4Breakdown.twoDigitNoDouble12.map((two) => (
                    <div
                      key={two}
                      className="py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-center text-xs font-bold text-emerald-300"
                    >
                      {two}
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4 lg:border-l lg:border-slate-800 lg:pl-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>ชุดกันเบิ้ล / หาม 3 ตัว (จากแกนวิน)</span>
                    </span>
                    <span
                      className={`text-[11px] font-mono tabular-nums font-semibold ${
                        prediction.win4Breakdown.isDoubleRiskElevated
                          ? 'text-amber-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {prediction.win4Breakdown.isDoubleRiskElevated
                        ? `⚠ รอบเบิ้ลมาแรง (เว้น ${prediction.win4Breakdown.doubleGapDraws} งวด · ${prediction.win4Breakdown.recentDoubleRatePct}%)`
                        : `สถิติเบิ้ล 20 งวด: ${prediction.win4Breakdown.recentDoubleRatePct}%`}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 font-mono tabular-nums">
                    {prediction.win4Breakdown.threeDigitDoubleHedgeSets.map((dbl3) => (
                      <div
                        key={dbl3}
                        className={`py-1.5 rounded-lg border text-center text-xs font-bold ${
                          prediction.win4Breakdown.isDoubleRiskElevated
                            ? 'bg-amber-500/15 border-amber-400/50 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-amber-200'
                        }`}
                      >
                        {dbl3}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="text-xs font-semibold text-slate-200">
                    3 ตัวโต๊ด 4 ชุด & กันเบิ้ล 2 ตัว 4 หาง
                  </div>
                  <div className="grid grid-cols-4 gap-2 font-mono tabular-nums">
                    {prediction.win4Breakdown.threeDigitToadSets.map((toad) => (
                      <div
                        key={toad}
                        className="py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-center text-xs font-bold text-sky-300"
                      >
                        {toad}
                      </div>
                    ))}
                    {prediction.win4Breakdown.twoDigitDoubles4.map((dbl) => (
                      <div
                        key={dbl}
                        className="py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-center text-xs font-semibold text-slate-300"
                      >
                        {dbl}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>4 ชุดหัวกะทิ Diverse Sniper (Dual-Window 60/40)</span>
              </h2>
              <p className="text-xs text-slate-400">
                ให้น้ำหนัก 60% จาก 7 งวดล่าสุด + 40% จาก 200 งวด ร่วมกับโหวต 22 แหล่ง · บังคับล็อกเลขยืนพื้นให้อยู่อย่างน้อย 2 ใน 4 ชุด
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono tabular-nums">
              โซนผลรวมเด่น: {prediction.stats.optimalSumMin}–{prediction.stats.optimalSumMax} ({prediction.stats.optimalSumHitRate}%)
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {prediction.sniperSets.map((setItem) => {
              const isActiveUnderScaling =
                cb.recommendedSetsCount === 0 ? false : setItem.rank <= cb.recommendedSetsCount;

              return (
                <div
                  key={setItem.rank}
                  className={`rounded-2xl border p-5 space-y-3 transition-colors ${
                    isActiveUnderScaling
                      ? 'bg-slate-900/80 border-slate-700'
                      : 'bg-slate-950/50 border-slate-800/70 opacity-65'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      ชุดที่ {setItem.rank}{' '}
                      {cb.status === 'yellow_nearmiss' && setItem.rank === 1 && '· เม็ดเดียวประคองพอร์ต'}
                      {cb.status === 'yellow_nearmiss' && setItem.rank > 1 && '· งดเล่นชั่วคราว'}
                    </span>
                    <span className="font-mono font-bold text-amber-300 tabular-nums">
                      {setItem.confidence}%
                    </span>
                  </div>

                  <div className="text-3xl font-mono font-extrabold tracking-[0.18em] text-white tabular-nums">
                    {setItem.number4D}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono tabular-nums">
                    <span>รวม {setItem.sum}</span>
                    <span>·</span>
                    <span>คู่:คี่ {setItem.evenOddRatio}</span>
                    <span>·</span>
                    <span>สูง:ต่ำ {setItem.highLowRatio}</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed pt-1 border-t border-slate-800/80">
                    {setItem.rationale}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hedging Breakdown Panel (แตกชุดกันทุน 3 ตัวเน้น ตัดหน้า-ตัดหลัง & 2 ตัวเด่น หน้า-ท้าย) */}
      {prediction.hedgingBreakdown && (
        <div className="rounded-2xl bg-slate-900/75 border border-slate-800 p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="text-xs font-medium text-sky-400">
                Hedging Breakdown · สกัดจาก 4 ชุดหัวกะทิ ({prediction.sniperSets.map((s) => s.number4D).join(' · ')})
              </div>
              <h2 className="text-lg font-bold text-white">
                แตกชุดกันทุน: ชุด 3 ตัวเน้น (ตัดหน้า-ตัดหลัง) & ชุด 2 ตัวเด่น (หน้า-ท้าย)
              </h2>
            </div>
            <button
              type="button"
              onClick={handleCopyHedgeSets}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {copiedHedge ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedHedge ? 'คัดลอกชุดกันทุนแล้ว' : 'คัดลอกชุดกันทุน'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:divide-x divide-slate-800 tabular-nums">
            {/* 3 ตัวเน้น (ตัดหน้า-ตัดหลัง) */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-sky-300">
                ชุด 3 ตัวเน้น (กันหลุด 4 ตัวตรง)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-400">ตัดหน้า 3 ตัว (ABC)</div>
                  <div className="flex flex-wrap gap-2 font-mono">
                    {prediction.hedgingBreakdown.threeDigitFront.map((num3) => (
                      <span
                        key={`f3-${num3}`}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-sm font-bold text-sky-300"
                      >
                        {num3}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-400">ตัดหลัง 3 ตัว (BCD)</div>
                  <div className="flex flex-wrap gap-2 font-mono">
                    {prediction.hedgingBreakdown.threeDigitBack.map((num3) => (
                      <span
                        key={`b3-${num3}`}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-sm font-bold text-amber-300"
                      >
                        {num3}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 2 ตัวเด่น (หน้า-ท้าย) */}
            <div className="space-y-3 lg:pl-6">
              <div className="text-xs font-semibold text-emerald-300">
                ชุด 2 ตัวเด่น (เล่นกันทุนหน้า-ท้าย)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-400">2 ตัวหน้า (AB)</div>
                  <div className="flex flex-wrap gap-2 font-mono">
                    {prediction.hedgingBreakdown.twoDigitFront.map((num2) => (
                      <span
                        key={`f2-${num2}`}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-sm font-bold text-emerald-300"
                      >
                        {num2}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-400">2 ตัวท้าย (CD)</div>
                  <div className="flex flex-wrap gap-2 font-mono">
                    {prediction.hedgingBreakdown.twoDigitBack.map((num2) => (
                      <span
                        key={`b2-${num2}`}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-sm font-bold text-amber-200"
                      >
                        {num2}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 22-Source Collision Matrix & Deep Analysis Section */}
      <div className="rounded-2xl bg-slate-900/75 border border-slate-800 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="text-xs font-medium text-sky-400 mb-1">
              22-Source Analytical Consensus & Deep Report
            </div>
            <h2 className="text-xl font-bold text-white">
              บทวิเคราะห์เจาะลึกและตารางชนเลขครบ {prediction.totalSourcesAnalyzed} แหล่งข้อมูล
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              ตรวจสอบคะแนนชนเลขแยก 4 ตำแหน่ง 0–9 รายชื่อแหล่งวิเคราะห์ทั้ง 22 สาย และบทสรุปเชิงลึกของ{prediction.lotteryName}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full shrink-0">
            <button
              type="button"
              onClick={() => setConsensusTab('collision')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                consensusTab === 'collision'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>ตารางชนเลข 22 แหล่ง</span>
            </button>
            <button
              type="button"
              onClick={() => setConsensusTab('sources')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                consensusTab === 'sources'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>รายชื่อ 22 แหล่งข้อมูล</span>
            </button>
            <button
              type="button"
              onClick={() => setConsensusTab('deep_analysis')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                consensusTab === 'deep_analysis'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>บทวิเคราะห์เจาะลึก</span>
            </button>
          </div>
        </div>

        {/* Positional Leaders Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 tabular-nums">
          {prediction.deepAnalysis.positionalLeaders.map((leader) => (
            <div
              key={leader.positionLabel}
              className="rounded-xl bg-slate-950/70 border border-slate-800 px-4 py-3 flex items-center justify-between gap-3"
            >
              <div>
                <div className="text-[11px] text-slate-400">{leader.positionLabel} ชนสูงสุด</div>
                <div className="text-xs text-slate-300 mt-0.5">
                  รอง: เลข <span className="font-mono font-bold text-slate-200">{leader.runnerUpDigit}</span> ({leader.runnerUpVotes}/22)
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono font-extrabold text-amber-300 leading-none">
                  {leader.topDigit}
                </div>
                <div className="text-[11px] font-mono text-emerald-400 mt-1">
                  {leader.votesOutOf22}/22 แหล่ง
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sub-view 1: Collision Matrix Table (0-9 across 4 Positions) */}
        {consensusTab === 'collision' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs tabular-nums">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                  <th className="py-3 px-3 font-medium">เลข (0–9)</th>
                  <th className="py-3 px-3 font-medium">หลักพัน (ชน/22)</th>
                  <th className="py-3 px-3 font-medium">หลักร้อย (ชน/22)</th>
                  <th className="py-3 px-3 font-medium">หลักสิบ (ชน/22)</th>
                  <th className="py-3 px-3 font-medium">หลักหน่วย (ชน/22)</th>
                  <th className="py-3 px-3 font-medium text-right">รวมโหวตทุกหลัก</th>
                  <th className="py-3 px-3 font-medium text-right">จำนวนแหล่งที่มีเลขนี้</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {prediction.collisionMatrix.map((row) => (
                  <tr key={row.digit} className="hover:bg-slate-950/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-base text-white">
                      {row.digit}
                    </td>
                    {[0, 1, 2, 3].map((posIdx) => {
                      const count = row.posCounts[posIdx];
                      const isTop = row.isTopConsensusByPos[posIdx];
                      const isOutlier = row.isHotOutlierByPos[posIdx];
                      return (
                        <td key={posIdx} className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono font-semibold ${
                                isTop
                                  ? 'text-amber-300 font-bold'
                                  : count >= 3
                                    ? 'text-slate-100'
                                    : 'text-slate-500'
                              }`}
                            >
                              {count}/22
                            </span>
                            {isTop && (
                              <span className="text-[10px] font-medium text-amber-300">
                                ★ เด่นสุด
                              </span>
                            )}
                            {isOutlier && (
                              <span className="text-[10px] font-medium text-emerald-400">
                                · Hot ≥2x
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-200">
                      {row.totalVotes}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-sky-300">
                      {row.uniqueSourcesCount}/22 แหล่ง
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Sub-view 2: All 22 Sources Directory & Picks */}
        {consensusTab === 'sources' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['all', 'สถิติ & AI', 'โหราศาสตร์ & กำลังวัน', 'สูตรเฉพาะ 4 ประเทศ', 'สำนักเลขชน'] as CategoryFilter[]).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        categoryFilter === cat
                          ? 'bg-sky-500 text-slate-950 font-semibold'
                          : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {cat === 'all' ? 'ทั้งหมด (22)' : cat}
                    </button>
                  )
                )}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={sourceQuery}
                  onChange={(e) => setSourceQuery(e.target.value)}
                  placeholder="ค้นหาชื่อแหล่งหรือเลข 4 ตัว..."
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs tabular-nums">
                <thead className="sticky top-0 bg-slate-950 text-slate-400 border-b border-slate-800 z-10">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">แหล่งข้อมูล (22 สาย)</th>
                    <th className="py-2.5 px-3 font-medium">หมวดหมู่</th>
                    <th className="py-2.5 px-3 font-medium">ชุด 4D ที่ให้</th>
                    <th className="py-2.5 px-3 font-medium">2 ตัวท้าย</th>
                    <th className="py-2.5 px-3 font-medium">ตรง Super 4D</th>
                    <th className="py-2.5 px-3 font-medium">เหตุผลประกอบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredSources.map((src) => (
                    <tr key={src.id} className="hover:bg-slate-950/60 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-100 whitespace-nowrap">
                        {src.sourceName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        <span>{src.category} · </span>
                        <span
                          className={
                            (src.adaptiveMultiplier || 1) >= 1.15
                              ? 'text-emerald-400 font-semibold font-mono'
                              : (src.adaptiveMultiplier || 1) <= 0.85
                                ? 'text-slate-500 font-mono'
                                : 'text-slate-300 font-mono'
                          }
                        >
                          {(src.effectiveWeight || src.weight).toFixed(2)}x ({(src.adaptiveMultiplier || 1).toFixed(2)}x Adaptive)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-sm text-amber-300 tracking-wider">
                        {src.candidate4D}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-300 font-semibold">
                        {src.twoBack}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <span
                          className={
                            src.matchesSuperCount >= 3
                              ? 'text-emerald-400 font-bold'
                              : src.matchesSuperCount >= 2
                                ? 'text-sky-300 font-semibold'
                                : 'text-slate-400'
                          }
                        >
                          ตรง {src.matchesSuperCount}/4 หลัก
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-sm">
                        {src.rationale}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sub-view 3: Deep Analysis Prose Report */}
        {consensusTab === 'deep_analysis' && (
          <div className="space-y-5 divide-y divide-slate-800/80">
            <div className="pt-1 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-amber-300">
                  01. กำลังวัน & โหราศาสตร์ประจำงวด ({prediction.deepAnalysis.dayOfWeekTitle})
                </h3>
                <div className="font-mono text-xs text-slate-200 tabular-nums">
                  เลขกำลังวัน: {prediction.deepAnalysis.dayPlanetaryDigits.join(' · ')}
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {prediction.deepAnalysis.dayOfWeekSummary}
              </p>
            </div>

            <div className="pt-4 space-y-2">
              <h3 className="text-sm font-bold text-emerald-300">
                02. โครงสร้างสถิติ, การจูนเฉพาะสลาก และ Markov คู่เลขต่อเนื่อง ({totalDrawsInDb} งวด)
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {prediction.deepAnalysis.regimeTrendSummary}
              </p>
              {prediction.deepAnalysis.markovTopPairs && prediction.deepAnalysis.markovTopPairs.length > 0 && (
                <div className="text-xs text-amber-200/90 font-mono tabular-nums">
                  คู่เลข Markov เด่นสุด: {prediction.deepAnalysis.markovTopPairs.join(' · ')}
                </div>
              )}
            </div>

            <div className="pt-4 space-y-2">
              <h3 className="text-sm font-bold text-sky-300">
                03. บทสรุปเจาะลึกจากการชนเลขครบ {prediction.totalSourcesAnalyzed} แหล่งข้อมูล (Adaptive Weighting)
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {prediction.deepAnalysis.consensusVerdict}
              </p>
              {prediction.deepAnalysis.adaptiveSummary && (
                <p className="text-xs text-emerald-300/90 leading-relaxed">
                  {prediction.deepAnalysis.adaptiveSummary}
                </p>
              )}
              <div className="text-xs text-slate-400 pt-1">
                คำแนะนำพอร์ตงวดนี้: {cb.defensiveRecommendation}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Navigation Strip to Deep Workflows */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={onNavigateToStatistics}
          className="text-left rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 transition-colors cursor-pointer space-y-1.5"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
            <Sliders className="w-4 h-4" />
            <span>สถิติ 4 หลัก & คัดกรอง 10,000 ชุด</span>
          </div>
          <p className="text-xs text-slate-400">
            ดูกราฟเลขร้อน/เย็นแยก 4 ตำแหน่ง สัดส่วนคู่-คี่ สูง-ต่ำ ผลรวม 0-36 และ Export CSV
          </p>
        </button>

        <button
          type="button"
          onClick={onNavigateToBacktest}
          className="text-left rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 transition-colors cursor-pointer space-y-1.5"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <BarChart2 className="w-4 h-4" />
            <span>ตรวจ Backtest 200 งวด & Drawdown</span>
          </div>
          <p className="text-xs text-slate-400">
            ดูกราฟเส้นสะสมกำไร Win Rate แยกรายสัปดาห์ และผลการทำงานของ Defensive Scaling
          </p>
        </button>

        <button
          type="button"
          onClick={onNavigateToTelegram}
          className="text-left rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 transition-colors cursor-pointer space-y-1.5"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-sky-300">
            <Send className="w-4 h-4" />
            <span>แจ้งเตือนเข้ากลุ่ม Telegram ครบทุกหวย</span>
          </div>
          <p className="text-xs text-slate-400">
            ส่งแนวทาง 4 ประเทศ + วิน 4 ตัว ธ.ก.ส./ออมสิน และตารางชน 22 แหล่งเข้า Telegram อัตโนมัติ
          </p>
        </button>
      </div>
    </div>
  );
};
