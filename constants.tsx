
import React from 'react';
import { Stock, TradeType, Holding, ResearchReport, SupportTicket, EducationTopic, MarketHoliday, Banner, AssetSnapshot, CalendarEvent } from './types';
import { svg } from 'framer-motion/client';

export const COLORS = {
  bg: '#0A1628', 
  surface: 'rgba(255, 255, 255, 0.06)',
  border: 'rgba(255, 255, 255, 0.1)',
  accent: '#00D4AA', 
  warning: '#FF6B6B',
  textMuted: '#8B95A8',
  textPrimary: '#FFFFFF',
};

export const MOCK_ASSET_HISTORY: AssetSnapshot[] = [
  { date: '03-20', equity: 950000, balance: 100000, profit: -5000 },
  { date: '03-21', equity: 965000, balance: 100000, profit: 15000 },
  { date: '03-22', equity: 940000, balance: 120000, profit: -25000 },
  { date: '03-23', equity: 980000, balance: 120000, profit: 40000 },
  { date: '03-24', equity: 1020000, balance: 150000, profit: 40000 },
  { date: '03-25', equity: 1050000, balance: 150000, profit: 30000 },
  { date: '03-26', equity: 1000000, balance: 100000, profit: -50000 },
];

export const BANNER_MOCK: Banner[] = [
  { 
    id: 'b1', 
    title: '银河证券·证裕单元 26 周年庆', 
    desc: '深度解析：2000-2026 见证专业价值的数字化转型', 
    img: 'https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/60905537-802a-466d-862d-03487372b64b.jpg',
    category: '年度品牌',
    date: '2025-03-27',
    content: '在 2026 年全球资产配置的新坐标下，中国银河证券研究部认为，数字化转型正迈入以“证裕交易单元”为核心的 2.0 阶段。',
  },
  { 
    id: 'b2', 
    title: '证裕单元 Nexus 核心系统升级', 
    desc: '集成极速行情内核，开启毫秒级算法对冲新时代', 
    img: 'https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/75581daa-fd55-45c5-8376-f51bf6852fde.jpg',
    category: '科技赋能',
    date: '2025-03-25',
    content: '本次升级实现了底层交易引擎与 AI 大模型的直连。这是中国银河证券向“AI-Native”数字化券商转型的关键里程碑。',
  },
  { 
    id: 'b3', 
    title: '跨境直连：银河港股通流动性解密', 
    desc: '红利税预期调整下的高股息资产重估逻辑', 
    img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1000',
    category: '市场深度',
    date: '2025-03-20',
    content: '随着互联互通机制的深化，银河证券证裕单元深度拆解了银行、公用事业及资源类标的的溢价回归路径。',
    relatedSymbol: '00700'
  }
];

export const HOLIDAYS_2026: MarketHoliday[] = [
  { date: '2025-01-01', name: '元旦', markets: ['CN', 'HK', 'US'] },
  { date: '2025-01-29', name: '春节', markets: ['CN', 'HK'] },
  { date: '2025-10-01', name: '国庆节', markets: ['CN', 'HK'] },
];

export const MOCK_CALENDAR: CalendarEvent[] = [
  { id: 'c1', date: '2026-03-20', title: '美联储利率决议', type: '宏观', time: '02:00', markets: ['US'] },
  { id: 'c2', date: '2026-03-25', title: '英伟达财报发布', type: '财报', time: '16:00', markets: ['US'] },
  { id: 'c3', date: '2026-03-28', title: '银河证券年度策略会', type: '活动', time: '09:00', markets: ['CN'] },
];

export const MOCK_STOCKS: Stock[] = [
  { symbol: '600000', name: '浦发银行', price: 7.52, change: 0.05, changePercent: 0.67, market: 'CN', sparkline: [7.4, 7.5, 7.45, 7.52], logoUrl: 'https://img.icons8.com/color/48/000000/bank.png' },
  { symbol: '00700', name: '腾讯控股', price: 382.40, change: -4.20, changePercent: -1.09, market: 'HK', sparkline: [385, 380, 384, 382.4], logoUrl: 'https://img.icons8.com/color/48/000000/tencent-wechat.png' },
  { symbol: 'NVDA', name: '英伟达', price: 925.35, change: 12.45, changePercent: 1.36, market: 'US', sparkline: [900, 910, 930, 925], logoUrl: 'https://img.icons8.com/color/48/000000/nvidia.png' },
  { symbol: '600519', name: '贵州茅台', price: 1750.00, change: 15.00, changePercent: 0.87, market: 'CN', sparkline: [1730, 1740, 1760, 1750], logoUrl: 'https://img.icons8.com/color/48/000000/liquor.png' },
];

export const MOCK_IPO_STOCKS: Stock[] = [
  { symbol: '780123', name: '银河量子', price: 18.50, change: 0, changePercent: 0, market: 'CN', sparkline: [], logoUrl: 'https://img.icons8.com/color/48/000000/cpu.png' },
];

export const MOCK_DERIVATIVES: Stock[] = [
  { symbol: 'IF2506', name: '沪深300指数期货2506', price: 3624.5, change: 12.4, changePercent: 0.34, market: 'FUTURES', sparkline: [] },
];

export const MOCK_REPORTS: ResearchReport[] = [
  { id: 'r1', title: '银河策略 2025: 分布式算力节点深度价值评估', author: '银河证券投研总部', date: '2025-03-26', category: '行业', summary: '分布式算力需求进入爆发期，建议投资者关注“能源+算力”双重护城河标的。', sentiment: '看多' },
];

export const MOCK_TICKETS: SupportTicket[] = [
  { id: 'T-9921', subject: '两融账户展期申请审核', status: 'IN_PROGRESS', lastUpdate: '2025-03-26' },
];

export const MOCK_EDUCATION: EducationTopic[] = [
  { id: 'e1', title: '两融交易进阶指南', category: '进阶', image: 'https://images.unsplash.com/photo-1611974717482-58f00017963d?auto=format&fit=crop&q=80&w=400', duration: '15 mins' },
];

export const ICONS = {
  Home: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
  ),
  Market: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
  ),
  Trade: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 2H2v10c0 5.5 4.5 10 10 10s10-4.5 10-10V2h-10z"/><path d="M12 2v20"/><path d="M2 12h20"/></svg>
  ),
  User: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  Shield: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  ),
  Settings: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1-2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  ),
  Zap: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
  ),
  Eye: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
  ),
  Chart: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
  ),
  Plus: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
  ),
  Minus: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/></svg>
  ),
  ArrowRight: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
  ),
  Headset: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
  ),
  Check: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="20 6 9 17 4 12"/></svg>
  ),
  Calendar: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  ),
  Book: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
  ),
  Moon: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
  ),
  Sun: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
  ),
  Globe: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
  ),
  Activity: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
  ),
  ArrowLeft: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
  ),
  Phone: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
  ),
  Mail: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
  ),
};
