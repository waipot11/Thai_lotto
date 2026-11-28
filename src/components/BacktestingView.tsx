import React, { useMemo, useState } from 'react';
import {
  LOTTERY_4D_META_MAP,
  evaluateMultiRegimeBacktest
} from '../data/lottery4DDatabase';
import {
  Backtest4DAuditRow,
  Lottery4DType,
  LotteryDraw4D
} from '../types/lottery';
import {
  Activity,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Search,
  BarChart3,
  CheckCircle2,
  PauseCircle
} from 'lucide-react';

interface BacktestingViewProps {
  draws: LotteryDraw4D[];
  lotteryType: Lottery4DType;
  onNavigateToIngest?: () => void;
}

type AuditFilter = 'all' | 'win' | 'nearmiss' | 'cold' | 'defensive';

export const BacktestingView: React.FC<BacktestingViewProps> = ({
  draws,
  lotteryType,
  onNavigateToIngest
}) => {
  const meta = LOTTERY_4D_META_MAP[lotteryType];
  const [windowSize, setWindowSize] = useState<number>(200);
  const [filterMode, setFilterMode] = useState<AuditFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const report = useMemo(
    () => evaluateMultiRegimeBacktest(draws, lotteryType, windowSize),
    [draws, lotteryType, windowSize]
  );

  const cb = report.circuitBreaker;

  const filteredRows = useMemo<Backtest4DAuditRow[]>(() => {
    return report.auditRows.filter((row) => {
      if (filterMode === 'win' && !row.isWin) return false;
      if (filterMode === 'nearmiss' && !row.isNearMiss) return false;
      if (filterMode === 'cold' && (row.isWin || row.isNearMiss)) return false;
      if (filterMode === 'defensive' && row.circuitBreakerStateAtDraw === 'normal') return false;

      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matches =
          row.actual4D.includes(q) ||
          row.drawDate.toLowerCase().includes(q) ||
          row.sniperSets.some((s) => s.includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [report.auditRows, filterMode, searchTerm]);

  // Build SVG equity curve geometry
  const chartSvg = useMemo(() => {
    const pts = report.equityCurve;
    if (pts.length === 0) return null;

    const width = 920;
    const height = 220;
    const padLeft = 56;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 30;
    const innerW = width - padLeft - padRight;
    const innerH = height - padTop - padBottom;

    const vals = [0, ...pts.map((p) => p.cumulativeProfit)];
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const span = Math.max(1000, maxVal - minVal);

    const toX = (idx: number) =>
      padLeft + (pts.length <= 1 ? innerW / 2 : (idx / (pts.length - 1)) * innerW);
    const toY = (val: number) => padTop + ((maxVal - val) / span) * innerH;

    const polylinePoints = pts.map((p, i) => `${toX(i).toFixed(1)},${toY(p.cumulativeProfit).toFixed(1)}`).join(' ');
    const areaPoints = `${toX(0).toFixed(1)},${toY(0).toFixed(1)} ${polylinePoints} ${toX(pts.length - 1).toFixed(1)},${toY(0).toFixed(1)}`;
    const zeroY = toY(0);

    return {
      width,
      height,
      padLeft,
      padRight,
      zeroY,
      minVal,
      maxVal,
      polylinePoints,
      areaPoints,
      lastProfit: pts[pts.length - 1].cumulativeProfit
    };
  }, [report.equityCurve]);

  const cbColorClasses =
    cb.status === 'red_pause'
      ? {
          wrap: 'bg-rose-950/30 border-rose-500/40',
          badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          title: 'text-rose-200',
          icon: <PauseCircle className="w-5 h-5 text-rose-400 shrink-0" />
        }
      : cb.status === 'yellow_nearmiss'
        ? {
            wrap: 'bg-amber-950/30 border-amber-500/40',
            badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
            title: 'text-amber-200',
            icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          }
        : {
            wrap: 'bg-emerald-950/25 border-emerald-500/35',
            badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
            title: 'text-emerald-200',
            icon: <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          };

  return (
    <div className="space-y-6">
      {/* Header Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="text-xs font-medium text-amber-400 mb-1">
            Multi-Regime Causal Walk-Forward Backtest · {meta.name}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            ทดสอบย้อนหลัง {report.totalEvaluated} งวดล่าสุด & ระบบประคองพอร์ตอัจฉริยะ
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            จำลองคำนวณงวดต่อวดแบบ Zero Look-Ahead (ใช้สถิติก่อนวันออกจริงเท่านั้น) พร้อมตรวจจับ Near-Miss และปรับขนาดเงินทุนอัตโนมัติ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {[50, 100, 200].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWindowSize(w)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer tabular-nums ${
                windowSize === w
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {w} งวดล่าสุด
            </button>
          ))}
          {onNavigateToIngest && (
            <button
              type="button"
              onClick={onNavigateToIngest}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
            >
              + นำเข้าผลย้อนหลังเพิ่ม
            </button>
          )}
        </div>
      </div>

      {/* Near-Miss & Drift Circuit Breaker Banner */}
      <div className={`rounded-2xl border p-5 sm:p-6 space-y-4 ${cbColorClasses.wrap}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              {cbColorClasses.icon}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${cbColorClasses.badge}`}>
                  {cb.statusBadgeText}
                </span>
                <span className="text-xs text-slate-400 tabular-nums">
                  หลุดต่อเนื่องปัจจุบัน {cb.consecutiveMisses} งวด · เฉียดล่าสุด {cb.recentNearMissCount}/3 งวด · ค่าเฉลี่ยหลุดขาดธรรมชาติ {cb.naturalColdStreakAvg} งวด
                </span>
              </div>
              <h2 className={`text-lg font-bold ${cbColorClasses.title}`}>
                {cb.statusTitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {cb.reason}
              </p>
            </div>
          </div>

          <div className="bg-slate-950/75 border border-slate-800 rounded-xl px-4 py-3 shrink-0 min-w-[260px]">
            <div className="text-xs text-slate-400">งบลงทุนแนะนำสำหรับงวดถัดไป</div>
            <div className="text-xl font-bold text-white font-mono tabular-nums mt-0.5">
              {cb.recommendedBudgetBaht.toLocaleString()} บาท{' '}
              <span className="text-xs font-sans font-normal text-slate-400">
                {meta.strategyMode === 'win4_3d'
                  ? '(24 ชุด×10บ. + 4 เน้น×50บ. + 4 กันเบิ้ล×10บ.)'
                  : `(${cb.recommendedSetsCount} ชุด × ${cb.recommendedUnitCostBaht} บ.)`}
              </span>
            </div>
            <div className="text-xs text-amber-300 mt-1">{cb.defensiveRecommendation}</div>
          </div>
        </div>
      </div>

      {/* 5 Key Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 tabular-nums">
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>กำไร/ขาดทุนสุทธิ ({report.totalEvaluated} งวด)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div
            className={`text-2xl font-bold font-mono mt-2 ${
              report.netProfitBaht >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {report.netProfitBaht >= 0 ? '+' : ''}
            {report.netProfitBaht.toLocaleString()} บ.
          </div>
          <div className="text-xs text-slate-500 mt-1">
            ROI: {report.roiPercent >= 0 ? '+' : ''}{report.roiPercent}% · ทุนรวม {report.totalStakedBaht.toLocaleString()} บ.
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Win Rate เข้าเป้า / เกาะกลุ่ม</span>
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {report.winRatePercent}%{' '}
            <span className="text-sm font-normal text-amber-300">
              / {report.nearMissOrWinRatePercent}%
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            เข้าเต็ม {report.totalWinningDraws} งวด · Near-Miss {report.nearMissDraws} งวด
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Max Drawdown สูงสุด</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-300 mt-2">
            -{report.maxDrawdownBaht.toLocaleString()} บ.
          </div>
          <div className="text-xs text-slate-500 mt-1">
            หลุดติดกันสูงสุด {report.maxConsecutiveLosses} งวด (เฉลี่ย {report.naturalLosingStreakAvg} งวด)
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Consistency Score</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-300 mt-2">
            {report.consistencyScore} <span className="text-sm text-slate-500">/ 100</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            ความสม่ำเสมอของสูตรข้ามสัปดาห์
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 col-span-2 lg:col-span-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>{meta.strategyMode === 'win4_3d' ? 'สถิติวิน 4 ตัว / 3D / 2D' : 'สถิติแตกย่อย 4D/3D/2D'}</span>
            <BarChart3 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-mono text-slate-200 mt-2 space-y-1">
            {meta.strategyMode === 'win4_3d' ? (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">แตก 3 ตัวตรง/โต๊ด:</span>
                  <span className="font-bold text-amber-300">{report.win3BackCount} งวด</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">วิน 2 ตัว 12 หาง:</span>
                  <span className="font-bold text-emerald-300">{report.win2BackCount} งวด</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">4 ตัวตรง / โต๊ด:</span>
                  <span className="font-bold text-amber-300">{report.win4StraightCount} / {report.win4ToadCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">3 ตัวท้าย / 2 ตัวท้าย:</span>
                  <span className="font-bold text-emerald-300">{report.win3BackCount} / {report.win2BackCount}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Equity Curve + Weekly Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Equity Curve */}
        <div className="lg:col-span-7 rounded-2xl bg-slate-900/70 border border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">
                กราฟเส้นสะสมกำไร (Equity Curve · {report.totalEvaluated} งวด)
              </h3>
              <p className="text-xs text-slate-400">
                {meta.strategyMode === 'win4_3d'
                  ? 'จำลอง 24 ชุด × 10 บ. + 4 ชุดเน้น × 50 บ. + 4 กันเบิ้ล × 10 บ. = 480 บ./งวด · โหมดระวังลดเหลือ 120 บ.'
                  : 'รวมผลของการลดพอร์ตเหลือ 1 ชุด (120 บ.) อัตโนมัติในช่วง Near-Miss เพื่อประหยัดทุนช่วงผันผวน'}
              </p>
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-300">
              จุดสูงสุด +{Math.max(0, ...report.equityCurve.map((p) => p.cumulativeProfit)).toLocaleString()} บ.
            </div>
          </div>

          {chartSvg ? (
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartSvg.width} ${chartSvg.height}`}
                className="w-full h-56 min-w-[540px]"
                role="img"
                aria-label="กราฟเส้นกำไรสะสมย้อนหลัง"
              >
                <defs>
                  <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartSvg.lastProfit >= 0 ? '#10b981' : '#f43f5e'} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={chartSvg.lastProfit >= 0 ? '#10b981' : '#f43f5e'} stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Zero Baseline */}
                <line
                  x1={chartSvg.padLeft}
                  y1={chartSvg.zeroY}
                  x2={chartSvg.width - chartSvg.padRight}
                  y2={chartSvg.zeroY}
                  stroke="#334155"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={chartSvg.padLeft - 8}
                  y={chartSvg.zeroY + 4}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="11"
                  fontFamily="monospace"
                >
                  0
                </text>
                <text
                  x={chartSvg.padLeft - 8}
                  y="24"
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="11"
                  fontFamily="monospace"
                >
                  {chartSvg.maxVal >= 1000 ? `${Math.round(chartSvg.maxVal / 1000)}k` : chartSvg.maxVal}
                </text>
                <text
                  x={chartSvg.padLeft - 8}
                  y={chartSvg.height - 32}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="11"
                  fontFamily="monospace"
                >
                  {chartSvg.minVal <= -1000 ? `${Math.round(chartSvg.minVal / 1000)}k` : chartSvg.minVal}
                </text>

                <polygon points={chartSvg.areaPoints} fill="url(#eqFill)" />
                <polyline
                  fill="none"
                  stroke={chartSvg.lastProfit >= 0 ? '#34d399' : '#fb7185'}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  points={chartSvg.polylinePoints}
                />
              </svg>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-slate-500">ไม่มีข้อมูลเพียงพอสำหรับวาดกราฟ</div>
          )}
        </div>

        {/* Weekly Win Rate Breakdown */}
        <div className="lg:col-span-5 rounded-2xl bg-slate-900/70 border border-slate-800 p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">Win Rate แยกรายสัปดาห์</h3>
            <p className="text-xs text-slate-400">
              ติดตามเสถียรภาพรายสัปดาห์ (อัตราเข้าเต็ม vs เกาะกลุ่ม Near-Miss)
            </p>
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 tabular-nums">
            {report.weeklyBreakdown.slice(0, 14).map((wk) => (
              <div
                key={wk.weekKey}
                className="flex items-center justify-between gap-3 bg-slate-950/60 border border-slate-800/80 rounded-xl px-3.5 py-2.5 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-200">{wk.weekLabel}</div>
                  <div className="text-[11px] text-slate-500">
                    {wk.drawsCount} งวด · เข้า {wk.winCount} · เฉียด {wk.nearMissCount}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-mono font-bold text-amber-300">
                      เข้า/เฉียด {wk.nearMissRatePercent}%
                    </div>
                    <div
                      className={`font-mono text-[11px] ${
                        wk.netProfitBaht >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {wk.netProfitBaht >= 0 ? '+' : ''}
                      {wk.netProfitBaht.toLocaleString()} บ.
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 200-Draw Audit Inspector Table */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">
              ตารางตรวจสอบผลรายงวด (Audit Trail · {filteredRows.length} จาก {report.auditRows.length} งวด)
            </h3>
            <p className="text-xs text-slate-400">
              แสดงชุด 4 ตัวที่ระบบเลือกให้ล่วงหน้า สถานะ Circuit Breaker และผลการตรวจสอบเทียบเลขออกจริง
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาเลข 4 ตัว หรือวันที่..."
                className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            {([
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'win', label: 'เข้าเป้า' },
              { id: 'nearmiss', label: 'Near-Miss' },
              { id: 'defensive', label: 'ลดพอร์ต/พัก' },
              { id: 'cold', label: 'หลุดขาด' }
            ] as { id: AuditFilter; label: string }[]).map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setFilterMode(btn.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  filterMode === btn.id
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs tabular-nums">
            <thead className="sticky top-0 bg-slate-950 text-slate-400 border-b border-slate-800 z-10">
              <tr>
                <th className="py-3 px-3 font-medium">งวดวันที่</th>
                <th className="py-3 px-3 font-medium">ผล 4D จริง</th>
                <th className="py-3 px-3 font-medium">ชุดที่ AI คัดให้เล่น</th>
                <th className="py-3 px-3 font-medium">สถานะพอร์ต</th>
                <th className="py-3 px-3 font-medium">ผลการตรวจ</th>
                <th className="py-3 px-3 font-medium text-right">สุทธิ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredRows.map((row) => {
                const statusLabel =
                  row.circuitBreakerStateAtDraw === 'red_pause'
                    ? 'พักชั่วคราว (0 บ.)'
                    : row.circuitBreakerStateAtDraw === 'yellow_nearmiss'
                      ? 'ประคองพอร์ต 1 ชุด'
                      : 'ปกติ 4 ชุด';
                const statusColor =
                  row.circuitBreakerStateAtDraw === 'red_pause'
                    ? 'text-rose-400'
                    : row.circuitBreakerStateAtDraw === 'yellow_nearmiss'
                      ? 'text-amber-300'
                      : 'text-emerald-400';

                return (
                  <tr key={row.drawId} className="hover:bg-slate-950/60 transition-colors">
                    <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                      <div className="font-medium text-white">{row.drawDate}</div>
                      <div className="text-[11px] text-slate-500">{row.dayOfWeek}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-base text-amber-300 tracking-wider">
                        {row.actual4D}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1.5 font-mono">
                        {row.sniperSets.map((setNum, idx) => {
                          const played = row.setsPlayedCount > 0 && idx < row.setsPlayedCount;
                          return (
                            <span
                              key={`${row.drawId}-${setNum}-${idx}`}
                              className={`px-2 py-0.5 rounded border text-xs ${
                                !played
                                  ? 'bg-slate-950/40 border-slate-800/60 text-slate-500 line-through'
                                  : setNum === row.actual4D
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                                    : 'bg-slate-950 border-slate-700 text-slate-200'
                              }`}
                            >
                              {setNum}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className={`py-3 px-3 font-medium whitespace-nowrap ${statusColor}`}>
                      {statusLabel}
                    </td>
                    <td className="py-3 px-3 text-slate-300 max-w-xs">
                      <span
                        className={
                          row.isWin
                            ? 'text-emerald-300 font-semibold'
                            : row.isNearMiss
                              ? 'text-amber-300 font-medium'
                              : 'text-slate-400'
                        }
                      >
                        {row.detailText}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${
                        row.netProfitBaht > 0
                          ? 'text-emerald-400'
                          : row.netProfitBaht < 0
                            ? 'text-rose-400'
                            : 'text-slate-500'
                      }`}
                    >
                      {row.netProfitBaht > 0 ? '+' : ''}
                      {row.netProfitBaht.toLocaleString()} บ.
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
