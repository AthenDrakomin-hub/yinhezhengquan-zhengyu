import React, { useState, useMemo, useEffect } from 'react';
import { ICONS } from '../../../lib/constants';
import { getCalendarEvents } from '../../../services/contentService';
import type { CalendarEvent } from '../../../lib/types';

interface InvestmentCalendarViewProps {
  onBack: () => void;
}

interface HolidayInfo {
  date: string;
  name: string;
  markets: string[];
}

const InvestmentCalendarView: React.FC<InvestmentCalendarViewProps> = ({ onBack }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取日历事件
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const data = await getCalendarEvents();
        setEvents(data);
      } catch (err) {
        console.error('获取日历事件失败:', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // 从事件数据构建事件映射
  const eventMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [events]);

  const formatDate = (d: number) => {
    const m = (month + 1).toString().padStart(2, '0');
    const day = d.toString().padStart(2, '0');
    return `${year}-${m}-${day}`;
  };

  const getDayStatus = (d: number) => {
    const dateStr = formatDate(d);
    const date = new Date(year, month, d);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    return {
      isWeekend,
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
          <h1 className="text-sm font-black uppercase tracking-[0.2em]">投资日历</h1>
        </div>
        <div className="flex items-center gap-2 bg-[var(--color-surface)] px-3 py-1.5 rounded-xl border border-[var(--color-border)]">
           <span className="w-1.5 h-1.5 bg-[#E63946] rounded-full animate-pulse" />
           <span className="text-[9px] font-black text-[#E63946] uppercase tracking-widest">Live Syncing</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {/* 市场状态概览 */}
        <div className="grid grid-cols-2 gap-3">
          {['CN', 'HK'].map(m => (
            <div key={m} className="galaxy-card p-4 text-center space-y-1">
               <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{m} 市场</p>
               <p className="text-xs font-black text-[#E63946]">正常交易</p>
            </div>
          ))}
        </div>

        {/* 日历网格 */}
        <div className="galaxy-card overflow-hidden">
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
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-12 border-b border-r border-[var(--color-border)] bg-[var(--color-surface)]/20" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const status = getDayStatus(d);
              const today = new Date();
              const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

              return (
                <div key={d} className={`h-12 border-b border-r border-[var(--color-border)] p-1 flex flex-col ${status.isWeekend ? 'bg-[var(--color-surface)]/40' : ''} ${isToday ? 'bg-[#E63946]/10' : ''}`}>
                  <span className={`text-[10px] font-black ${isToday ? 'text-[#E63946]' : status.isWeekend ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>{d}</span>
                  {status.events.length > 0 && (
                    <div className="mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#E63946]" title={status.events.map(e => e.title).join(', ')} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 当月事件列表 */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">
            {year}年{month + 1}月 重要事件
          </h3>
          {loading ? (
            <div className="text-center py-8 text-[var(--color-text-muted)] text-xs">加载中...</div>
          ) : events.filter(e => e.date.startsWith(`${year}-${(month + 1).toString().padStart(2, '0')}`)).length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-muted)] text-xs">暂无事件</div>
          ) : (
            events
              .filter(e => e.date.startsWith(`${year}-${(month + 1).toString().padStart(2, '0')}`))
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((event, idx) => (
                <div key={idx} className="galaxy-card p-4 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-surface)] flex flex-col items-center justify-center border border-[var(--color-border)]">
                    <span className="text-[9px] font-black text-[var(--color-text-muted)]">{event.date.split('-')[1]}月</span>
                    <span className="text-sm font-black text-[var(--color-text-primary)]">{event.date.split('-')[2]}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-[var(--color-text-primary)]">{event.title}</p>
                    {event.time && (
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-1">{event.time}</p>
                    )}
                    {event.markets && (
                      <div className="flex gap-2 mt-2">
                        {event.markets.map(m => (
                          <span key={m} className="text-[9px] font-black px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)]">{m}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestmentCalendarView;
