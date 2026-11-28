import React from 'react';
import { NextDrawInfo } from '../types/lottery';

export type AppTab = 'dashboard' | 'ingest' | 'statistics' | 'backtest' | 'telegram';

interface HeaderProps {
  nextDraw: NextDrawInfo;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onQuickIngest: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  nextDraw,
  activeTab,
  setActiveTab,
  onQuickIngest
}) => {
  const navItems: { id: AppTab; label: string }[] = [
    { id: 'dashboard', label: 'แดชบอร์ด 4D' },
    { id: 'ingest', label: 'นำเข้าข้อมูล AI' },
    { id: 'statistics', label: 'สถิติ & กรองเลข' },
    { id: 'backtest', label: 'Backtest 200 งวด' },
    { id: 'telegram', label: 'แจ้งเตือน Telegram' }
  ];

  return (
    <header className="border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="text-lg font-bold tracking-tight text-white hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          AI หวยชุด 4 ประเทศ
        </button>

        {/* Zone 2: 5 Clean Single-Line Navigation Links */}
        <nav
          aria-label="เมนูหลัก"
          className="flex items-center gap-5 lg:gap-7 overflow-x-auto no-scrollbar py-1"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`text-xs sm:text-sm font-medium pb-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-amber-400 text-amber-400 font-semibold'
                    : 'border-transparent text-slate-300 hover:text-white hover:border-slate-700'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary CTA Action */}
        <div className="hidden sm:flex items-center gap-4 shrink-0">
          <span className="hidden xl:inline text-xs text-slate-400 tabular-nums whitespace-nowrap">
            งวดถัดไป {nextDraw.drawDateStr}
          </span>
          <button
            type="button"
            onClick={onQuickIngest}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            ดึงผล 4D ล่าสุด
          </button>
        </div>
      </div>
    </header>
  );
};
