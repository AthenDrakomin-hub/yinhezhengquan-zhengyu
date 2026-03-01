
import React, { useState, useMemo } from 'react';
import { ICONS, HOLIDAYS_2026, MOCK_CALENDAR } from '../constants';

interface InvestmentCalendarViewProps {
  onBack: () => void;
}

const InvestmentCalendarView: React.FC<InvestmentCalendarViewProps> = ({ onBack }) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1)); // Default to March 2026

  const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const holidayMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    HOLIDAYS_2026.forEach(h => {
      map[h.date] = h.markets;
    });
    return map;
  }, []);

  const eventMap = useMemo(() => {
    const map: Record<string, typeof MOCK_CALENDAR> = {};
    MOCK_CALENDAR.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, []);

  const formatDate = (d: number) => {
    const m = (month + 1).toString().padStart(2, '0');
    const day = d.toString().padStart(2, '0');
    return `${year}-${m}-${day}`;
  };

  const getDayStatus = (d: number) => {
    const dateStr = formatDate(d);
    const date = new Date(year, month, d);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const marketsClosed = holidayMap[dateStr] || [];
    
    return {
      isWeekend,
      marketsClosed,
      events: eventMap[dateStr] || []
    };
  };

  return (
    <div className="animate-slide-up flex flex-col h-full bg-[var(--color-bg)] pb-10">
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center justify-between border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 className="text-sm font-black uppercase tracking-[0.2em]">2026 投资日历</h1>
        </div>
        <div className="flex items-center gap-2 bg-[var(--color-surface)] px-3 py-1.5 rounded-xl border border-[var(--color-border)]">
           <span className="w-1.5 h-1.5 bg-[#00D4AA] rounded-full animate-pulse" />
           <span className="text-[9px] font-black text-[#00D4AA] uppercase tracking-widest">Live Syncing</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {/* Market Status Overview */}
        <div className="grid grid-cols-3 gap-3">
          {['CN', 'HK'].map(m => (
            <div key={m} className="glass-card p-4 text-center space-y-1">
               <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{m} 市场</p>
               <p className="text-xs font-black text-[#00D4AA]">交易中</p>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)]/20">
            <button onClick={prevMonth} className="p-2 text-[var(--color-text-muted)]"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg></button>
            <h2 className="text-sm font-black uppercase tracking-[0.3em]">{year}年 {monthNames[month]}</h2>
            <button onClick={nextMonth} className="p-2 text-[var(--color-text-muted)]"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg></button>
          </div>
          <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
              <div key={d} className="py-2 text-center text-[9px] font-black text-[var(--color-text-muted)] uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="p-2 border-r border-b border-[var(--color-border)] opacity-20" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const { isWeekend, marketsClosed, events } = getDayStatus(d);
              return (
                <div key={d} className={`relative h-14 p-1.5 border-r border-b border-[var(--color-border)] flex flex-col justify-between hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer ${isWeekend ? 'bg-black/5' : ''}`}>
                  <span className={`text-[10px] font-mono font-black ${isWeekend ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>{d}</span>
                  <div className="flex flex-wrap gap-0.5 mt-auto">
                    {marketsClosed.length > 0 && <div className="w-1 h-1 bg-[#FF6B6B] rounded-full" />}
                    {events.length > 0 && <div className="w-1 h-1 bg-[#00D4AA] rounded-full" />}
                  </div>
                  {marketsClosed.length > 0 && (
                    <div className="absolute top-1 right-1 flex gap-0.5">
                      {marketsClosed.map(m => (
                        <span key={m} className="text-[6px] font-black text-[#FF6B6B] leading-none">{m}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Event List */}
        <div className="space-y-4">
          <h3 className="px-2 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">本月核心事项</h3>
          <div className="space-y-3">
             {MOCK_CALENDAR.filter(e => e.date.startsWith(`${year}-${(month + 1).toString().padStart(2, '0')}`)).map(event => (
               <div key={event.id} className="glass-card p-4 flex gap-4 items-center group hover:border-[#00D4AA]/30 transition-all">
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] shrink-0">
                    <span className="text-[8px] font-black text-[#00D4AA] uppercase">{monthNames[new Date(event.date).getMonth()]}</span>
                    <span className="text-sm font-black font-mono">{new Date(event.date).getDate()}</span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                        event.type === '休市' ? 'bg-[#FF6B6B]/10 text-[#FF6B6B]' : 'bg-[#00D4AA]/10 text-[#00D4AA]'
                      }`}>{event.type}</span>
                      <span className="text-[8px] font-mono text-[var(--color-text-muted)]">{event.time || '全天'}</span>
                    </div>
                    <h4 className="text-xs font-black text-[var(--color-text-primary)] group-hover:text-[#00D4AA] transition-colors">{event.title}</h4>
                  </div>
                  <div className="flex gap-1">
                    {event.markets?.map(m => (
                      <span key={m} className="text-[7px] font-black px-1 border border-[var(--color-border)] rounded text-[var(--color-text-muted)]">{m}</span>
                    ))}
                  </div>
               </div>
             ))}
          </div>
        </div>

        {/* Holiday Legends */}
        <div className="glass-card p-5 space-y-4">
           <h3 className="text-[10px] font-black text-[var(--color-text-primary)] uppercase tracking-widest border-l-2 border-[#00D4AA] pl-4">2026 休市明细提示</h3>
           <div className="space-y-4 text-[10px]">
              <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                 <span className="font-bold">2月13-18日</span>
                 <span className="font-black text-[#FF6B6B]">春节 (CN/HK 休市)</span>
              </div>
              <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                 <span className="font-bold">4月03-06日</span>
                 <span className="font-black text-[#FF6B6B]">清明/复活节 (CN/HK/US)</span>
              </div>
              <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                 <span className="font-bold">11月26日</span>
                 <span className="font-black text-[#FF6B6B]">感恩节 (US 休市)</span>
              </div>
           </div>
        </div>

        <div className="bg-[#00D4AA]/5 border border-[#00D4AA]/10 p-4 rounded-2xl">
           <p className="text-[10px] font-black text-[#00D4AA] uppercase tracking-widest mb-1 flex items-center gap-2">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
             交易提示
           </p>
           <p className="text-[9px] text-[var(--color-text-secondary)] leading-relaxed italic">
             节假日休市期间，所有委托指令将顺延至下一个交易日处理。港股通、美股直达通道受当地假期影响，请合理安排调仓。
           </p>
        </div>
      </div>
    </div>
  );
};

export default InvestmentCalendarView;
