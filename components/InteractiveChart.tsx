
import React, { useState, useMemo } from 'react';
import { ICONS } from '../constants';

interface InteractiveChartProps {
  symbol: string;
  basePrice: number;
  changePercent: number;
}

type Period = '1D' | '1W' | '1M' | '1Y';
type Indicator = 'MACD' | 'RSI' | 'BOLL' | 'VOL';

const InteractiveChart: React.FC<InteractiveChartProps> = ({ symbol, basePrice, changePercent }) => {
  const [period, setPeriod] = useState<Period>('1D');
  const [activeIndicators, setActiveIndicators] = useState<Set<Indicator>>(new Set(['VOL']));
  const [showTrendlines, setShowTrendlines] = useState(false);

  // Generate simulated historical data
  const data = useMemo(() => {
    const points = period === '1D' ? 40 : period === '1W' ? 60 : 100;
    const history = [];
    let curr = basePrice * (1 - changePercent / 100);
    const volatility = 0.015;

    for (let i = 0; i < points; i++) {
      const rand = (Math.random() - 0.48) * volatility * curr;
      curr += rand;
      history.push({
        price: curr,
        vol: Math.random() * 1000,
        time: i
      });
    }
    return history;
  }, [period, basePrice, changePercent]);

  const toggleIndicator = (ind: Indicator) => {
    const next = new Set(activeIndicators);
    if (next.has(ind)) next.delete(ind);
    else next.add(ind);
    setActiveIndicators(next);
  };

  const minPrice = Math.min(...data.map(d => d.price));
  const maxPrice = Math.max(...data.map(d => d.price));
  const priceRange = maxPrice - minPrice;

  const getY = (price: number) => 100 - ((price - minPrice) / priceRange) * 100;
  const getX = (index: number) => (index / (data.length - 1)) * 100;

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex gap-2 p-1 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
        {(['1D', '1W', '1M', '1Y'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all ${
              period === p ? 'bg-[#00D4AA] text-[#0A1628]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Main Chart Area */}
      <div className="glass-card relative h-72 w-full p-4 overflow-hidden group">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
          {/* Grid Lines */}
          {[0, 25, 50, 75, 100].map(val => (
            <line key={val} x1="0" y1={val} x2="100" y2={val} stroke="var(--color-border)" strokeWidth="0.2" strokeDasharray="1,1" />
          ))}

          {/* Bollinger Bands (Simulated) */}
          {activeIndicators.has('BOLL') && (
            <>
              <path
                d={`M 0 ${getY(data[0].price * 1.02)} ${data.map((d, i) => `L ${getX(i)} ${getY(d.price * 1.02)}`).join(' ')}`}
                fill="none" stroke="#00D4AA" strokeWidth="0.3" strokeOpacity="0.2"
              />
              <path
                d={`M 0 ${getY(data[0].price * 0.98)} ${data.map((d, i) => `L ${getX(i)} ${getY(d.price * 0.98)}`).join(' ')}`}
                fill="none" stroke="#00D4AA" strokeWidth="0.3" strokeOpacity="0.2"
              />
            </>
          )}

          {/* Trendline (Simulated AI Analysis) */}
          {showTrendlines && (
            <line 
              x1="0" y1={getY(data[0].price)} 
              x2="100" y2={getY(data[data.length-1].price)} 
              stroke="#FACC15" strokeWidth="0.5" strokeDasharray="2,2" 
            />
          )}

          {/* Main Price Line */}
          <path
            d={`M 0 ${getY(data[0].price)} ${data.map((d, i) => `L ${getX(i)} ${getY(d.price)}`).join(' ')}`}
            fill="none"
            stroke={changePercent >= 0 ? '#00D4AA' : '#FF6B6B'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-500"
          />

          {/* Volume bars at bottom */}
          {activeIndicators.has('VOL') && data.map((d, i) => (
            <rect
              key={i}
              x={getX(i) - 0.5}
              y={100 - (d.vol / 1000) * 20}
              width="0.8"
              height={(d.vol / 1000) * 20}
              fill={i > 0 && data[i].price >= data[i-1].price ? '#00D4AA' : '#FF6B6B'}
              opacity="0.3"
            />
          ))}
        </svg>

        {/* Legend */}
        <div className="absolute top-2 left-4 flex gap-4 text-[8px] font-mono font-bold text-[var(--color-text-muted)]">
          <div className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-[#00D4AA]" />
            MA5: {data[data.length-1].price.toFixed(2)}
          </div>
          {activeIndicators.has('BOLL') && (
            <div className="flex items-center gap-1 text-[#00D4AA] opacity-60">
              BOLL MID: {(data[data.length-1].price * 1.002).toFixed(2)}
            </div>
          )}
        </div>
      </div>

      {/* Indicator & Tools Toolbar */}
      <div className="flex flex-wrap gap-2">
        {(['BOLL', 'MACD', 'RSI'] as Indicator[]).map(ind => (
          <button
            key={ind}
            onClick={() => toggleIndicator(ind)}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black border transition-all ${
              activeIndicators.has(ind) 
                ? 'bg-[#00D4AA]/10 border-[#00D4AA] text-[#00D4AA]' 
                : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
            }`}
          >
            {ind}
          </button>
        ))}
        <div className="w-px h-6 bg-[var(--color-border)] mx-1 self-center" />
        <button
          onClick={() => setShowTrendlines(!showTrendlines)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black border transition-all ${
            showTrendlines 
              ? 'bg-yellow-400/10 border-yellow-400 text-yellow-400' 
              : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 21L21 3"/></svg>
          智能趋势
        </button>
      </div>

      {/* Secondary Indicator Chart (MACD/RSI Placeholder) */}
      {(activeIndicators.has('MACD') || activeIndicators.has('RSI')) && (
        <div className="glass-card h-24 p-2 relative overflow-hidden">
          <div className="absolute top-1 left-2 text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
            {activeIndicators.has('MACD') ? 'MACD (12, 26, 9)' : 'RSI (14)'}
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full opacity-60">
             <path 
               d={`M 0 50 ${Array.from({length: 40}).map((_, i) => `L ${(i/39)*100} ${50 + Math.sin(i*0.5)*20}`).join(' ')}`} 
               fill="none" stroke="#00D4AA" strokeWidth="1" 
             />
             <path 
               d={`M 0 50 ${Array.from({length: 40}).map((_, i) => `L ${(i/39)*100} ${50 + Math.cos(i*0.5)*15}`).join(' ')}`} 
               fill="none" stroke="#FF6B6B" strokeWidth="1" 
             />
          </svg>
        </div>
      )}
    </div>
  );
};

export default InteractiveChart;
