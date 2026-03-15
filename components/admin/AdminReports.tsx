/**
 * 管理后台 - 数据报表
 * 功能：用户统计、交易统计、资产统计、收入统计、运营统计
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import reportService, { DashboardData, UserStats, TradeStats, AssetStats } from '@/services/reportService';

type ReportType = 'overview' | 'users' | 'trades' | 'assets' | 'vip' | 'campaigns';

const AdminReports: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportType>('overview');
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'year'>('month');
  
  // 数据状态
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [tradeStats, setTradeStats] = useState<TradeStats | null>(null);
  const [assetStats, setAssetStats] = useState<AssetStats | null>(null);
  const [vipStats, setVipStats] = useState<any>(null);
  const [campaignStats, setCampaignStats] = useState<any>(null);

  useEffect(() => {
    loadReportData();
  }, [activeReport, dateRange]);

  const loadReportData = async () => {
    setLoading(true);
    const range = reportService.getDateRange(dateRange);

    try {
      switch (activeReport) {
        case 'overview':
          const dashboard = await reportService.getDashboard();
          setDashboardData(dashboard);
          break;
        
        case 'users':
          const users = await reportService.getUserStats({
            start_date: range.start,
            end_date: range.end
          });
          setUserStats(users);
          break;
        
        case 'trades':
          const trades = await reportService.getTradeStats({
            start_date: range.start,
            end_date: range.end
          });
          setTradeStats(trades);
          break;
        
        case 'assets':
          const assets = await reportService.getAssetStats();
          setAssetStats(assets);
          break;
        
        case 'vip':
          const vip = await reportService.getVipStats();
          setVipStats(vip);
          break;
        
        case 'campaigns':
          const campaigns = await reportService.getCampaignStats();
          setCampaignStats(campaigns);
          break;
      }
    } catch (error) {
      console.error('加载报表数据失败:', error);
    }
    setLoading(false);
  };

  const handleExport = async (type: 'users' | 'trades' | 'assets') => {
    try {
      let data: any[] | null;
      let filename: string;

      switch (type) {
        case 'users':
          data = await reportService.exportUsers();
          filename = 'users_report';
          break;
        case 'trades':
          data = await reportService.exportTrades();
          filename = 'trades_report';
          break;
        case 'assets':
          data = await reportService.exportAssets();
          filename = 'assets_report';
          break;
        default:
          return;
      }

      if (data && data.length > 0) {
        // 转换为CSV并下载
        const csv = convertToCSV(data);
        downloadCSV(csv, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      }
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  const convertToCSV = (data: any[]): string => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(item => headers.map(h => `"${item[h] || ''}"`).join(','));
    return [headers.join(','), ...rows].join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // 渲染总览报表
  const renderOverviewReport = () => {
    if (!dashboardData) return null;

    const { users, trades, assets, vip, points, trends } = dashboardData;

    return (
      <div className="space-y-6">
        {/* 核心指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="总用户数"
            value={users.total}
            subtitle={`今日新增 +${users.today_new}`}
            icon="👥"
            color="#0066CC"
          />
          <StatCard
            title="总交易量"
            value={reportService.formatAmount(trades.total_volume)}
            subtitle={`今日 ${reportService.formatAmount(trades.today_volume)}`}
            icon="📊"
            color="#E63946"
          />
          <StatCard
            title="总资产规模"
            value={reportService.formatAmount(assets.total)}
            subtitle="平台资产"
            icon="💰"
            color="#22C55E"
          />
          <StatCard
            title="VIP用户"
            value={vip.total}
            subtitle="会员用户"
            icon="👑"
            color="#F97316"
          />
        </div>

        {/* 趋势图表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">用户增长趋势（近7天）</h3>
            <div className="h-48 flex items-end gap-2">
              {Object.entries(trends.users).slice(-7).map(([date, count]) => (
                <div key={date} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-[#0066CC] rounded-t transition-all"
                    style={{
                      height: `${Math.max(10, (count / Math.max(...Object.values(trends.users).slice(-7))) * 100)}%`
                    }}
                  />
                  <span className="text-xs text-gray-400 mt-2">{date.slice(5)}</span>
                  <span className="text-xs font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">交易量趋势（近7天）</h3>
            <div className="h-48 flex items-end gap-2">
              {Object.entries(trends.trades).slice(-7).map(([date, data]) => (
                <div key={date} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-[#E63946] rounded-t transition-all"
                    style={{
                      height: `${Math.max(10, (data.count / Math.max(...Object.values(trends.trades).slice(-7).map(d => d.count))) * 100)}%`
                    }}
                  />
                  <span className="text-xs text-gray-400 mt-2">{date.slice(5)}</span>
                  <span className="text-xs font-medium">{data.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 今日动态 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">今日动态</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#E63946]">{users.today_active}</p>
              <p className="text-sm text-gray-500 mt-1">活跃用户</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#0066CC]">{trades.today}</p>
              <p className="text-sm text-gray-500 mt-1">交易笔数</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#22C55E]">{reportService.formatAmount(trades.today_volume)}</p>
              <p className="text-sm text-gray-500 mt-1">交易金额</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#F97316]">{reportService.formatNumber(points.today_issued)}</p>
              <p className="text-sm text-gray-500 mt-1">发放积分</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染用户报表
  const renderUserReport = () => {
    if (!userStats) return null;

    return (
      <div className="space-y-6">
        {/* 概览 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="新增用户"
            value={userStats.total_new_users}
            icon="👤"
            color="#0066CC"
          />
          <StatCard
            title="活跃用户"
            value={userStats.total_active_users}
            icon="🔥"
            color="#E63946"
          />
          <StatCard
            title="平均活跃率"
            value={`${userStats.total_new_users > 0 ? ((userStats.total_active_users / userStats.total_new_users) * 100).toFixed(1) : 0}%`}
            icon="📈"
            color="#22C55E"
          />
        </div>

        {/* 增长趋势 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">用户增长趋势</h3>
          <div className="h-64 flex items-end gap-1 overflow-x-auto">
            {Object.entries(userStats.new_users_trend).map(([date, count]) => (
              <div key={date} className="flex flex-col items-center min-w-[40px]">
                <div
                  className="w-8 bg-[#0066CC] rounded-t transition-all"
                  style={{
                    height: `${Math.max(5, (count / Math.max(1, ...Object.values(userStats.new_users_trend))) * 150)}px`
                  }}
                />
                <span className="text-xs text-gray-400 mt-1 transform -rotate-45 origin-left">{date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 分布统计 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">设备分布</h3>
            <div className="space-y-3">
              {Object.entries(userStats.device_distribution).map(([device, count]) => (
                <div key={device} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{device}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0066CC] rounded-full"
                        style={{
                          width: `${(count / userStats.total_new_users) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">地区分布</h3>
            <div className="space-y-3">
              {Object.entries(userStats.region_distribution)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([region, count]) => (
                  <div key={region} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{region}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#E63946] rounded-full"
                          style={{
                            width: `${(count / userStats.total_new_users) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-12">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* 导出按钮 */}
        <div className="flex justify-end">
          <button
            onClick={() => handleExport('users')}
            className="px-4 py-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#004C99] transition-colors"
          >
            📥 导出用户数据
          </button>
        </div>
      </div>
    );
  };

  // 渲染交易报表
  const renderTradeReport = () => {
    if (!tradeStats) return null;

    return (
      <div className="space-y-6">
        {/* 概览 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="总交易笔数"
            value={tradeStats.total_trades}
            icon="📝"
            color="#0066CC"
          />
          <StatCard
            title="总交易金额"
            value={reportService.formatAmount(tradeStats.total_volume)}
            icon="💰"
            color="#E63946"
          />
          <StatCard
            title="买入笔数"
            value={tradeStats.total_buy}
            icon="📈"
            color="#22C55E"
          />
          <StatCard
            title="卖出笔数"
            value={tradeStats.total_sell}
            icon="📉"
            color="#F97316"
          />
        </div>

        {/* 交易趋势 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">交易趋势</h3>
          <div className="h-64 flex items-end gap-1 overflow-x-auto">
            {Object.entries(tradeStats.trades_trend).map(([date, data]) => (
              <div key={date} className="flex flex-col items-center min-w-[50px]">
                <div className="flex gap-0.5">
                  <div
                    className="w-4 bg-[#22C55E] rounded-t transition-all"
                    style={{
                      height: `${Math.max(5, (data.buy / Math.max(1, data.count)) * 150)}px`
                    }}
                  />
                  <div
                    className="w-4 bg-[#F97316] rounded-t transition-all"
                    style={{
                      height: `${Math.max(5, (data.sell / Math.max(1, data.count)) * 150)}px`
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400 mt-1">{date.slice(5)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#22C55E] rounded" />
              <span className="text-sm text-gray-600">买入</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#F97316] rounded" />
              <span className="text-sm text-gray-600">卖出</span>
            </div>
          </div>
        </div>

        {/* 热门股票 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">热门股票 TOP 10</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">排名</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">股票代码</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">交易笔数</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">交易金额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tradeStats.hot_stocks.map((stock, index) => (
                  <tr key={stock.symbol} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                    <td className="px-4 py-3 font-medium">{stock.symbol}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{stock.count}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{reportService.formatAmount(stock.volume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 导出按钮 */}
        <div className="flex justify-end">
          <button
            onClick={() => handleExport('trades')}
            className="px-4 py-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#004C99] transition-colors"
          >
            📥 导出交易数据
          </button>
        </div>
      </div>
    );
  };

  // 渲染资产报表
  const renderAssetReport = () => {
    if (!assetStats) return null;

    return (
      <div className="space-y-6">
        {/* 概览 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="总资产规模"
            value={reportService.formatAmount(assetStats.total_assets)}
            icon="💰"
            color="#E63946"
          />
          <StatCard
            title="人均资产"
            value={reportService.formatAmount(assetStats.avg_assets_per_user)}
            icon="👤"
            color="#0066CC"
          />
          <StatCard
            title="用户数"
            value={assetStats.asset_distribution.reduce((sum, item) => sum + item.count, 0)}
            icon="👥"
            color="#22C55E"
          />
        </div>

        {/* 资产构成 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">资产构成</h3>
            <div className="space-y-4">
              {[
                { label: '现金', value: assetStats.asset_composition.cash, color: '#22C55E' },
                { label: '股票', value: assetStats.asset_composition.stock, color: '#E63946' },
                { label: '基金', value: assetStats.asset_composition.fund, color: '#0066CC' },
                { label: '理财', value: assetStats.asset_composition.wealth, color: '#F97316' }
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <span className="text-sm font-medium">{reportService.formatAmount(item.value)}</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(item.value / assetStats.total_assets) * 100}%`,
                        backgroundColor: item.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">资产规模分布</h3>
            <div className="space-y-3">
              {assetStats.asset_distribution.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0066CC] rounded-full"
                        style={{
                          width: `${(item.count / assetStats.asset_distribution.reduce((sum, i) => sum + i.count, 0)) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 热门持仓 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">热门持仓 TOP 20</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">股票代码</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">持仓数量</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">市值</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assetStats.top_holdings.slice(0, 20).map((holding) => (
                  <tr key={holding.symbol} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{holding.symbol}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{reportService.formatNumber(holding.quantity)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{reportService.formatAmount(holding.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 导出按钮 */}
        <div className="flex justify-end">
          <button
            onClick={() => handleExport('assets')}
            className="px-4 py-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#004C99] transition-colors"
          >
            📥 导出资产数据
          </button>
        </div>
      </div>
    );
  };

  // 渲染VIP报表
  const renderVipReport = () => {
    if (!vipStats) return null;

    return (
      <div className="space-y-6">
        {/* 概览 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="VIP用户数"
            value={vipStats.vip_penetration}
            icon="👑"
            color="#F97316"
          />
          <StatCard
            title="总会员数"
            value={vipStats.total_vip_users}
            icon="👥"
            color="#0066CC"
          />
          <StatCard
            title="本月升级"
            value={vipStats.upgrades_this_month}
            icon="⬆️"
            color="#22C55E"
          />
          <StatCard
            title="会员渗透率"
            value={`${((vipStats.vip_penetration / vipStats.total_vip_users) * 100).toFixed(1)}%`}
            icon="📊"
            color="#E63946"
          />
        </div>

        {/* 等级分布 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">VIP等级分布</h3>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(vipStats.level_distribution).map(([level, count]) => (
              <div key={level} className="text-center">
                <div
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-xl font-bold"
                  style={{
                    backgroundColor: level === '1' ? '#666' : level === '2' ? '#C0C0C0' : level === '3' ? '#FFD700' : level === '4' ? '#E5E4E2' : '#B9F2FF',
                    color: '#fff'
                  }}
                >
                  {count as number}
                </div>
                <p className="text-sm text-gray-600 mt-2">VIP{level}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 权益使用 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">权益使用统计（近30天）</h3>
          <div className="space-y-3">
            {Object.entries(vipStats.benefit_usage).map(([benefit, count]) => (
              <div key={benefit} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{benefit}</span>
                <span className="text-sm font-medium">{count as number} 次</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 渲染活动报表
  const renderCampaignReport = () => {
    if (!campaignStats) return null;

    return (
      <div className="space-y-6">
        {/* 概览 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="总活动数"
            value={campaignStats.total_campaigns}
            icon="📢"
            color="#0066CC"
          />
          <StatCard
            title="进行中"
            value={campaignStats.active_campaigns}
            icon="🔥"
            color="#E63946"
          />
          <StatCard
            title="总参与人次"
            value={campaignStats.total_participations}
            icon="👥"
            color="#22C55E"
          />
        </div>

        {/* 活动类型分布 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">活动类型分布</h3>
          <div className="space-y-3">
            {Object.entries(campaignStats.type_distribution).map(([type, data]: [string, any]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{type}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{data.count} 个活动</span>
                  <span className="text-sm font-medium">{data.participants} 人参与</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 活动列表 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">活动列表</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">活动名称</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">类型</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">参与人数</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">发放奖励</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campaignStats.campaigns?.map((campaign: any) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{campaign.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{campaign.campaign_type}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        campaign.status === 'active' ? 'bg-green-100 text-green-600' :
                        campaign.status === 'ended' ? 'bg-gray-100 text-gray-500' :
                        'bg-orange-100 text-orange-600'
                      }`}>
                        {campaign.status === 'active' ? '进行中' : campaign.status === 'ended' ? '已结束' : campaign.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{campaign.participant_count}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{campaign.reward_given_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">数据报表</h1>
          <p className="text-sm text-gray-500 mt-1">平台运营数据分析与统计</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="today">今日</option>
            <option value="week">近7天</option>
            <option value="month">近30天</option>
            <option value="quarter">近90天</option>
            <option value="year">近1年</option>
          </select>
        </div>
      </div>

      {/* 报表类型标签 */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {[
          { key: 'overview', label: '总览', icon: '📊' },
          { key: 'users', label: '用户分析', icon: '👥' },
          { key: 'trades', label: '交易分析', icon: '📈' },
          { key: 'assets', label: '资产分析', icon: '💰' },
          { key: 'vip', label: '会员分析', icon: '👑' },
          { key: 'campaigns', label: '活动分析', icon: '📢' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveReport(tab.key as ReportType)}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeReport === tab.key
                ? 'text-[#E63946] border-b-2 border-[#E63946]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 报表内容 */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-400">加载中...</p>
        </div>
      ) : (
        <motion.div
          key={activeReport}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {activeReport === 'overview' && renderOverviewReport()}
          {activeReport === 'users' && renderUserReport()}
          {activeReport === 'trades' && renderTradeReport()}
          {activeReport === 'assets' && renderAssetReport()}
          {activeReport === 'vip' && renderVipReport()}
          {activeReport === 'campaigns' && renderCampaignReport()}
        </motion.div>
      )}
    </div>
  );
};

// 统计卡片组件
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
}> = ({ title, value, subtitle, icon, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
    <div className="flex items-center justify-between">
      <span className="text-2xl">{icon}</span>
      <div className="text-right">
        <p className="text-2xl font-bold" style={{ color }}>{value}</p>
        <p className="text-sm text-gray-500">{title}</p>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
    </div>
  </div>
);

export default AdminReports;
