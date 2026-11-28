import React, { useEffect, useMemo, useState } from 'react';
import {
  LOTTERY_4D_META_MAP,
  SmartFilter3DCriteria,
  buildFiltered3DCsv,
  buildFiltered4DCsv,
  computePositional4DStats,
  filterAll10000Combinations,
  filterAll1000ThreeDigitCombinations
} from '../data/lottery4DDatabase';
import { Lottery4DType, LotteryDraw4D, SmartFilterCriteria } from '../types/lottery';
import {
  BarChart2,
  Sliders,
  Download,
  Copy,
  Check,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface StatisticsViewProps {
  draws: LotteryDraw4D[];
  lotteryType: Lottery4DType;
}

const ALL_RATIOS = ['4:0', '3:1', '2:2', '1:3', '0:4'];
const ALL_RATIOS_3D = ['3:0', '2:1', '1:2', '0:3'];

export const StatisticsView: React.FC<StatisticsViewProps> = ({ draws, lotteryType }) => {
  const meta = LOTTERY_4D_META_MAP[lotteryType];
  const stats = useMemo(() => computePositional4DStats(draws), [draws]);

  const [filterMode, setFilterMode] = useState<'4d' | '3d'>(
    meta.strategyMode === 'win4_3d' ? '3d' : '4d'
  );

  useEffect(() => {
    setFilterMode(meta.strategyMode === 'win4_3d' ? '3d' : '4d');
  }, [meta.strategyMode, lotteryType]);

  const [criteria, setCriteria] = useState<SmartFilterCriteria>(() => ({
    evenOddRatios: ['2:2', '3:1', '1:3'],
    highLowRatios: ['2:2', '3:1', '1:3'],
    sumMin: 14,
    sumMax: 22,
    killDigitsByPosition: [[], [], [], []],
    excludeHistoricalRepeats: true
  }));

  const [criteria3D, setCriteria3D] = useState<SmartFilter3DCriteria>(() => ({
    evenOddRatios: ['2:1', '1:2'],
    highLowRatios: ['2:1', '1:2'],
    sumMin: 9,
    sumMax: 18,
    killDigitsByPosition: [[], [], []],
    excludeDoubles: false,
    excludeHistoricalRepeats: true
  }));

  const [displayLimit, setDisplayLimit] = useState(120);
  const [copiedTop, setCopiedTop] = useState(false);

  useEffect(() => {
    setDisplayLimit(120);
  }, [lotteryType, filterMode]);

  const filteredCandidates = useMemo(
    () => filterAll10000Combinations(criteria, draws, stats),
    [criteria, draws, stats]
  );

  const filtered3DCandidates = useMemo(
    () => filterAll1000ThreeDigitCombinations(criteria3D, draws, stats),
    [criteria3D, draws, stats]
  );

  const activeCount = filterMode === '3d' ? filtered3DCandidates.length : filteredCandidates.length;
  const totalUniverse = filterMode === '3d' ? 1000 : 10000;
  const reductionPct = Math.round(((totalUniverse - activeCount) / totalUniverse) * 1000) / 10;

  const toggleRatio = (field: 'evenOddRatios' | 'highLowRatios', ratio: string) => {
    if (filterMode === '3d') {
      setCriteria3D((prev) => {
        const current = prev[field];
        const next = current.includes(ratio)
          ? current.filter((r) => r !== ratio)
          : [...current, ratio];
        return { ...prev, [field]: next };
      });
      return;
    }
    setCriteria((prev) => {
      const current = prev[field];
      const next = current.includes(ratio)
        ? current.filter((r) => r !== ratio)
        : [...current, ratio];
      return { ...prev, [field]: next };
    });
  };

  const toggleKillDigit = (posIdx: 0 | 1 | 2 | 3, digit: string) => {
    setCriteria((prev) => {
      const nextKills: [string[], string[], string[], string[]] = [
        [...prev.killDigitsByPosition[0]],
        [...prev.killDigitsByPosition[1]],
        [...prev.killDigitsByPosition[2]],
        [...prev.killDigitsByPosition[3]]
      ];
      if (nextKills[posIdx].includes(digit)) {
        nextKills[posIdx] = nextKills[posIdx].filter((d) => d !== digit);
      } else {
        nextKills[posIdx].push(digit);
      }
      return { ...prev, killDigitsByPosition: nextKills };
    });
  };

  const toggleKillDigit3D = (posIdx: 0 | 1 | 2, digit: string) => {
    setCriteria3D((prev) => {
      const nextKills: [string[], string[], string[]] = [
        [...prev.killDigitsByPosition[0]],
        [...prev.killDigitsByPosition[1]],
        [...prev.killDigitsByPosition[2]]
      ];
      if (nextKills[posIdx].includes(digit)) {
        nextKills[posIdx] = nextKills[posIdx].filter((d) => d !== digit);
      } else {
        nextKills[posIdx].push(digit);
      }
      return { ...prev, killDigitsByPosition: nextKills };
    });
  };

  const handleAutoFillColdKills = () => {
    if (filterMode === '3d') {
      const coldKills3D: [string[], string[], string[]] = [
        stats.positions[1].coldDigits.slice(0, 2).map((d) => d.digit),
        stats.positions[2].coldDigits.slice(0, 2).map((d) => d.digit),
        stats.positions[3].coldDigits.slice(0, 2).map((d) => d.digit)
      ];
      setCriteria3D((prev) => ({
        ...prev,
        sumMin: 9,
        sumMax: 18,
        evenOddRatios: ['2:1', '1:2'],
        highLowRatios: ['2:1', '1:2'],
        killDigitsByPosition: coldKills3D
      }));
      return;
    }

    const coldKills: [string[], string[], string[], string[]] = [
      stats.positions[0].coldDigits.slice(0, 2).map((d) => d.digit),
      stats.positions[1].coldDigits.slice(0, 2).map((d) => d.digit),
      stats.positions[2].coldDigits.slice(0, 2).map((d) => d.digit),
      stats.positions[3].coldDigits.slice(0, 2).map((d) => d.digit)
    ];
    setCriteria((prev) => ({
      ...prev,
      sumMin: stats.optimalSumMin,
      sumMax: stats.optimalSumMax,
      evenOddRatios: stats.topEvenOddRatios.length > 0 ? stats.topEvenOddRatios : ['2:2', '3:1'],
      highLowRatios: stats.topHighLowRatios.length > 0 ? stats.topHighLowRatios : ['2:2', '3:1'],
      killDigitsByPosition: coldKills
    }));
  };

  const handleResetFilters = () => {
    if (filterMode === '3d') {
      setCriteria3D({
        evenOddRatios: ['2:1', '1:2'],
        highLowRatios: ['2:1', '1:2'],
        sumMin: 9,
        sumMax: 18,
        killDigitsByPosition: [[], [], []],
        excludeDoubles: false,
        excludeHistoricalRepeats: true
      });
      return;
    }
    setCriteria({
      evenOddRatios: ['2:2', '3:1'],
      highLowRatios: ['2:2', '3:1', '1:3'],
      sumMin: 14,
      sumMax: 22,
      killDigitsByPosition: [[], [], [], []],
      excludeHistoricalRepeats: true
    });
  };

  const handleExportCsv = () => {
    const csv =
      filterMode === '3d'
        ? buildFiltered3DCsv(filtered3DCandidates)
        : buildFiltered4DCsv(filteredCandidates);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lotteryType}_${filterMode}_filtered_${activeCount}_sets.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyTopSets = () => {
    const text =
      filterMode === '3d'
        ? filtered3DCandidates.slice(0, 50).map((c) => c.number3D).join(', ')
        : filteredCandidates.slice(0, 50).map((c) => c.number4D).join(', ');
    navigator.clipboard.writeText(text);
    setCopiedTop(true);
    setTimeout(() => setCopiedTop(false), 2000);
  };

  const maxSumBucketCount = Math.max(...stats.sumDistribution.map((s) => s.count), 1);

  return (
    <div className="space-y-8">
      {/* Section A: Statistical Analysis Dashboard */}
      <section className="space-y-6">
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="text-xs text-amber-400 font-medium">
                แดชบอร์ดวิเคราะห์สถิติ 4 มิติ · {meta.name} · {stats.totalDraws} งวด
              </div>
              <h2 className="text-2xl font-bold text-white mt-1">
                ความถี่แยกหลักพัน-ร้อย-สิบ-หน่วย, สัดส่วน และผลรวม 4 หลัก
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 tabular-nums">
              <span>
                ช่วงผลรวมเด่น: <strong className="text-amber-300 font-mono">{stats.optimalSumMin}–{stats.optimalSumMax}</strong> ({stats.optimalSumHitRate}%)
              </span>
              <span aria-hidden="true" className="text-slate-700">|</span>
              <span>
                คู่-คี่หลัก: <strong className="text-emerald-400 font-mono">{stats.topEvenOddRatios.join(' / ')}</strong>
              </span>
              <span aria-hidden="true" className="text-slate-700">|</span>
              <span>
                อัตราซ้ำ 4 ตัวตรง: <strong className="text-slate-200 font-mono">{stats.repeat4DRate}%</strong>
              </span>
            </div>
          </div>

          {/* 4-Position Frequency Bar Charts (Thousands, Hundreds, Tens, Units) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mt-6">
            {stats.positions.map((pos) => {
              const maxCount = Math.max(...pos.digits.map((d) => d.count), 1);
              return (
                <div
                  key={pos.positionIndex}
                  className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-semibold text-white">{pos.positionLabel}</h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Hot: {pos.hotDigits.map((h) => h.digit).join(',')}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {pos.digits.map((item) => {
                      const barPct = Math.round((item.count / maxCount) * 100);
                      return (
                        <div key={item.digit} className="flex items-center gap-2 text-xs font-mono">
                          <span
                            className={`w-5 text-center font-bold ${
                              item.isHotOutlier
                                ? 'text-amber-300'
                                : item.isHot
                                  ? 'text-emerald-400'
                                  : item.isCold
                                    ? 'text-rose-400'
                                    : 'text-slate-400'
                            }`}
                          >
                            {item.digit}
                          </span>
                          <div className="flex-1 bg-slate-900 h-3 rounded overflow-hidden">
                            <div
                              className={`h-full rounded ${
                                item.isHotOutlier
                                  ? 'bg-amber-400'
                                  : item.isHot
                                    ? 'bg-emerald-500'
                                    : item.isCold
                                      ? 'bg-rose-500/60'
                                      : 'bg-slate-600'
                              }`}
                              style={{ width: `${Math.max(4, barPct)}%` }}
                            />
                          </div>
                          <span className="w-16 text-right text-slate-300 tabular-nums">
                            {item.count} ({item.percentage}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      เด่นสุด:{' '}
                      <strong className="text-emerald-400 font-mono">
                        {pos.hotDigits.map((d) => d.digit).join(' ')}
                      </strong>
                    </span>
                    <span>
                      ออกน้อย:{' '}
                      <strong className="text-rose-400 font-mono">
                        {pos.coldDigits.map((d) => d.digit).join(' ')}
                      </strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pattern & Ratio (Even-Odd & High-Low) + Sum Distribution (0-36) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Even-Odd & High-Low */}
          <div className="lg:col-span-5 rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <BarChart2 className="w-4 h-4 text-amber-400" />
              <span>สัดส่วน คู่-คี่ และ สูง-ต่ำ (0-4 ต่ำ / 5-9 สูง)</span>
            </h3>

            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium text-slate-400 mb-2">สัดส่วน คู่ : คี่</div>
                <div className="space-y-2">
                  {stats.evenOddDistribution.map((item) => (
                    <div key={`eo-${item.ratio}`} className="flex items-center gap-3 text-xs">
                      <span className="w-28 text-slate-300 truncate">{item.label}</span>
                      <div className="flex-1 bg-slate-950 h-3 rounded overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded"
                          style={{ width: `${Math.max(2, item.percentage * 2)}%` }}
                        />
                      </div>
                      <span className="w-20 text-right font-mono text-slate-200 tabular-nums">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <div className="text-xs font-medium text-slate-400 mb-2">สัดส่วน สูง (5-9) : ต่ำ (0-4)</div>
                <div className="space-y-2">
                  {stats.highLowDistribution.map((item) => (
                    <div key={`hl-${item.ratio}`} className="flex items-center gap-3 text-xs">
                      <span className="w-28 text-slate-300 truncate">{item.label}</span>
                      <div className="flex-1 bg-slate-950 h-3 rounded overflow-hidden">
                        <div
                          className="h-full bg-sky-400 rounded"
                          style={{ width: `${Math.max(2, item.percentage * 2)}%` }}
                        />
                      </div>
                      <span className="w-20 text-right font-mono text-slate-200 tabular-nums">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sum Distribution 0 - 36 */}
          <div className="lg:col-span-7 rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-4 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  การกระจายตัวของผลรวมเลข 4 หลัก (แต้มรวม 0 – 36)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  สีเหลืองคือโซนผลรวมที่ออกบ่อยที่สุด ({stats.optimalSumMin}–{stats.optimalSumMax} คิดเป็น {stats.optimalSumHitRate}% ของทั้งหมด)
                </p>
              </div>
            </div>

            <div className="h-52 flex items-end gap-1 pt-4 pb-2 border-b border-slate-800">
              {stats.sumDistribution.map((bucket) => {
                const heightPct = Math.round((bucket.count / maxSumBucketCount) * 100);
                return (
                  <div
                    key={bucket.sum}
                    title={`ผลรวม ${bucket.sum}: ${bucket.count} งวด (${bucket.percentage}%)`}
                    className="flex-1 h-full flex flex-col items-center justify-end gap-1 group"
                  >
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className={`w-full rounded-t transition-colors ${
                          bucket.isOptimalZone
                            ? 'bg-amber-400 group-hover:bg-amber-300'
                            : 'bg-slate-700 group-hover:bg-slate-500'
                        }`}
                        style={{ height: `${Math.max(bucket.count > 0 ? 6 : 2, heightPct)}%` }}
                      />
                    </div>
                    <span
                      className={`text-[9px] font-mono tabular-nums ${
                        bucket.isOptimalZone ? 'text-amber-300 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {bucket.sum % 3 === 0 || bucket.sum === stats.optimalSumMin || bucket.sum === stats.optimalSumMax
                        ? bucket.sum
                        : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>ผลรวมต่ำสุดที่ออก: 0 · ผลรวมสูงสุด: 36</span>
              <span>
                โซนทองคำแนะนำ: <strong className="text-amber-300 font-mono">{stats.optimalSumMin} ถึง {stats.optimalSumMax}</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Section B: Smart Filter & Generator (10,000 sets 4D or 1,000 sets 3D) */}
      <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>
                Smart Filter & Generator · คัดกรองชุดเลข{' '}
                {filterMode === '3d' ? '3 ตัว (000 – 999)' : '4 ตัว (0000 – 9999)'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">
              ระบบคัดกรองและสร้างชุดตัวเลข ({activeCount.toLocaleString()} จาก {totalUniverse.toLocaleString()} ชุด)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('4d')}
                className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                  filterMode === '4d'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                4 หลัก (10,000 ชุด)
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('3d')}
                className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                  filterMode === '3d'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                3 หลัก (1,000 ชุด)
              </button>
            </div>

            <button
              type="button"
              onClick={handleAutoFillColdKills}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>ตั้งค่าตามโซนสถิติเด่นอัตโนมัติ</span>
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>รีเซ็ตเงื่อนไข</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={activeCount === 0}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV ({activeCount})</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Ratio, Sum Range, Repeat Exclusion */}
          <div className="lg:col-span-5 space-y-5 bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            {/* Even-Odd Filter */}
            <div>
              <div className="text-xs font-semibold text-white mb-2">
                1. เลือกสัดส่วน คู่ : คี่ ที่ต้องการ
              </div>
              <div className="flex flex-wrap gap-2">
                {(filterMode === '3d' ? ALL_RATIOS_3D : ALL_RATIOS).map((r) => {
                  const active =
                    filterMode === '3d'
                      ? criteria3D.evenOddRatios.includes(r)
                      : criteria.evenOddRatios.includes(r);
                  return (
                    <button
                      key={`f-eo-${r}`}
                      type="button"
                      onClick={() => toggleRatio('evenOddRatios', r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                        active
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* High-Low Filter */}
            <div>
              <div className="text-xs font-semibold text-white mb-2">
                2. เลือกสัดส่วน สูง (5-9) : ต่ำ (0-4)
              </div>
              <div className="flex flex-wrap gap-2">
                {(filterMode === '3d' ? ALL_RATIOS_3D : ALL_RATIOS).map((r) => {
                  const active =
                    filterMode === '3d'
                      ? criteria3D.highLowRatios.includes(r)
                      : criteria.highLowRatios.includes(r);
                  return (
                    <button
                      key={`f-hl-${r}`}
                      type="button"
                      onClick={() => toggleRatio('highLowRatios', r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                        active
                          ? 'bg-sky-500 text-slate-950 border-sky-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sum Range */}
            <div>
              <div className="text-xs font-semibold text-white mb-2">
                3. ช่วงผลรวมของเลข {filterMode === '3d' ? '3 หลัก (0 – 27)' : '4 หลัก (0 – 36)'}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">ผลรวมต่ำสุด</label>
                  <input
                    type="number"
                    min={0}
                    max={filterMode === '3d' ? 27 : 36}
                    value={filterMode === '3d' ? criteria3D.sumMin : criteria.sumMin}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (filterMode === '3d') {
                        setCriteria3D((prev) => ({
                          ...prev,
                          sumMin: Math.max(0, Math.min(prev.sumMax, val))
                        }));
                      } else {
                        setCriteria((prev) => ({
                          ...prev,
                          sumMin: Math.max(0, Math.min(prev.sumMax, val))
                        }));
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">ผลรวมสูงสุด</label>
                  <input
                    type="number"
                    min={0}
                    max={filterMode === '3d' ? 27 : 36}
                    value={filterMode === '3d' ? criteria3D.sumMax : criteria.sumMax}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (filterMode === '3d') {
                        setCriteria3D((prev) => ({
                          ...prev,
                          sumMax: Math.min(27, Math.max(prev.sumMin, val))
                        }));
                      } else {
                        setCriteria((prev) => ({
                          ...prev,
                          sumMax: Math.min(36, Math.max(prev.sumMin, val))
                        }));
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Historical Repeat & 3D Doubles Toggles */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    filterMode === '3d'
                      ? criteria3D.excludeHistoricalRepeats
                      : criteria.excludeHistoricalRepeats
                  }
                  onChange={(e) => {
                    const checked = e.target.checked;
                    if (filterMode === '3d') {
                      setCriteria3D((prev) => ({ ...prev, excludeHistoricalRepeats: checked }));
                    } else {
                      setCriteria((prev) => ({ ...prev, excludeHistoricalRepeats: checked }));
                    }
                  }}
                  className="accent-emerald-500"
                />
                <span>
                  ตัดชุดเลข {filterMode === '3d' ? '3 หลักท้าย' : '4 หลัก'} ที่เคยออกซ้ำในฐานข้อมูล {draws.length} งวดออก
                </span>
              </label>

              {filterMode === '3d' && (
                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criteria3D.excludeDoubles}
                    onChange={(e) =>
                      setCriteria3D((prev) => ({ ...prev, excludeDoubles: e.target.checked }))
                    }
                    className="accent-amber-500"
                  />
                  <span>ตัดเลขเบิ้ล/หาม/ตอง (เลือกเฉพาะเลข 3 ตัวไม่ซ้ำหลัก)</span>
                </label>
              )}
            </div>
          </div>

          {/* Right: Positional Kill Digits */}
          <div className="lg:col-span-7 bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-white">
                4. ตัดเลขดับประจำหลัก (คลิกตัวเลขที่ต้องการตัดทิ้งในแต่ละหลัก)
              </div>
              <span className="text-[11px] text-rose-400">
                สีแดง = ตัดทิ้ง
              </span>
            </div>

            <div className="space-y-3">
              {(filterMode === '3d'
                ? (['หลักร้อย', 'หลักสิบ', 'หลักหน่วย'] as const)
                : (['หลักพัน', 'หลักร้อย', 'หลักสิบ', 'หลักหน่วย'] as const)
              ).map((label, pIdx) => {
                const kills =
                  filterMode === '3d'
                    ? criteria3D.killDigitsByPosition[pIdx as 0 | 1 | 2]
                    : criteria.killDigitsByPosition[pIdx as 0 | 1 | 2 | 3];
                return (
                  <div key={label} className="flex flex-wrap items-center gap-2">
                    <span className="w-20 text-xs font-medium text-slate-300 shrink-0">{label}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => {
                        const isKilled = kills.includes(d);
                        return (
                          <button
                            key={`${pIdx}-${d}`}
                            type="button"
                            onClick={() =>
                              filterMode === '3d'
                                ? toggleKillDigit3D(pIdx as 0 | 1 | 2, d)
                                : toggleKillDigit(pIdx as 0 | 1 | 2 | 3, d)
                            }
                            className={`w-8 h-8 rounded-lg font-mono text-xs font-bold border transition-colors cursor-pointer ${
                              isKilled
                                ? 'bg-rose-500/20 border-rose-500 text-rose-300 line-through'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Surviving Summary Strip */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                ชุดตัวเลขที่เหลืออยู่:{' '}
                <strong className="text-emerald-400 font-mono text-base tabular-nums">
                  {activeCount.toLocaleString()}
                </strong>{' '}
                <span className="text-slate-400">
                  / {totalUniverse.toLocaleString()} ชุด (คัดทิ้ง {reductionPct}%)
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyTopSets}
                className="text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
              >
                {copiedTop ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTop ? 'คัดลอก 50 ชุดเด่นแล้ว' : 'คัดลอก 50 ชุดคะแนนสูงสุด'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Surviving Grid (4D or 3D) */}
        {activeCount === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
            ไม่มีชุดตัวเลขที่ผ่านเงื่อนไขทั้งหมด กรุณาผ่อนคลายช่วงผลรวมหรือยกเลิกเลขดับบางหลัก
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {filterMode === '3d'
                ? filtered3DCandidates.slice(0, displayLimit).map((item) => (
                    <div
                      key={item.number3D}
                      title={`ผลรวม ${item.sum} · คู่:คี่ ${item.evenOddRatio} · คะแนน AI ${item.aiScore}`}
                      className={`bg-slate-950 border rounded-lg py-2 px-1 text-center ${
                        item.isDoubleOrTriple
                          ? 'border-amber-500/35 hover:border-amber-400'
                          : 'border-slate-800 hover:border-amber-500/60'
                      }`}
                    >
                      <div className="font-mono text-sm font-bold text-amber-300 tracking-wider tabular-nums">
                        {item.number3D}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                        Σ{item.sum} · {item.aiScore}
                      </div>
                    </div>
                  ))
                : filteredCandidates.slice(0, displayLimit).map((item) => (
                    <div
                      key={item.number4D}
                      title={`ผลรวม ${item.sum} · คู่:คี่ ${item.evenOddRatio} · คะแนน AI ${item.aiScore}`}
                      className="bg-slate-950 border border-slate-800 hover:border-amber-500/60 rounded-lg py-2 px-1 text-center"
                    >
                      <div className="font-mono text-sm font-bold text-amber-300 tracking-wider tabular-nums">
                        {item.number4D}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                        Σ{item.sum} · {item.aiScore}
                      </div>
                    </div>
                  ))}
            </div>

            {activeCount > displayLimit && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setDisplayLimit((prev) => prev + 120)}
                  className="px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-500 text-xs font-medium text-slate-300 cursor-pointer"
                >
                  แสดงเพิ่มเติม (กำลังแสดง {displayLimit} จาก {activeCount.toLocaleString()} ชุด)
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
