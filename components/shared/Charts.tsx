"use strict";

import React, { useMemo } from 'react';

// 简易饼图组件
interface PieChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  size?: number;
  showLabels?: boolean;
  className?: string;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  size = 200,
  showLabels = true,
  className = ''
}) => {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  
  const paths = useMemo(() => {
    let currentAngle = -90;
    const radius = size / 2 - 20;
    const center = size / 2;
    
    return data.map((d, i) => {
      const percentage = (d.value / total) * 100;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle * (Math.PI / 180);
      const endAngle = (currentAngle + angle) * (Math.PI / 180);
      
      const x1 = center + radius * Math.cos(startAngle);
      const y1 = center + radius * Math.sin(startAngle);
      const x2 = center + radius * Math.cos(endAngle);
      const y2 = center + radius * Math.sin(endAngle);
      
      const largeArc = angle > 180 ? 1 : 0;
      
      const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      
      const labelAngle = currentAngle + angle / 2;
      const labelRadius = radius * 0.65;
      const labelX = center + labelRadius * Math.cos(labelAngle * (Math.PI / 180));
      const labelY = center + labelRadius * Math.sin(labelAngle * (Math.PI / 180));
      
      currentAngle += angle;
      
      return {
        path,
        color: d.color || defaultColors[i % defaultColors.length],
        label: d.label,
        percentage,
        labelX,
        labelY,
        showLabel: percentage >= 5
      };
    });
  }, [data, total, size]);

  const defaultColors = [
    '#E63946', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
  ];

  return (
    <div className={className}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p, i) => (
          <g key={i}>
            <path
              d={p.path}
              fill={p.color}
              className="transition-all duration-300 hover:opacity-80 cursor-pointer"
            />
            {showLabels && p.showLabel && (
              <text
                x={p.labelX}
                y={p.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] font-bold fill-white pointer-events-none"
              >
                {p.percentage.toFixed(0)}%
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

// 环形图组件
interface DonutChartProps extends PieChartProps {
  innerRadius?: number;
  centerContent?: React.ReactNode;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 200,
  innerRadius = 60,
  showLabels = true,
  centerContent,
  className = ''
}) => {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  const center = size / 2;
  const outerRadius = size / 2 - 20;
  
  const paths = useMemo(() => {
    let currentAngle = -90;
    const defaultColors = [
      '#E63946', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
    ];
    
    return data.map((d, i) => {
      const percentage = (d.value / total) * 100;
      const angle = (percentage / 100) * 360;
      
      const startAngle = currentAngle * (Math.PI / 180);
      const endAngle = (currentAngle + angle) * (Math.PI / 180);
      
      const x1Outer = center + outerRadius * Math.cos(startAngle);
      const y1Outer = center + outerRadius * Math.sin(startAngle);
      const x2Outer = center + outerRadius * Math.cos(endAngle);
      const y2Outer = center + outerRadius * Math.sin(endAngle);
      
      const x1Inner = center + innerRadius * Math.cos(startAngle);
      const y1Inner = center + innerRadius * Math.sin(startAngle);
      const x2Inner = center + innerRadius * Math.cos(endAngle);
      const y2Inner = center + innerRadius * Math.sin(endAngle);
      
      const largeArc = angle > 180 ? 1 : 0;
      
      const path = `
        M ${x1Outer} ${y1Outer}
        A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}
        L ${x2Inner} ${y2Inner}
        A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1Inner} ${y1Inner}
        Z
      `;
      
      currentAngle += angle;
      
      return {
        path,
        color: d.color || defaultColors[i % defaultColors.length],
        label: d.label,
        value: d.value,
        percentage
      };
    });
  }, [data, total, size, innerRadius, outerRadius, center]);

  return (
    <div className={`relative ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.path}
            fill={p.color}
            className="transition-all duration-300 hover:opacity-80 cursor-pointer"
          />
        ))}
      </svg>
      {centerContent && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ padding: innerRadius + 20 }}
        >
          {centerContent}
        </div>
      )}
    </div>
  );
};

// 迷你折线图 (Sparkline)
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  showDots?: boolean;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 100,
  height = 30,
  color = '#E63946',
  fillOpacity = 0.1,
  showDots = false,
  className = ''
}) => {
  const { path, area, points } = useMemo(() => {
    if (data.length === 0) return { path: '', area: '', points: [] };
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const padding = 4;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const step = chartWidth / (data.length - 1);
    
    const pointsData = data.map((v, i) => ({
      x: padding + i * step,
      y: padding + chartHeight - ((v - min) / range) * chartHeight
    }));
    
    const pathD = pointsData.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');
    
    const areaD = `${pathD} L ${pointsData[pointsData.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;
    
    return { path: pathD, area: areaD, points: pointsData };
  }, [data, width, height]);

  if (data.length === 0) return null;

  return (
    <svg width={width} height={height} className={className}>
      {/* 填充区域 */}
      <path d={area} fill={color} fillOpacity={fillOpacity} />
      {/* 线条 */}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* 数据点 */}
      {showDots && points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill={color} />
      ))}
    </svg>
  );
};

// 简易柱状图
interface BarChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  height?: number;
  showValues?: boolean;
  className?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 120,
  showValues = true,
  className = ''
}) => {
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value)), [data]);
  const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className={className}>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => {
          const barHeight = (d.value / maxValue) * (height - 30);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div 
                className="w-full rounded-t-lg transition-all duration-300 hover:opacity-80"
                style={{ 
                  height: barHeight,
                  backgroundColor: d.color || defaultColors[i % defaultColors.length]
                }}
              />
              {showValues && (
                <span className="text-[10px] font-bold text-[var(--color-text-muted)]">
                  {d.value.toLocaleString()}
                </span>
              )}
              <span className="text-[9px] text-[var(--color-text-muted)] truncate max-w-full">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 进度环形图
interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  className?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 80,
  strokeWidth = 8,
  color = '#E63946',
  backgroundColor = '#E5E7EB',
  showLabel = true,
  className = ''
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size}>
        {/* 背景圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        {/* 进度圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
            transition: 'stroke-dashoffset 0.5s ease-out'
          }}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-sm font-bold text-[var(--color-text-primary)]">
          {progress.toFixed(0)}%
        </span>
      )}
    </div>
  );
};

export default PieChart;
