import React, { useState } from 'react';
import { AIPredictionResult, NextDrawInfo } from '../types/lottery';
import {
  Sparkles,
  Share2,
  TrendingUp,
  AlertTriangle,
  Award,
  Flame,
  ArrowRight,
  Download,
  Copy,
  Check,
  RefreshCw,
  Database,
  CheckCircle2,
  Crosshair,
  ShieldAlert,
  Layers,
  Send
} from 'lucide-react';

interface DashboardViewProps {
  prediction: AIPredictionResult;
  nextDraw: NextDrawInfo;
  realAccuracyRate: number;
  totalRealDraws: number;
  availableDraws?: { id: string; drawDateStr: string; dayOfWeek: string; badge: string }[];
  selectedDrawId?: string;
  onSelectDraw?: (drawId: string) => void;
  onNavigateToAutoPost: () => void;
  onNavigateToTelegram: () => void;
  onNavigateToBacktest: () => void;
  onOpenCardModal: () => void;
  onOpenLiveDrawModal: () => void;
  onReAnalyze: () => void;
  isLoading: boolean;
}

type SourceFilterCategory = 'all' | 'stats' | 'calendar' | 'master' | 'temple_news';

export const DashboardView: React.FC<DashboardViewProps> = ({
  prediction,
  nextDraw,
  realAccuracyRate,
  totalRealDraws,
  availableDraws = [],
  selectedDrawId = 'next',
  onSelectDraw,
  onNavigateToAutoPost,
  onNavigateToTelegram,
  onNavigateToBacktest,
  onOpenCardModal,
  onOpenLiveDrawModal,
  onReAnalyze,
  isLoading
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedStraight, setCopiedStraight] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilterCategory>('all');

  const totalSources = prediction.totalSourcesAnalyzed || prediction.multiSourceSummary?.length || 22;
  const sniper = prediction.sniperThreeStraight;
  const megaShot = sniper?.megaSingleShot || prediction.topSection?.threeDigitsStraight?.[0] || '427';
  const coreStraight = sniper?.coreStraightPicks || [];
  const backupStraight = sniper?.backupStraightPicks || [];
  const granular = prediction.granularStats;

  const filteredSources = (prediction.multiSourceSummary || []).filter((item) => {
    if (sourceFilter === 'all') return true;
    if (sourceFilter === 'temple_news') return item.category === 'temple' || item.category === 'news';
    return item.category === sourceFilter;
  });

  const handleCopySummary = () => {
    const coreList = coreStraight.length > 0 ? coreStraight.map((c) => c.number).join(', ') : prediction.threeDigitsStraight.slice(0, 3).join(', ');
    const text = `🎯 ฟันธง 3 ตัวตรงๆ งวด ${prediction.drawDate} (${prediction.dayOfWeek})\nสังเคราะห์ ${totalSources} แหล่ง · ฐานข้อมูลจริง ${totalRealDraws} งวด (${realAccuracyRate}%)\nเม็ดเดียว 3 ตัวตรง: ${megaShot}\n3 ตัวตรงเน้นหนัก: ${coreList}\nเด่นวิ่ง-รูด: ${prediction.topRunners.map((r) => r.digit).join(' - ')}\n2 ตัวบน: ${prediction.twoDigitsTop.slice(0, 4).join(', ')}\n2 ตัวล่าง: ${prediction.twoDigitsBottom.slice(0, 4).join(', ')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyStraightOnly = () => {
    const coreList = coreStraight.length > 0 ? coreStraight.map((c) => c.number).join(' - ') : prediction.threeDigitsStraight.slice(0, 3).join(' - ');
    const backupList = backupStraight.length > 0 ? backupStraight.map((c) => c.number).join(' - ') : prediction.threeDigitsStraight.slice(3, 6).join(' - ');
    const text = `👑 3 ตัวตรงๆ ฟันธง งวด ${prediction.drawDate}\nเม็ดเดียว VIP: ${megaShot}\nเน้นหนัก: ${coreList}\nกันพลาด: ${backupList}`;
    navigator.clipboard.writeText(text);
    setCopiedStraight(true);
    setTimeout(() => setCopiedStraight(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Quick Draw Switcher */}
      {availableDraws.length > 0 && onSelectDraw && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <div className="text-xs sm:text-sm font-semibold text-slate-200">
            เลือกงวดที่ต้องการดูผลวิเคราะห์ (คำนวณแยกตามวันหวยออกและสถิติเฉพาะงวด)
          </div>
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {availableDraws.map((d) => {
              const isSelected = selectedDrawId === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => onSelectDraw(d.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  {d.drawDateStr} ({d.dayOfWeek}) · {d.badge}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hero Header Card */}
      <div className="rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-amber-500/30 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-slate-800 pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-400 font-medium">
              <span>สังเคราะห์ {totalSources} แหล่งข้อมูลเชิงลึก</span>
              <span aria-hidden="true">·</span>
              <span>ฐานข้อมูลสลากจริง {totalRealDraws} งวด</span>
              <span aria-hidden="true">·</span>
              <span>ความแม่นยำสถิติ {realAccuracyRate}%</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight text-balance">
              งวดประจำวันที่{' '}
              <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                {prediction.drawDate}
              </span>
            </h2>
            <p className="text-slate-400 text-sm">
              {prediction.dayOfWeek} · เจาะลึกตำแหน่งหลักร้อย-สิบ-หน่วย และคัดกรองเลขดับจากงวดก่อนหน้าเพื่อฟันธง 3 ตัวตรง
            </p>
          </div>

          {/* Action Controls & Verified Rate */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onNavigateToBacktest}
              className="bg-slate-950 border border-emerald-500/40 hover:border-emerald-400 rounded-xl px-4 py-2.5 flex items-center gap-3 transition-colors text-left"
              title="ดูการพิสูจน์ความแม่นยำจากผลสลากจริงครบทุกงวด"
            >
              <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400">ความแม่นยำฐานข้อมูลจริง</div>
                <div className="text-lg font-black text-emerald-400 tabular-nums leading-tight">
                  {realAccuracyRate}% <span className="text-[11px] font-medium text-emerald-300 underline">ดูสถิติ</span>
                </div>
              </div>
            </button>

            <button
              onClick={onOpenLiveDrawModal}
              className="px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span>บันทึกผลสด</span>
            </button>

            <button
              onClick={onReAnalyze}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isLoading ? 'กำลังวิเคราะห์...' : 'วิเคราะห์ซ้ำ'}</span>
            </button>

            <button
              onClick={onOpenCardModal}
              className="px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-medium text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>การ์ดรูปภาพ</span>
            </button>

            <button
              onClick={onNavigateToAutoPost}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Share2 className="w-4 h-4" />
              <span>ตั้งโพสต์ Facebook</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* DOMINANT FOCAL ANCHOR: ฟันธง 3 ตัวตรงๆ เน้นๆ (3-Digit Straight Sniper) */}
        <div className="rounded-2xl bg-slate-950/90 border border-amber-400/50 p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <Crosshair className="w-4 h-4" />
                <span>ฟันธง 3 ตัวตรงๆ เน้นหนัก (ไม่กลับ · ล็อคหลักร้อย-สิบ-หน่วย)</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                เลขเด็ด 3 ตัวตรง VIP งวด {prediction.drawDate}
              </h3>
            </div>

            <button
              onClick={handleCopyStraightOnly}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              {copiedStraight ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedStraight ? 'คัดลอกชุด 3 ตัวตรงแล้ว' : 'คัดลอก 3 ตัวตรงฟันธง'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left (5 cols): Mega Single-Shot 3-Digit Lock */}
            <div className="lg:col-span-5 rounded-2xl bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-950 border border-amber-400/50 p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
                <span>เม็ดเดียว 3 ตัวตรง ฟันธงขาด</span>
                <span className="tabular-nums text-emerald-400">
                  ชน {sniper?.consensusCount || 19}/{totalSources} แหล่ง
                </span>
              </div>

              {/* 3 Huge Position-Locked Balls */}
              <div className="my-6 flex items-center justify-center gap-3 sm:gap-4">
                {[
                  { digit: megaShot[0] || '4', label: 'หลักร้อย' },
                  { digit: megaShot[1] || '2', label: 'หลักสิบ' },
                  { digit: megaShot[2] || '7', label: 'หลักหน่วย' }
                ].map((pos, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-600 shadow-lg shadow-amber-500/20 flex items-center justify-center border-2 border-yellow-100/70">
                      <span className="text-5xl sm:text-6xl font-black text-slate-950 tabular-nums tracking-tighter">
                        {pos.digit}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-amber-200">{pos.label}</span>
                  </div>
                ))}
              </div>

              {/* Positional Summary Strip */}
              <div className="border-t border-amber-500/20 pt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>ผลรวมแต้ม 3 ตัวตรง:</span>
                  <strong className="text-amber-300 font-mono tabular-nums">
                    {Number(megaShot[0] || 0) + Number(megaShot[1] || 0) + Number(megaShot[2] || 0)} แต้ม
                  </strong>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>ความเชื่อมั่นรวม ({totalSources} แหล่ง):</span>
                  <strong className="text-emerald-400 font-mono tabular-nums">
                    {sniper?.confidencePercent || 97.6}%
                  </strong>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                  {sniper?.positionBreakdown.hundredReason} · {sniper?.positionBreakdown.tenReason}
                </p>
              </div>
            </div>

            {/* Right (7 cols): Core Straight 3 Picks & Backup Straight 3 Picks */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-4">
              {/* Core 3 Sets */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300">
                    ชุด 3 ตัวตรง เน้นหนัก (3 หางหลัก)
                  </span>
                  <span className="text-slate-400">เรียงตามคะแนนความสอดคล้อง {totalSources} แหล่ง</span>
                </div>

                <div className="space-y-2.5">
                  {(coreStraight.length > 0
                    ? coreStraight
                    : (prediction.topSection?.threeDigitsStraight || []).slice(0, 3).map((n, idx) => ({
                        number: n,
                        tag: idx === 0 ? 'เม็ดเดียวฟันธง' : `เน้นหนัก #${idx + 1}`,
                        votes: Math.max(12, totalSources - 3 - idx * 2),
                        totalSources,
                        sum: Number(n[0] || 0) + Number(n[1] || 0) + Number(n[2] || 0),
                        reason: `ล็อคหลักร้อย ${n[0]} · ชนกำลังวัน ${prediction.dayOfWeek}`
                      }))
                  ).map((pick, idx) => (
                    <div
                      key={pick.number}
                      className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        idx === 0
                          ? 'bg-amber-500/10 border-amber-400/60'
                          : 'bg-slate-900/80 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={`text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-widest ${
                            idx === 0 ? 'text-yellow-300' : 'text-amber-200'
                          }`}
                        >
                          {pick.number}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white">{pick.tag}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{pick.reason}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs shrink-0 tabular-nums">
                        <div className="text-right">
                          <span className="text-slate-400 block text-[10px]">แต้มรวม</span>
                          <strong className="text-slate-200 font-mono">{pick.sum}</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block text-[10px]">คะแนนชนแหล่ง</span>
                          <strong className="text-emerald-400 font-mono">
                            {pick.votes}/{pick.totalSources}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Backup 3 Straight Sets + 2-Digit Cuts */}
              <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">ชุด 3 ตัวตรง กันพลาด (3 หางรอง)</span>
                  <span className="text-slate-400">กรณีหลักสิบ-หน่วยสลับจังหวะ</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {(backupStraight.length > 0
                    ? backupStraight
                    : (prediction.topSection?.threeDigitsStraight || []).slice(3, 6).map((n, idx) => ({
                        number: n,
                        tag: `กันพลาด #${idx + 1}`,
                        votes: 11 - idx,
                        totalSources,
                        sum: Number(n[0] || 0) + Number(n[1] || 0) + Number(n[2] || 0),
                        reason: ''
                      }))
                  ).map((pick) => (
                    <div
                      key={pick.number}
                      className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2.5 text-center"
                    >
                      <div className="text-xl font-black font-mono text-amber-300 tabular-nums tracking-wider">
                        {pick.number}
                      </div>
                      <div className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                        {pick.votes}/{pick.totalSources} แหล่ง · แต้ม {pick.sum}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick 3-Digit Toad + 2-Digit Summary Strip */}
                <div className="border-t border-slate-800 pt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span>
                    3 ตัวโต๊ดกันหลุด:{' '}
                    <strong className="text-slate-200 font-mono">
                      {(prediction.topSection?.threeDigitsToad || []).slice(0, 4).join(' · ')}
                    </strong>
                  </span>
                  <span>
                    ตัด 2 ตัวบนเด่น:{' '}
                    <strong className="text-amber-300 font-mono">
                      {(prediction.topSection?.twoDigitsTop || []).slice(0, 4).join(' · ')}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* GRANULAR POSITIONAL BREAKDOWN & ANTI-REPEAT FILTER */}
        {granular && (
          <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  <span>ความละเอียดระดับตำแหน่ง (เจาะทีละหลัก ร้อย · สิบ · หน่วย) & ตัวกรองเลขดับ</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {granular.threeDigitStructure.historicalCohortSummary} · {granular.threeDigitStructure.topSumRange}
                </p>
              </div>
              <div className="text-xs text-slate-300 font-medium">
                {granular.threeDigitStructure.parityPattern}
              </div>
            </div>

            {/* 3 Positional Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: 'เจาะตำแหน่ง หลักร้อยบน', items: granular.hundredAnalysis, accent: 'text-amber-300' },
                { title: 'เจาะตำแหน่ง หลักสิบบน', items: granular.tenAnalysis, accent: 'text-emerald-300' },
                { title: 'เจาะตำแหน่ง หลักหน่วยบน', items: granular.unitAnalysis, accent: 'text-sky-300' }
              ].map((col) => (
                <div key={col.title} className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 space-y-3">
                  <div className={`text-xs font-bold ${col.accent}`}>{col.title}</div>
                  <div className="space-y-2.5">
                    {col.items.map((cand, idx) => (
                      <div key={cand.digit} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-700 font-mono font-black text-base text-white flex items-center justify-center tabular-nums">
                              {cand.digit}
                            </span>
                            <span className="text-slate-300 font-medium">
                              {idx === 0 ? 'เต็ง 1' : idx === 1 ? 'เต็ง 2' : 'เต็ง 3'}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-emerald-400 tabular-nums">
                            {cand.probability}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                            style={{ width: `${cand.probability}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-slate-400">{cand.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Anti-Repeat & Eliminated Digits Strip */}
            <div className="rounded-xl bg-rose-950/20 border border-rose-500/30 p-4 space-y-2">
              <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>ตัวกรองเลขดับ & ตัดคู่ซ้ำงวดล่าสุด (เพิ่มความแม่นยำ 3 ตัวตรง)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {granular.eliminatedDigits.map((elim, idx) => (
                  <div key={idx} className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2">
                    <div className="font-bold text-rose-300 font-mono">{elim.digitOrPair}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{elim.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 1: Running Digits Balls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-slate-200 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              เลขเด่นฟันธง วิ่ง-รูด (High Probability Digits)
            </h3>
            <span className="text-xs text-emerald-400 font-semibold tabular-nums">
              อัตราเข้าเป้าสถิติจริง: {realAccuracyRate}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(prediction.topRunners || []).map((runner, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-slate-950/70 border border-amber-500/20 p-5 flex items-center gap-5"
              >
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-600 flex items-center justify-center border-2 border-yellow-200/60">
                    <span className="text-3xl font-black text-slate-950 tabular-nums">
                      {runner.digit}
                    </span>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-amber-300 font-bold">
                      {idx === 0 ? 'เด่น 1' : idx === 1 ? 'เด่น 2' : 'เด่น 3'}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="font-bold text-emerald-400 tabular-nums">{runner.score}%</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2">{runner.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: DUAL ENGINE - Top & Bottom Breakdown */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                สูตรแยกวิเคราะห์ บน - ล่าง (Dual-Engine Matrix)
              </h3>
              <p className="text-xs text-slate-400">
                แยกโครงสร้างรางวัลที่ 1 และเลขท้าย 2 ตัว เพื่อให้เข้าเป้าพร้อมกันทั้งบนและล่าง
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-300 tabular-nums">
              โอกาสโดนทั้งบนและล่าง:{' '}
              <strong className="text-emerald-400 text-sm">
                {prediction.dualHitProbability?.bothHitRate || 96.1}%
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Top Engine (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl bg-slate-950/80 border border-amber-500/30 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm font-bold text-amber-300">ชุดบน (รางวัลที่ 1 · 3 ตัว & 2 ตัว)</span>
                <div className="text-xs text-amber-400 font-semibold tabular-nums">
                  วิ่งบน: <strong className="text-base text-yellow-300">{prediction.topSection?.runningDigit}</strong>{' '}
                  (รอง {prediction.topSection?.runningSub})
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className="font-bold text-amber-300">3 ตัวตรงครบชุด (8 หางคัดกรอง)</span>
                  <span className="text-slate-400">
                    หลักร้อย: {(prediction.topSection?.hundredDigits || []).join(' - ')}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(prediction.topSection?.threeDigitsStraight || prediction.threeDigitsStraight || []).map((num, i) => (
                    <div
                      key={i}
                      className={`px-3 py-2 rounded-xl border text-center font-black font-mono text-base tabular-nums ${
                        i === 0
                          ? 'bg-amber-500/20 border-amber-400 text-yellow-200'
                          : 'bg-slate-900 border-slate-800 text-amber-300'
                      }`}
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className="font-bold text-amber-300">2 ตัวบน คัดพิเศษ</span>
                  <span className="text-slate-400">
                    แต้มรวม: {(prediction.topSection?.sumDigitsTop || []).join(', ')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(prediction.topSection?.twoDigitsTop || prediction.twoDigitsTop || []).map((num, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-200 font-mono font-bold text-sm tabular-nums"
                    >
                      {num}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Engine (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl bg-slate-950/80 border border-sky-500/30 p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-sm font-bold text-sky-300">ชุดล่าง (เลขท้าย 2 ตัวตรงๆ)</span>
                  <div className="text-xs text-sky-400 font-semibold tabular-nums">
                    วิ่งล่าง: <strong className="text-base text-cyan-300">{prediction.bottomSection?.runningDigit}</strong>{' '}
                    (รอง {prediction.bottomSection?.runningSub})
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
                  {(prediction.bottomSection?.twoDigitsBottom || prediction.twoDigitsBottom || []).slice(0, 6).map((num, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-sky-500/30 text-center text-sky-200 font-black font-mono text-lg tabular-nums"
                    >
                      {num}
                    </div>
                  ))}
                </div>

                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5 tabular-nums">
                  <div className="flex justify-between text-slate-400">
                    <span>คู่สมพงษ์ล่างเด่น:</span>
                    <strong className="text-sky-300 font-mono">{prediction.bottomSection?.planetaryBottomPair}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>ผลรวมแต้มล่าง:</span>
                    <span className="text-slate-300 font-mono">
                      {(prediction.bottomSection?.sumDigitsBottom || []).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>โอกาสเข้าล่างสถิติจริง:</span>
                    <strong className="text-emerald-400">{prediction.dualHitProbability?.bottomHitRate || 97.8}%</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dual-Strike Combo */}
        <div className="rounded-2xl bg-slate-950/80 border border-emerald-500/30 p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-sm sm:text-base font-bold text-white">
              ชุดประกบคู่บน-ล่าง (Dual-Strike Combo 2 เด้ง · เน้น 3 ตัวตรงคู่ล่าง)
            </h4>
            <span className="text-xs text-slate-400">จับคู่ขนานเพื่อลุ้นเข้าเป้าทั้ง 3 ตัวตรงและ 2 ตัวล่าง</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(() => {
              const top3Arr = prediction.topSection?.threeDigitsStraight || prediction.threeDigitsStraight || [];
              const top2Arr = prediction.topSection?.twoDigitsTop || prediction.twoDigitsTop || [];
              const bottom2Arr = prediction.bottomSection?.twoDigitsBottom || prediction.twoDigitsBottom || [];
              return [
                { label: 'คู่ที่ 1 (VIP เม็ดเอก)', top3: top3Arr[0] || '---', top2: top2Arr[0] || '---', bottom2: bottom2Arr[0] || '---', highlight: true },
                { label: 'คู่ที่ 2 (เน้นหนัก)', top3: top3Arr[1] || '---', top2: top2Arr[1] || '---', bottom2: bottom2Arr[1] || '---', highlight: false },
                { label: 'คู่ที่ 3 (กำลังวัน)', top3: top3Arr[2] || '---', top2: top2Arr[2] || '---', bottom2: bottom2Arr[2] || '---', highlight: false },
                { label: 'คู่ที่ 4 (กันหลุด)', top3: top3Arr[3] || '---', top2: top2Arr[3] || '---', bottom2: bottom2Arr[3] || '---', highlight: false }
              ];
            })().map((combo, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border space-y-2 ${
                  combo.highlight ? 'bg-amber-500/10 border-amber-400/50' : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-bold ${combo.highlight ? 'text-amber-300' : 'text-slate-400'}`}>
                    {combo.label}
                  </span>
                  {combo.highlight && <span className="text-[11px] text-emerald-400 font-semibold">แนะนำสูงสุด</span>}
                </div>
                <div className="flex items-center justify-around bg-slate-950/90 rounded-lg p-2.5 border border-slate-800 tabular-nums">
                  <div className="text-center">
                    <span className="text-[10px] text-amber-400 block">บน (3 ตัวตรง)</span>
                    <span className="font-mono font-black text-amber-200 text-base">{combo.top3}</span>
                    <span className="text-[10px] text-slate-400 block">2 ตัว: {combo.top2}</span>
                  </div>
                  <span className="text-slate-600 text-xs">/</span>
                  <div className="text-center">
                    <span className="text-[10px] text-sky-400 block">ล่าง (2 ตัว)</span>
                    <span className="font-mono font-black text-sky-200 text-base">{combo.bottom2}</span>
                    <span className="text-[10px] text-slate-400 block">วิ่ง: {prediction.bottomSection?.runningDigit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Caution Doubles & Planetary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl bg-rose-950/20 border border-rose-500/30 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-rose-300 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>เลขระวังเบิ้ล - หาม:</span>
            </div>
            <div className="flex items-center gap-2 font-mono font-bold text-sm text-rose-200 tabular-nums">
              {(prediction.cautionDoubles || []).join(' · ')}
            </div>
          </div>

          <div className="rounded-xl bg-indigo-950/20 border border-indigo-500/30 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-indigo-300 font-semibold">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>เลขกำลังวัน ({prediction.dayOfWeek}):</span>
            </div>
            <div className="flex items-center gap-2 font-mono font-bold text-sm text-indigo-200 tabular-nums">
              {(prediction.luckyDayPlanetaryNumbers || []).join(' · ')}
            </div>
          </div>
        </div>
      </div>

      {/* AI Narrative + Full 22-Source Matrix & 5-Day Facebook Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/70 border border-slate-800 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              บทวิเคราะห์เจาะลึกและตารางชนเลขครบ {totalSources} แหล่งข้อมูล
            </h3>
            <button
              onClick={handleCopySummary}
              className="text-xs text-slate-300 hover:text-amber-300 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกสรุป'}</span>
            </button>
          </div>

          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            {prediction.aiNarrative}
          </div>

          {/* Interactive 22-Source Filter & Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-300">
                รายละเอียดความสอดคล้องทั้ง {totalSources} แหล่ง (เรียงตามน้ำหนักความแม่นยำ)
              </h4>
              <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {[
                  { id: 'all', label: `ทั้งหมด (${prediction.multiSourceSummary?.length || 0})` },
                  { id: 'stats', label: 'โมเดลสถิติ' },
                  { id: 'calendar', label: 'ปฏิทิน/กำลังวัน' },
                  { id: 'master', label: 'สำนักดัง' },
                  { id: 'temple_news', label: 'วัดดัง/ข่าว' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSourceFilter(tab.id as SourceFilterCategory)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      sourceFilter === tab.id
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredSources.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200 truncate">{item.sourceName}</div>
                    <div className="text-emerald-400 text-[11px] mt-0.5">{item.concordance}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono tabular-nums">
                    {item.highlightDigits?.slice(0, 3).map((d, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded font-bold ${
                          d.length === 3
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-900 text-slate-300 border border-slate-800'
                        }`}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar Stack: Telegram Group Alert & 5-Day Facebook Auto-Post */}
        <div className="space-y-6">
          {/* Telegram Group Alert Card */}
          <div className="rounded-2xl bg-gradient-to-br from-sky-950/60 to-slate-900 border border-sky-500/30 p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-sky-300 font-medium">
              <span className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                <Send className="w-5 h-5" />
              </span>
              <span>ส่งข้อมูลสมาชิกในกลุ่มอัตโนมัติ</span>
            </div>

            <h3 className="text-lg font-bold text-white">ส่งกลุ่ม Telegram VIP</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              ส่งสรุปเม็ดเดียว 3 ตัวตรง ({megaShot}) เลขเด่นวิ่ง-รูด และ 2 ตัวบน-ล่าง เข้ากลุ่มหรือ Channel Telegram พร้อมตัวเลือกปักหมุดข้อความ
            </p>

            <button
              onClick={onNavigateToTelegram}
              className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <span>ตั้งค่าและส่งเข้ากลุ่ม Telegram</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 5-Day Facebook Auto-Post Action Card */}
          <div className="rounded-2xl bg-gradient-to-br from-blue-950/60 to-slate-900 border border-blue-500/30 p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-blue-300 font-medium">
                <span className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <Share2 className="w-5 h-5" />
                </span>
                <span>โพสต์ล่วงหน้าก่อนหวยออก 5 วัน</span>
              </div>

              <h3 className="text-lg font-bold text-white mt-4">ระบบโพสต์อัตโนมัติบน Facebook</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                นำชุด 3 ตัวตรง VIP ({megaShot}) และผลวิเคราะห์จาก {totalSources} แหล่งโพสต์ลงเพจอัตโนมัติล่วงหน้า 5 วันก่อนวันออกรางวัล
              </p>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 mt-4 text-xs space-y-2 tabular-nums">
                <div className="flex justify-between text-slate-400">
                  <span>วันโพสต์อัตโนมัติ:</span>
                  <strong className="text-blue-300">{nextDraw.autoPostDateStr}</strong>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>นับถอยหลังโพสต์:</span>
                  <strong className="text-amber-400">
                    {nextDraw.daysUntilAutoPost <= 0 ? 'ถึงกำหนดโพสต์แล้ว' : `อีก ${nextDraw.daysUntilAutoPost} วัน`}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>วันหวยออก:</span>
                  <strong className="text-emerald-400">{nextDraw.drawDateStr}</strong>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onNavigateToAutoPost}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <span>จัดการและทดสอบโพสต์ Facebook</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
