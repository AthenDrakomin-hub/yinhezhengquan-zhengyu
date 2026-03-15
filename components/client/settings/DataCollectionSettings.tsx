/**
 * 个人信息收集与使用说明页面
 */

import React, { useState } from 'react';

interface InfoCategory {
  id: string;
  title: string;
  items: {
    name: string;
    purpose: string;
    legalBasis: string;
  }[];
}

const DataCollectionSettings: React.FC = () => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const categories: InfoCategory[] = [
    {
      id: 'account',
      title: '账户信息',
      items: [
        { name: '手机号码', purpose: '账户注册、登录验证、安全通知', legalBasis: '履行合同所必需' },
        { name: '身份证号', purpose: '实名认证、合规要求', legalBasis: '法定义务所必需' },
        { name: '姓名', purpose: '实名认证、交易确认', legalBasis: '履行合同所必需' },
        { name: '银行卡号', purpose: '资金存取、银证转账', legalBasis: '履行合同所必需' },
      ]
    },
    {
      id: 'trading',
      title: '交易信息',
      items: [
        { name: '交易记录', purpose: '交易执行、账务管理', legalBasis: '履行合同所必需' },
        { name: '持仓信息', purpose: '资产展示、风险管理', legalBasis: '履行合同所必需' },
        { name: '资金流水', purpose: '账务核对、合规审计', legalBasis: '法定义务所必需' },
        { name: '委托记录', purpose: '交易执行、纠纷处理', legalBasis: '履行合同所必需' },
      ]
    },
    {
      id: 'device',
      title: '设备信息',
      items: [
        { name: '设备型号', purpose: '应用适配、问题排查', legalBasis: '取得您同意' },
        { name: '操作系统', purpose: '应用适配、安全防护', legalBasis: '取得您同意' },
        { name: '设备标识', purpose: '安全验证、防欺诈', legalBasis: '合法利益' },
        { name: 'IP地址', purpose: '安全防护、合规要求', legalBasis: '法定义务所必需' },
      ]
    },
    {
      id: 'behavior',
      title: '使用行为信息',
      items: [
        { name: '浏览记录', purpose: '个性化推荐', legalBasis: '取得您同意' },
        { name: '搜索记录', purpose: '优化搜索服务', legalBasis: '取得您同意' },
        { name: '点击记录', purpose: '分析用户偏好', legalBasis: '取得您同意' },
        { name: '使用时长', purpose: '服务质量分析', legalBasis: '合法利益' },
      ]
    },
  ];

  const toggleCategory = (id: string) => {
    setExpandedCategory(prev => prev === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* 说明 */}
      <div className="bg-white px-4 py-4 mb-2">
        <p className="text-sm text-[#666666] leading-relaxed">
          我们严格遵守《个人信息保护法》《证券法》等法律法规，仅在必要范围内收集和使用您的个人信息。以下是我们收集的信息类型及使用目的：
        </p>
      </div>

      {/* 分类列表 */}
      <div className="bg-white">
        {categories.map((category, index) => (
          <div key={category.id} className={`${index > 0 ? 'border-t border-[#F0F0F0]' : ''}`}>
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full px-4 py-4 flex items-center justify-between"
            >
              <span className="text-base font-medium text-[#333333]">{category.title}</span>
              <svg 
                className={`w-5 h-5 text-[#999999] transition-transform ${expandedCategory === category.id ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expandedCategory === category.id && (
              <div className="px-4 pb-4">
                <div className="bg-[#F9FAFB] rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-[#999999] border-b border-[#E5E5E5]">
                    <div className="col-span-3">信息项</div>
                    <div className="col-span-5">使用目的</div>
                    <div className="col-span-4">法律依据</div>
                  </div>
                  {category.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-3 text-xs border-b border-[#E5E5E5] last:border-0">
                      <div className="col-span-3 text-[#333333] font-medium">{item.name}</div>
                      <div className="col-span-5 text-[#666666]">{item.purpose}</div>
                      <div className="col-span-4 text-[#666666]">{item.legalBasis}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 底部说明 */}
      <div className="px-4 py-4">
        <p className="text-xs text-[#999999] leading-relaxed">
          您有权查询、更正、删除您的个人信息。如需行使相关权利，请联系客服或前往"设置-账户与安全"进行操作。
        </p>
      </div>
    </div>
  );
};

export default DataCollectionSettings;
