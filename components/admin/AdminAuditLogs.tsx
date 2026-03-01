import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { ICONS } from '../../constants';

const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    operateType: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const data = await adminService.getAuditLogs({
      ...filters,
      limit: 100
    });
    setLogs(data);
    setLoading(false);
  };

  const handleExport = () => {
    adminService.exportToCSV(logs, 'audit_logs');
  };

  const getOperateTypeText = (type: string) => {
    const map: Record<string, string> = {
      'RULE_UPDATE': '规则更新',
      'TRADE_INTERVENE': '订单干预',
      'FUND_OPERATION': '资金操作',
      'USER_STATUS_CHANGE': '用户状态变更',
      'USER_CREATE': '创建用户',
      'USER_DELETE': '删除用户'
    };
    return map[type] || type;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black">审计日志</h1>
          <p className="text-sm text-slate-400 mt-1">查看所有管理员操作记录</p>
        </div>
        <button
          onClick={handleExport}
          disabled={!logs.length}
          className="flex items-center gap-2 px-4 py-2 bg-[#00D4AA] text-[#0A1628] rounded-xl font-bold hover:opacity-90 disabled:opacity-50"
        >
          <ICONS.Download size={16} />
          导出CSV
        </button>
      </div>

      {/* 筛选器 */}
      <div className="glass-card p-4 rounded-2xl">
        <div className="grid grid-cols-4 gap-4">
          <select
            value={filters.operateType}
            onChange={(e) => setFilters({ ...filters, operateType: e.target.value })}
            className="px-4 py-2 bg-slate-800 rounded-xl border border-white/10"
          >
            <option value="">全部类型</option>
            <option value="RULE_UPDATE">规则更新</option>
            <option value="TRADE_INTERVENE">订单干预</option>
            <option value="FUND_OPERATION">资金操作</option>
            <option value="USER_STATUS_CHANGE">用户状态变更</option>
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="px-4 py-2 bg-slate-800 rounded-xl border border-white/10"
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="px-4 py-2 bg-slate-800 rounded-xl border border-white/10"
          />

          <button
            onClick={loadLogs}
            className="px-4 py-2 bg-slate-700 rounded-xl hover:bg-slate-600"
          >
            查询
          </button>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">加载中...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-800">
              <tr>
                <th className="text-left p-4 text-xs">时间</th>
                <th className="text-left p-4 text-xs">操作人</th>
                <th className="text-left p-4 text-xs">操作类型</th>
                <th className="text-left p-4 text-xs">操作内容</th>
                <th className="text-left p-4 text-xs">IP地址</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-white/5">
                  <td className="p-4 text-sm font-mono">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-4 text-sm">{log.admin?.username || '未知'}</td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-500 rounded-full text-xs font-bold">
                      {getOperateTypeText(log.operate_type)}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-400">
                    <pre className="text-xs">{JSON.stringify(log.operate_content, null, 2)}</pre>
                  </td>
                  <td className="p-4 text-sm font-mono">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogs;
