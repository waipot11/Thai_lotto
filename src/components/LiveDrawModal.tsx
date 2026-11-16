import React, { useState } from 'react';
import { THAI_DAY_NAMES, THAI_MONTH_NAMES } from '../data/lotteryHistory';
import { Plus, X, Sparkles, RefreshCw, CheckCircle2, Database, Zap } from 'lucide-react';

import { LotteryType } from '../types/lottery';
import { LOTTERY_META_MAP } from '../data/specialLotteries';

interface LiveDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDrawAdded: (newAccuracyRate: number, totalDraws: number) => void;
  currentAccuracyRate: number;
  lotteryType?: LotteryType;
}

export const LiveDrawModal: React.FC<LiveDrawModalProps> = ({
  isOpen,
  onClose,
  onDrawAdded,
  currentAccuracyRate,
  lotteryType = 'gov'
}) => {
  const lotteryMeta = LOTTERY_META_MAP[lotteryType] || LOTTERY_META_MAP.gov;
  const [drawDate, setDrawDate] = useState('16 ตุลาคม 2569');
  const [dayOfWeek, setDayOfWeek] = useState('วันศุกร์');
  const [firstPrize, setFirstPrize] = useState('');
  const [last2Digits, setLast2Digits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Preset 1-click test button so user can immediately test real-time update
  const handleQuickPreset = (presetType: 'hit' | 'random') => {
    if (presetType === 'hit') {
      setFirstPrize('583983');
      setLast2Digits('83');
    } else {
      const rand1 = Math.floor(100000 + Math.random() * 900000).toString();
      const rand2 = Math.floor(10 + Math.random() * 90).toString();
      setFirstPrize(rand1);
      setLast2Digits(rand2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstPrize || !last2Digits) return;

    setIsSubmitting(true);
    setResultMessage(null);

    try {
      const res = await fetch('/api/lottery/add-draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotteryType,
          drawDate,
          dayOfWeek,
          firstPrize,
          last2Digits,
          dateIso: new Date().toISOString().split('T')[0]
        })
      });

      const data = await res.json();
      if (data.success && data.accuracy) {
        setResultMessage(data.message);
        onDrawAdded(data.accuracy.overallRate, data.totalDraws);
        setTimeout(() => {
          onClose();
          setResultMessage(null);
          setFirstPrize('');
          setLast2Digits('');
        }, 1800);
      } else {
        setResultMessage(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err: any) {
      setResultMessage(`ข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                บันทึกผล{lotteryMeta.name}งวดใหม่
              </h3>
              <p className="text-[11px] text-slate-400">
                เมื่อบันทึกผล ดัชนีความแม่นยำของ{lotteryMeta.shortName}จะคำนวณใหม่ทันที
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Demo Pre-fill */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> ทดสอบดูตัวเลขคำนวณสดทันที:
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleQuickPreset('hit')}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold hover:bg-emerald-500/30"
            >
              ทดลองงวดเข้าเป้า (83)
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset('random')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-semibold hover:bg-slate-700"
            >
              สุ่มตัวเลขทดสอบ
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                งวดประจำวันที่
              </label>
              <input
                type="text"
                required
                value={drawDate}
                onChange={(e) => setDrawDate(e.target.value)}
                placeholder="เช่น 16 ตุลาคม 2569"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                วันในสัปดาห์
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-400"
              >
                {THAI_DAY_NAMES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                รางวัลที่ 1 (6 หลัก)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={firstPrize}
                onChange={(e) => setFirstPrize(e.target.value.replace(/\D/g, ''))}
                placeholder="เช่น 583983"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                เลขท้าย 2 ตัว (2 หลัก)
              </label>
              <input
                type="text"
                required
                maxLength={2}
                value={last2Digits}
                onChange={(e) => setLast2Digits(e.target.value.replace(/\D/g, ''))}
                placeholder="เช่น 83"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-300 font-bold font-mono text-sm tracking-wider focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {resultMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{resultMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !firstPrize || !last2Digits}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังคำนวณใหม่...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>บันทึก & คำนวณความแม่นยำใหม่ทันที</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
