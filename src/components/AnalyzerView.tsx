import React, { useMemo, useState } from 'react';
import { LotterySourceItem, NextDrawInfo } from '../types/lottery';
import {
  Sliders,
  Sparkles,
  BarChart3,
  Sun,
  Flame,
  Calendar,
  Coins,
  BellRing,
  TrendingUp,
  Plus,
  Trash2,
  HelpCircle,
  Search,
  Layers,
  Target,
  ShieldCheck,
  Calculator,
  Award,
  Moon,
  Newspaper,
  Zap
} from 'lucide-react';

interface AnalyzerViewProps {
  sources: LotterySourceItem[];
  setSources: React.Dispatch<React.SetStateAction<LotterySourceItem[]>>;
  nextDraw: NextDrawInfo;
  onRunAnalysis: (customNotes: string) => Promise<void>;
  isLoading: boolean;
}

export const AnalyzerView: React.FC<AnalyzerViewProps> = ({
  sources,
  setSources,
  nextDraw,
  onRunAnalysis,
  isLoading
}) => {
  const [customNotes, setCustomNotes] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceRunning, setNewSourceRunning] = useState('');
  const [newSource2D, setNewSource2D] = useState('');
  const [newSource3D, setNewSource3D] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'stats' | 'calendar' | 'master' | 'temple' | 'news'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const getSourceIcon = (iconName: string) => {
    switch (iconName) {
      case 'BarChart3': return <BarChart3 className="w-5 h-5 text-amber-400" />;
      case 'Sun': return <Sun className="w-5 h-5 text-yellow-400" />;
      case 'Flame': return <Flame className="w-5 h-5 text-rose-400" />;
      case 'Calendar': return <Calendar className="w-5 h-5 text-emerald-400" />;
      case 'Coins': return <Coins className="w-5 h-5 text-amber-400" />;
      case 'BellRing': return <BellRing className="w-5 h-5 text-purple-400" />;
      case 'TrendingUp': return <TrendingUp className="w-5 h-5 text-sky-400" />;
      case 'Layers': return <Layers className="w-5 h-5 text-emerald-400" />;
      case 'Target': return <Target className="w-5 h-5 text-amber-300" />;
      case 'ShieldCheck': return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      case 'Calculator': return <Calculator className="w-5 h-5 text-sky-300" />;
      case 'Award': return <Award className="w-5 h-5 text-amber-400" />;
      case 'Moon': return <Moon className="w-5 h-5 text-indigo-300" />;
      case 'Newspaper': return <Newspaper className="w-5 h-5 text-slate-300" />;
      case 'Zap': return <Zap className="w-5 h-5 text-yellow-400" />;
      default: return <Sparkles className="w-5 h-5 text-amber-400" />;
    }
  };

  const categoryCounts = useMemo(() => {
    const counts = { all: sources.length, stats: 0, calendar: 0, master: 0, temple: 0, news: 0 };
    sources.forEach((s) => {
      if (counts[s.category] !== undefined) counts[s.category] += 1;
    });
    return counts;
  }, [sources]);

  const enabledCount = useMemo(() => sources.filter((s) => s.enabled).length, [sources]);

  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.recentNumbers.threeDigits.some((t) => t.includes(q))
        );
      }
      return true;
    });
  }, [sources, categoryFilter, searchQuery]);

  const handleToggleSource = (id: string) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const handleWeightChange = (id: string, weight: number) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, weight } : s)));
  };

  const handleApplyPreset = (preset: 'balanced' | 'stats-heavy' | 'masters-heavy') => {
    setSources((prev) =>
      prev.map((s) => {
        if (preset === 'balanced') {
          return { ...s, enabled: true, weight: s.category === 'stats' ? 92 : 84 };
        }
        if (preset === 'stats-heavy') {
          return { ...s, enabled: true, weight: s.category === 'stats' ? 98 : s.category === 'calendar' ? 88 : 74 };
        }
        return { ...s, enabled: true, weight: s.category === 'master' || s.category === 'calendar' ? 94 : 80 };
      })
    );
  };

  const handleAddCustomSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim()) return;

    const threeList = newSource3D ? newSource3D.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const first3 = threeList[0] || '';

    const newSource: LotterySourceItem = {
      id: `custom-${Date.now()}`,
      name: newSourceName,
      category: 'news',
      icon: 'Sparkles',
      description: 'สำนักหรือแหล่งข้อมูลเลขเด็ดเพิ่มเติมที่ผู้ใช้ป้อนเอง',
      recentNumbers: {
        running: newSourceRunning ? newSourceRunning.split(',').map((s) => s.trim()).filter(Boolean) : [],
        twoDigits: newSource2D ? newSource2D.split(',').map((s) => s.trim()).filter(Boolean) : [],
        threeDigits: threeList
      },
      positionalFocus:
        first3.length === 3
          ? { hundred: first3[0], ten: first3[1], unit: first3[2] }
          : undefined,
      weight: 85,
      enabled: true,
      reliabilityScore: 85
    };

    setSources((prev) => [newSource, ...prev]);
    setNewSourceName('');
    setNewSourceRunning('');
    setNewSource2D('');
    setNewSource3D('');
    setShowAddModal(false);
  };

  const handleDeleteSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="rounded-3xl bg-slate-900/80 border border-amber-500/30 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="text-xs text-amber-400 font-semibold flex items-center gap-2 mb-2">
            <Sliders className="w-3.5 h-3.5" />
            <span>ห้องปฏิบัติการสังเคราะห์ความละเอียดสูง · เปิดใช้งาน {enabledCount}/{sources.length} แหล่ง</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            ปรับจูนน้ำหนัก {sources.length} แหล่งข้อมูล & สถิติเจาะ 3 ตัวตรง ({nextDraw.drawDateStr})
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            รวมโมเดลสถิติ 6 ชั้น, ปฏิทิน/โหราศาสตร์ 5 แหล่ง, สำนักดัง 6 แหล่ง, วัดดัง 3 แหล่ง และกระแสจริง 2 แหล่ง เพื่อฟันธง 3 ตัวตรงๆ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>เพิ่มสำนักใหม่</span>
          </button>

          <button
            onClick={() => onRunAnalysis(customNotes)}
            disabled={isLoading}
            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg flex items-center gap-2 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Sparkles className={`w-4 h-4 fill-slate-950 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'กำลังสังเคราะห์ 22 แหล่ง...' : 'รันวิเคราะห์ 3 ตัวตรงทันที'}</span>
          </button>
        </div>
      </div>

      {/* Custom Context/Notes input */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
        <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>ระบุเบาะแสข่าวเด่น ทะเบียนรถ หรือเงื่อนไขเพิ่มเติมสำหรับงวดนี้</span>
        </label>
        <textarea
          rows={2}
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
          placeholder="เช่น ทะเบียนรถมงคล 8923, ยอดกฐินวัดดัง 427, เน้นหลักร้อย 4 หรือ 9..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-amber-400"
        />
      </div>

      {/* Filter Bar + Quick Weight Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[
            { id: 'all', label: `ทั้งหมด (${categoryCounts.all})` },
            { id: 'stats', label: `สถิติ (${categoryCounts.stats})` },
            { id: 'calendar', label: `ปฏิทิน (${categoryCounts.calendar})` },
            { id: 'master', label: `สำนักดัง (${categoryCounts.master})` },
            { id: 'temple', label: `วัดดัง (${categoryCounts.temple})` },
            { id: 'news', label: `ข่าว/กระแส (${categoryCounts.news})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id as typeof categoryFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === tab.id
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาแหล่งข้อมูลหรือเลข 3 ตัว..."
              className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 w-52"
            />
          </div>
          <button
            onClick={() => handleApplyPreset('stats-heavy')}
            className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-emerald-300 font-medium whitespace-nowrap"
          >
            สูตรเน้นสถิติ 10 ปี
          </button>
          <button
            onClick={() => handleApplyPreset('masters-heavy')}
            className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-amber-300 font-medium whitespace-nowrap"
          >
            สูตรเน้นสำนักดัง
          </button>
          <button
            onClick={() => handleApplyPreset('balanced')}
            className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-medium whitespace-nowrap"
          >
            สมดุล 22 แหล่ง
          </button>
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSources.map((source) => (
          <div
            key={source.id}
            className={`rounded-2xl border p-5 transition-colors ${
              source.enabled
                ? 'bg-slate-900/80 border-slate-800'
                : 'bg-slate-950/40 border-slate-900 opacity-50'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  {getSourceIcon(source.icon)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-sm sm:text-base truncate">{source.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-1">{source.description}</p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => handleToggleSource(source.id)}
                aria-label={`เปิดหรือปิด ${source.name}`}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                  source.enabled ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-slate-950 shadow-sm" />
              </button>
            </div>

            {/* Granular Positional & 3-Digit Numbers */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 my-3 text-xs space-y-1.5 tabular-nums">
              {source.positionalFocus && (
                <div className="flex items-center justify-between text-slate-400">
                  <span>เจาะตำแหน่ง (ร้อย · สิบ · หน่วย):</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {source.positionalFocus.hundred} · {source.positionalFocus.ten} · {source.positionalFocus.unit}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-slate-400">
                <span>3 ตัวตรงคัดเน้น:</span>
                <span className="font-mono font-bold text-amber-300">
                  {source.recentNumbers?.threeDigits?.length ? source.recentNumbers.threeDigits.join(' · ') : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>เลขวิ่ง · 2 ตัว:</span>
                <span className="font-mono text-slate-200">
                  วิ่ง [{source.recentNumbers?.running?.join('-') || '-'}] · 2 ตัว [{source.recentNumbers?.twoDigits?.join(', ') || '-'}]
                </span>
              </div>
            </div>

            {/* Weight Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs tabular-nums">
                <span className="text-slate-400">ค่าน้ำหนักการคำนวณ (Weight)</span>
                <span className="font-bold text-amber-400">{source.weight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={source.weight}
                disabled={!source.enabled}
                onChange={(e) => handleWeightChange(source.id, Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {source.id.startsWith('custom-') && (
              <div className="mt-3 text-right">
                <button
                  onClick={() => handleDeleteSource(source.id)}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>ลบสำนักนี้</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Custom Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" /> เพิ่มสำนักหรือแหล่งข้อมูลใหม่
            </h3>

            <form onSubmit={handleAddCustomSource} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ชื่อสำนัก / แหล่งที่มา
                </label>
                <input
                  type="text"
                  required
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="เช่น เจ้าแม่ตะเคียนทอง, ทะเบียนรถมงคล"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ชุด 3 ตัวตรง (คั่นด้วยจุลภาค)
                </label>
                <input
                  type="text"
                  value={newSource3D}
                  onChange={(e) => setNewSource3D(e.target.value)}
                  placeholder="เช่น 427, 927"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  เลขเด่นวิ่ง (คั่นด้วยจุลภาค)
                </label>
                <input
                  type="text"
                  value={newSourceRunning}
                  onChange={(e) => setNewSourceRunning(e.target.value)}
                  placeholder="เช่น 2, 4"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ชุด 2 ตัว (คั่นด้วยจุลภาค)
                </label>
                <input
                  type="text"
                  value={newSource2D}
                  onChange={(e) => setNewSource2D(e.target.value)}
                  placeholder="เช่น 27, 24, 47"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold"
                >
                  เพิ่มแหล่งข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
