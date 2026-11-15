import React, { useState } from 'react';
import { HISTORICAL_DRAWS, calculateDigitStats, THAI_DAY_NAMES } from '../data/lotteryHistory';
import {
  BarChart2,
  Calendar,
  Search,
  Filter,
  Flame,
  Award,
  AlertCircle,
  TrendingUp,
  Percent
} from 'lucide-react';

export const StatisticsView: React.FC = () => {
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const stats = calculateDigitStats(HISTORICAL_DRAWS);

  // Filter draws
  const filteredDraws = HISTORICAL_DRAWS.filter((draw) => {
    const matchesDay = selectedDayFilter === 'all' || draw.dayOfWeek === selectedDayFilter;
    const matchesQuery =
      !searchQuery ||
      draw.drawDate.includes(searchQuery) ||
      draw.firstPrize.includes(searchQuery) ||
      draw.last2Digits.includes(searchQuery);
    return matchesDay && matchesQuery;
  });

  const maxLast2Count = Math.max(...Object.values(stats.digitCounts).map((d) => d.inLast2), 1);
  const maxTotalCount = Math.max(...Object.values(stats.digitCounts).map((d) => d.total), 1);

  return (
    <div className="space-y-6">
      {/* Stat Header */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold mb-3">
          <BarChart2 className="w-3.5 h-3.5" />
          ฐานข้อมูลสถิติสลากกินแบ่งรัฐบาล (Statistical Big Data Engine)
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          สถิติย้อนหลัง & ความถี่ตัวเลข 0 - 9
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          วิเคราะห์ความถี่ การกระจายตัว และแนวโน้มสถิติย้อนหลังเพื่อใช้เป็นข้อมูลอ้างอิงให้ AI
        </p>

        {/* Quick Highlights KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> จำนวนงวดในฐานข้อมูล
            </div>
            <div className="text-2xl font-black text-white">{stats.totalDraws} งวด</div>
            <div className="text-[11px] text-slate-500 mt-1">อัปเดตต่อเนื่อง</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> เลข 2 ตัวที่ออกบ่อยสุด
            </div>
            <div className="text-2xl font-black text-amber-400">
              เลข {stats.sortedByLast2[0]?.digit}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              ออก {stats.sortedByLast2[0]?.inLast2} ครั้ง
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Award className="w-3.5 h-3.5 text-emerald-400" /> เลขรวมที่มาบ่อยสุด
            </div>
            <div className="text-2xl font-black text-emerald-400">
              เลข {stats.sortedByTotal[0]?.digit}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              รวม {stats.sortedByTotal[0]?.total} ครั้ง
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Percent className="w-3.5 h-3.5 text-rose-400" /> อัตราการเกิดเลขเบิ้ล
            </div>
            <div className="text-2xl font-black text-rose-400">
              {stats.doubleRate}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              ({stats.doubleCount} จาก {stats.totalDraws} งวด)
            </div>
          </div>
        </div>
      </div>

      {/* Digit Frequency Charts (0-9) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Last 2 Digits Frequency */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              ความถี่ตัวเลขในรางวัลเลขท้าย 2 ตัว (0 - 9)
            </h3>
            <span className="text-xs text-slate-400">นับตามตำแหน่งหลักสิบ/หน่วย</span>
          </div>

          <div className="space-y-2.5">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
              const count = stats.digitCounts[digit.toString()]?.inLast2 || 0;
              const percent = Math.round((count / maxLast2Count) * 100);
              const isTop = stats.sortedByLast2.slice(0, 3).some((s) => s.digit === digit.toString());

              return (
                <div key={digit} className="flex items-center gap-3 text-xs">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                      isTop
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {digit}
                  </div>
                  <div className="flex-1 bg-slate-950 rounded-full h-4 overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isTop ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-slate-700'
                      }`}
                      style={{ width: `${Math.max(8, percent)}%` }}
                    />
                  </div>
                  <div className="w-12 text-right font-bold text-slate-300 shrink-0">
                    {count} ครั้ง
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: First Prize All Digits Frequency */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              ความถี่ตัวเลขในรางวัลที่ 1 ทั้ง 6 หลัก
            </h3>
            <span className="text-xs text-slate-400">ความถี่รวม</span>
          </div>

          <div className="space-y-2.5">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
              const count = stats.digitCounts[digit.toString()]?.inFirstPrize || 0;
              const percent = Math.round((count / maxTotalCount) * 100);
              const isTop = stats.sortedByTotal.slice(0, 3).some((s) => s.digit === digit.toString());

              return (
                <div key={digit} className="flex items-center gap-3 text-xs">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                      isTop
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {digit}
                  </div>
                  <div className="flex-1 bg-slate-950 rounded-full h-4 overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isTop ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-slate-700'
                      }`}
                      style={{ width: `${Math.max(8, percent)}%` }}
                    />
                  </div>
                  <div className="w-12 text-right font-bold text-slate-300 shrink-0">
                    {count} ครั้ง
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Historical Draws Search & Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              ตารางผลสลากกินแบ่งรัฐบาลย้อนหลัง
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ค้นหาและตรวจเช็กผลรางวัลย้อนหลังแต่ละงวด
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหางวด / ตัวเลข..."
                className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Day Filter */}
            <select
              value={selectedDayFilter}
              onChange={(e) => setSelectedDayFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value="all">ทุกวันในสัปดาห์</option>
              {THAI_DAY_NAMES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">งวดประจำวันที่</th>
                <th className="px-4 py-3">วันในสัปดาห์</th>
                <th className="px-4 py-3">รางวัลที่ 1</th>
                <th className="px-4 py-3">เลขท้าย 2 ตัว</th>
                <th className="px-4 py-3">เลขหน้า 3 ตัว</th>
                <th className="px-4 py-3">เลขท้าย 3 ตัว</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDraws.map((draw) => (
                <tr key={draw.id} className="hover:bg-slate-800/30 text-slate-300">
                  <td className="px-4 py-3 font-semibold text-white">
                    {draw.drawDate}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {draw.dayOfWeek}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-amber-300 tracking-wider">
                    {draw.firstPrize}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 font-bold border border-amber-500/30">
                      {draw.last2Digits}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    {draw.first3Digits?.join(', ')}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    {draw.last3Digits?.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
