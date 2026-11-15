import React from 'react';
import { NextDrawInfo } from '../types/lottery';
import { Sparkles, Calendar, Clock, Share2, BarChart2, Sliders, Bell, Send } from 'lucide-react';

export type AppTab = 'dashboard' | 'analyzer' | 'linenotify' | 'telegram' | 'autopost' | 'statistics' | 'backtest';

interface HeaderProps {
  nextDraw: NextDrawInfo;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isAutoPostEnabled: boolean;
  isLineEnabled: boolean;
  isTelegramEnabled: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  nextDraw,
  activeTab,
  setActiveTab,
  isAutoPostEnabled,
  isLineEnabled,
  isTelegramEnabled
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/85 backdrop-blur-md sticky top-0 z-40">
      {/* Top Schedule Strip */}
      <div className="bg-slate-950/80 border-b border-slate-800/80 px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs tabular-nums">
          <div className="flex flex-wrap items-center gap-2 text-slate-300">
            <span>
              งวดถัดไป: <strong className="text-amber-400">{nextDraw.drawDateStr}</strong> ({nextDraw.dayOfWeek})
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-amber-300 font-semibold">อีก {nextDraw.daysUntilDraw} วันหวยออก</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-300">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>โพสต์ FB (ก่อน 5 วัน):</span>
              <strong className="text-blue-300">{nextDraw.autoPostDateStr}</strong>
              <span className={isAutoPostEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                ({isAutoPostEnabled ? 'เปิด' : 'ปิด'})
              </span>
            </div>

            <span aria-hidden="true" className="text-slate-700 hidden sm:inline">|</span>

            <div className="flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-emerald-400" />
              <span>แจ้งเตือน LINE (ก่อน 1 วัน):</span>
              <strong className="text-emerald-300">{nextDraw.lineNotifyDateStr}</strong>
              <span className={isLineEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                ({isLineEnabled ? 'เปิด' : 'ปิด'})
              </span>
            </div>

            <span aria-hidden="true" className="text-slate-700 hidden sm:inline">|</span>

            <div className="flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-sky-400" />
              <span>กลุ่ม Telegram:</span>
              <span className={isTelegramEnabled ? 'text-sky-400' : 'text-slate-500'}>
                ({isTelegramEnabled ? 'เปิด' : 'ปิด'})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header Nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Brand Wordmark */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-3 text-left shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center shadow-md border border-amber-300/40 shrink-0">
            <Sparkles className="w-5 h-5 text-slate-950 fill-slate-950" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent whitespace-nowrap">
              AI หวยแม่นยำ
            </h1>
            <p className="text-[11px] text-slate-400 whitespace-nowrap">
              วิเคราะห์ 22 แหล่ง · ฟันธง 3 ตัวตรง & แจ้งเตือน LINE / TG / FB
            </p>
          </div>
        </button>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>สรุปเลขเด่น AI</span>
          </button>

          <button
            onClick={() => setActiveTab('analyzer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'analyzer'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>วิเคราะห์ 22 แหล่ง</span>
          </button>

          <button
            onClick={() => setActiveTab('linenotify')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'linenotify'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Bell className={`w-4 h-4 ${activeTab === 'linenotify' ? 'text-slate-950' : 'text-emerald-400'}`} />
            <span>แจ้งเตือน LINE</span>
          </button>

          <button
            onClick={() => setActiveTab('telegram')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'telegram'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Send className={`w-4 h-4 ${activeTab === 'telegram' ? 'text-slate-950' : 'text-sky-400'}`} />
            <span>กลุ่ม Telegram</span>
          </button>

          <button
            onClick={() => setActiveTab('autopost')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'autopost'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Share2 className={`w-4 h-4 ${activeTab === 'autopost' ? 'text-white' : 'text-blue-400'}`} />
            <span>โพสต์ Facebook</span>
          </button>

          <button
            onClick={() => setActiveTab('statistics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'statistics'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>สถิติ 10 ปี</span>
          </button>

          <button
            onClick={() => setActiveTab('backtest')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'backtest'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>ตรวจผลย้อนหลัง</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
