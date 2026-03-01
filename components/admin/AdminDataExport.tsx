import React, { useState } from 'react';
import { adminService } from '../../services/adminService';
import { ICONS } from '../../constants';

const AdminDataExport: React.FC = () => {
  const [searchType, setSearchType] = useState<'users' | 'orders'>('users');
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      if (searchType === 'users') {
        const data = await adminService.searchUsers(keyword);
        setResults(data);
      } else {
        const data = await adminService.searchOrders({ symbol: keyword });
        setResults(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const filename = searchType === 'users' ? 'users_export' : 'orders_export';
    adminService.exportToCSV(results, filename);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black">数据查询与导出</h1>
        <p className="text-sm text-slate-400 mt-1">搜索用户或订单数据并导出</p>
      </div>

      {/* 搜索栏 */}
      <div className="glass-card p-4 rounded-2xl">
        <div className="flex gap-4">
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as any)}
            className="px-4 py-2 bg-slate-800 rounded-xl border border-white/10"
          >
            <option value="users">用户</option>
            <option value="orders">订单</option>
          </select>

          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={searchType === 'users' ? '输入用户名/邮箱/手机号' : '输入股票代码'}
            className="flex-1 px-4 py-2 bg-slate-800 rounded-xl border border-white/10"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />

          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-[#00D4AA] text-[#0A1628] rounded-xl font-bold hover:opacity-90 disabled:opacity-50"
          >
            {loading ? '搜索中...' : '搜索'}
          </button>

          <button
            onClick={handleExport}
            disabled={!results.length}
            className="px-6 py-2 bg-slate-700 rounded-xl hover:bg-slate-600 disabled:opacity-50"
          >
            <ICONS.Download size={16} className="inline mr-2" />
            导出
          </button>
        </div>
      </div>

      {/* 结果列表 */}
      {results.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 bg-slate-800 flex justify-between items-center">
            <span className="font-bold">搜索结果: {results.length} 条</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  {Object.keys(results[0]).map((key) => (
                    <th key={key} className="text-left p-4 text-xs">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, idx) => (
                  <tr key={idx} className="border-t border-white/5">
                    {Object.values(row).map((val: any, i) => (
                      <td key={i} className="p-4 text-sm">
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDataExport;
