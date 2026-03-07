import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminService } from '../../services/adminService';
import { ICONS } from '../../lib/constants';
import { supabase } from '@/lib/supabase';

// 数据类型
type ExportType = 'users' | 'orders' | 'trades' | 'positions' | 'audit_logs';

// 筛选条件
interface FilterCondition {
  field: string;
  operator: string;
  value: string;
}

const AdminDataExport: React.FC = () => {
  const [exportType, setExportType] = useState<ExportType>('users');
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // 高级筛选
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  
  // 数据预览
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  
  // 导出格式
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'excel'>('csv');
  const [showExportModal, setShowExportModal] = useState(false);

  // 字段配置（每种数据类型的可用筛选字段）
  const fieldConfig: Record<ExportType, { label: string; type: string }[]> = {
    users: [
      { label: '用户名', type: 'text' },
      { label: '手机号', type: 'text' },
      { label: '邮箱', type: 'text' },
      { label: '状态', type: 'select' },
      { label: '风险等级', type: 'select' },
      { label: '角色', type: 'select' },
      { label: '注册时间', type: 'date' }
    ],
    orders: [
      { label: '订单号', type: 'text' },
      { label: '股票代码', type: 'text' },
      { label: '交易类型', type: 'select' },
      { label: '订单状态', type: 'select' },
      { label: '创建时间', type: 'date' }
    ],
    trades: [
      { label: '交易号', type: 'text' },
      { label: '股票代码', type: 'text' },
      { label: '交易类型', type: 'select' },
      { label: '成交时间', type: 'date' }
    ],
    positions: [
      { label: '用户ID', type: 'text' },
      { label: '股票代码', type: 'text' },
      { label: '持仓数量', type: 'number' },
      { label: '风险等级', type: 'select' }
    ],
    audit_logs: [
      { label: '操作类型', type: 'select' },
      { label: '操作者', type: 'text' },
      { label: '操作时间', type: 'date' }
    ]
  };

  // 操作符配置
  const operatorOptions = [
    { value: 'eq', label: '等于' },
    { value: 'neq', label: '不等于' },
    { value: 'gt', label: '大于' },
    { value: 'gte', label: '大于等于' },
    { value: 'lt', label: '小于' },
    { value: 'lte', label: '小于等于' },
    { value: 'like', label: '包含' },
    { value: 'not_like', label: '不包含' }
  ];

  // 添加筛选条件
  const addFilter = () => {
    setFilters([...filters, { field: '', operator: 'eq', value: '' }]);
  };

  // 移除筛选条件
  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  // 更新筛选条件
  const updateFilter = (index: number, key: keyof FilterCondition, value: string) => {
    const newFilters = [...filters];
    newFilters[index][key] = value;
    setFilters(newFilters);
  };

  // 查询数据
  const handleSearch = async () => {
    setLoading(true);
    try {
      let query: any = {};

      // 构建查询条件
      switch (exportType) {
        case 'users':
          query = buildUserQuery();
          const { data: usersData, error: usersError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500);
          if (!usersError && usersData) {
            let filtered = usersData;
            if (keyword) {
              filtered = filtered.filter((u: any) => 
                u.username?.toLowerCase().includes(keyword.toLowerCase()) ||
                u.phone?.includes(keyword) ||
                u.email?.toLowerCase().includes(keyword.toLowerCase())
              );
            }
            setResults(filtered);
          }
          break;

        case 'orders':
          const { data: ordersData, error: ordersError } = await supabase
            .from('trade_orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500);
          if (!ordersError && ordersData) {
            let filtered = ordersData;
            if (keyword) {
              filtered = filtered.filter((o: any) => 
                o.stock_code?.toLowerCase().includes(keyword.toLowerCase())
              );
            }
            if (dateRange.start && dateRange.end) {
              filtered = filtered.filter((o: any) => {
                const date = new Date(o.created_at);
                return date >= new Date(dateRange.start) && date <= new Date(dateRange.end);
              });
            }
            setResults(filtered);
          }
          break;

        case 'trades':
          const { data: tradesData, error: tradesError } = await supabase
            .from('trades')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500);
          if (!tradesError && tradesData) {
            setResults(tradesData);
          }
          break;

        case 'positions':
          const { data: positionsData, error: positionsError } = await supabase
            .from('positions')
            .select('*')
            .gt('quantity', 0)
            .order('created_at', { ascending: false })
            .limit(500);
          if (!positionsError && positionsData) {
            setResults(positionsData);
          }
          break;

        case 'audit_logs':
          const { data: logsData, error: logsError } = await supabase
            .from('admin_operation_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500);
          if (!logsError && logsData) {
            setResults(logsData);
          }
          break;
      }

      // 重置选择
      setSelectedRows(new Set());
    } catch (error) {
      console.error('查询失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 构建用户查询
  const buildUserQuery = () => {
    let conditions: any[] = [];
    // 这里可以根据 filters 数组构建查询条件
    return conditions;
  };

  // 切换行选择
  const toggleRowSelection = (index: number) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedRows(newSelection);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedRows.size === results.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(results.map((_, i) => i)));
    }
  };

  // 导出数据
  const handleExport = async () => {
    const dataToExport = selectedRows.size > 0 
      ? results.filter((_, i) => selectedRows.has(i))
      : results;

    if (dataToExport.length === 0) {
      alert('请先选择要导出的数据');
      return;
    }

    setExporting(true);
    try {
      const filename = `${exportType}_export_${new Date().toISOString().split('T')[0]}`;

      switch (exportFormat) {
        case 'csv':
          adminService.exportToCSV(dataToExport, filename);
          break;
        case 'json':
          const jsonStr = JSON.stringify(dataToExport, null, 2);
          const jsonBlob = new Blob([jsonStr], { type: 'application/json' });
          const jsonUrl = URL.createObjectURL(jsonBlob);
          const jsonLink = document.createElement('a');
          jsonLink.href = jsonUrl;
          jsonLink.download = `${filename}.json`;
          jsonLink.click();
          URL.revokeObjectURL(jsonUrl);
          break;
        case 'excel':
          // 简单的Excel导出（实际应该用专业库如xlsx）
          const csvContent = convertToCSV(dataToExport);
          const excelBlob = new Blob(['\ufeff' + csvContent], { type: 'application/vnd.ms-excel' });
          const excelUrl = URL.createObjectURL(excelBlob);
          const excelLink = document.createElement('a');
          excelLink.href = excelUrl;
          excelLink.download = `${filename}.xls`;
          excelLink.click();
          URL.revokeObjectURL(excelUrl);
          break;
      }

      setShowExportModal(false);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  // 转换为CSV
  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
      headers.map(h => {
        const val = row[h];
        if (typeof val === 'object') return JSON.stringify(val);
        return `"${String(val || '').replace(/"/g, '""')}"`;
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  };

  // 格式化显示值
  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? '是' : '否';
    if (typeof value === 'object') return JSON.stringify(value);
    if (key.includes('time') || key.includes('date') || key === 'created_at' || key === 'updated_at') {
      return new Date(value).toLocaleString();
    }
    return String(value);
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-black text-industrial-800 uppercase tracking-tight">数据查询与导出</h1>
        <p className="text-sm text-industrial-400 font-bold mt-1">多维度筛选数据并导出为多种格式</p>
      </div>

      {/* 搜索与筛选 */}
      <div className="industrial-card p-6">
        {/* 数据类型选择 */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {(['users', 'orders', 'trades', 'positions', 'audit_logs'] as ExportType[]).map((type) => (
            <button
              key={type}
              onClick={() => { setExportType(type); setResults([]); }}
              className={`py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-colors ${
                exportType === type
                  ? 'bg-industrial-800 text-white'
                  : 'bg-industrial-100 text-industrial-600 hover:bg-industrial-200'
              }`}
            >
              {type === 'users' ? '用户数据' : 
               type === 'orders' ? '订单数据' :
               type === 'trades' ? '交易记录' :
               type === 'positions' ? '持仓数据' : '审计日志'}
            </button>
          ))}
        </div>

        {/* 基础搜索 */}
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="输入关键词搜索..."
            className="flex-1 industrial-input"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />

          {/* 日期范围 */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="industrial-input text-sm"
            />
            <span className="text-industrial-400">至</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="industrial-input text-sm"
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="industrial-button-primary"
          >
            <ICONS.Market size={16} className={loading ? 'animate-spin' : ''} /> 
            {loading ? '查询中...' : '查询'}
          </button>
        </div>

        {/* 高级筛选 */}
        <div>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-xs font-bold text-industrial-400 hover:text-industrial-600 flex items-center gap-1"
          >
            <ICONS.Plus size={12} className={`transition-transform ${showAdvancedFilters ? 'rotate-45' : ''}`} />
            高级筛选
          </button>

          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 space-y-3 overflow-hidden"
              >
                {filters.map((filter, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <select
                      value={filter.field}
                      onChange={(e) => updateFilter(index, 'field', e.target.value)}
                      className="industrial-input text-sm"
                    >
                      <option value="">选择字段</option>
                      {fieldConfig[exportType].map((field, i) => (
                        <option key={i} value={field.label}>{field.label}</option>
                      ))}
                    </select>

                    <select
                      value={filter.operator}
                      onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                      className="industrial-input text-sm"
                    >
                      {operatorOptions.map((op) => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={filter.value}
                      onChange={(e) => updateFilter(index, 'value', e.target.value)}
                      placeholder="输入值"
                      className="industrial-input text-sm flex-1"
                    />

                    <button
                      onClick={() => removeFilter(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <ICONS.Plus size={16} className="rotate-45" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={addFilter}
                  className="text-xs font-bold text-industrial-400 hover:text-industrial-600"
                >
                  + 添加筛选条件
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 数据预览 */}
      {results.length > 0 && (
        <div className="industrial-card overflow-hidden">
          {/* 工具栏 */}
          <div className="p-4 bg-industrial-50 border-b border-industrial-200 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={selectedRows.size === results.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4"
                />
                全选
              </label>
              <span className="text-xs text-industrial-400">
                已选择 {selectedRows.size} / {results.length} 条
              </span>
            </div>

            <button
              onClick={() => setShowExportModal(true)}
              className="industrial-button-primary"
            >
              <ICONS.Download size={16} /> 导出数据
            </button>
          </div>

          {/* 表格 */}
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-industrial-100 sticky top-0">
                <tr>
                  <th className="p-4 text-left w-12">
                    <span className="sr-only">选择</span>
                  </th>
                  {results.length > 0 && Object.keys(results[0]).map((key) => (
                    <th key={key} className="p-4 text-left text-[10px] font-black text-industrial-400 uppercase tracking-widest">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100">
                {results.map((row, idx) => (
                  <tr 
                    key={idx} 
                    className={`hover:bg-industrial-50 transition-colors ${selectedRows.has(idx) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(idx)}
                        onChange={() => toggleRowSelection(idx)}
                        className="w-4 h-4"
                      />
                    </td>
                    {Object.keys(results[0]).map((key, i) => (
                      <td key={i} className="p-4 text-sm text-industrial-800 max-w-xs truncate">
                        {formatValue(key, row[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {!loading && results.length === 0 && (
        <div className="industrial-card p-12 text-center">
          <ICONS.Chart size={48} className="mx-auto text-industrial-300 mb-4" />
          <p className="text-sm font-bold text-industrial-400">请选择数据类型并点击查询</p>
        </div>
      )}

      {/* 导出配置弹窗 */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 bg-industrial-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="industrial-card w-full max-w-md p-8 bg-white"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">导出配置</h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-industrial-400 hover:text-industrial-800"
                >
                  <ICONS.Plus className="rotate-45" size={24} />
                </button>
              </div>

              {/* 导出统计 */}
              <div className="bg-industrial-50 rounded-lg p-4 mb-6">
                <p className="text-xs text-industrial-400">将导出</p>
                <p className="text-2xl font-black text-industrial-800">
                  {selectedRows.size > 0 ? selectedRows.size : results.length} 条数据
                </p>
              </div>

              {/* 格式选择 */}
              <div className="space-y-4 mb-6">
                <label className="block text-[10px] font-black text-industrial-400 uppercase">导出格式</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['csv', 'json', 'excel'] as const).map((format) => (
                    <button
                      key={format}
                      onClick={() => setExportFormat(format)}
                      className={`py-3 text-xs font-black uppercase rounded-lg transition-colors ${
                        exportFormat === format
                          ? 'bg-industrial-800 text-white'
                          : 'bg-industrial-100 text-industrial-600 hover:bg-industrial-200'
                      }`}
                    >
                      {format === 'csv' ? 'CSV' : format === 'json' ? 'JSON' : 'Excel'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="industrial-button-secondary py-3"
                >
                  取消
                </button>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="industrial-button-primary py-3"
                >
                  {exporting ? '导出中...' : '确认导出'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDataExport;
