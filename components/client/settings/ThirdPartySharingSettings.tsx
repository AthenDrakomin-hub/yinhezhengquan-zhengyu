/**
 * 个人信息第三方共享清单
 */

import React, { useState } from 'react';

interface ThirdParty {
  id: string;
  name: string;
  type: string;
  sharedInfo: string[];
  purpose: string;
  securityMeasures: string;
}

const ThirdPartySharingSettings: React.FC = () => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const thirdParties: ThirdParty[] = [
    {
      id: 'exchange',
      name: '证券交易所',
      type: '监管机构',
      sharedInfo: ['交易指令', '账户信息', '身份证号'],
      purpose: '交易执行、监管报送',
      securityMeasures: '专网传输、加密存储'
    },
    {
      id: 'china-clear',
      name: '中国结算',
      type: '结算机构',
      sharedInfo: ['证券账户信息', '交易记录', '身份信息'],
      purpose: '证券登记、结算交收',
      securityMeasures: '专线连接、数据加密'
    },
    {
      id: 'bank',
      name: '存管银行',
      type: '资金存管',
      sharedInfo: ['银行账户信息', '资金流水'],
      purpose: '资金存取、资金清算',
      securityMeasures: '银证专线、加密传输'
    },
    {
      id: 'payment',
      name: '支付机构',
      type: '第三方支付',
      sharedInfo: ['支付金额', '订单号'],
      purpose: '购买理财产品、服务费用支付',
      securityMeasures: 'HTTPS加密、数据脱敏'
    },
    {
      id: 'analytics',
      name: '数据分析服务商',
      type: '技术服务',
      sharedInfo: ['设备信息（脱敏）', '使用行为（匿名）'],
      purpose: '应用性能分析、用户体验优化',
      securityMeasures: '数据匿名化、访问控制'
    },
    {
      id: 'push',
      name: '消息推送服务商',
      type: '技术服务',
      sharedInfo: ['设备Token', '推送内容'],
      purpose: '交易通知、行情预警推送',
      securityMeasures: '数据加密、访问控制'
    },
  ];

  const toggleItem = (id: string) => {
    setExpandedItem(prev => prev === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* 说明 */}
      <div className="bg-[#FFF7ED] px-4 py-3 mx-4 mt-4 rounded-lg">
        <p className="text-sm text-[#F97316]">
          我们仅在必要情况下与第三方共享您的个人信息，并要求其采取严格的安全措施。
        </p>
      </div>

      {/* 共享清单 */}
      <div className="bg-white mx-4 mt-4 rounded-xl">
        {thirdParties.map((party, index) => (
          <div key={party.id} className={`${index > 0 ? 'border-t border-[#F0F0F0]' : ''}`}>
            <button
              onClick={() => toggleItem(party.id)}
              className="w-full px-4 py-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-base font-medium text-[#333333]">{party.name}</p>
                  <p className="text-xs text-[#999999]">{party.type}</p>
                </div>
              </div>
              <svg 
                className={`w-5 h-5 text-[#999999] transition-transform ${expandedItem === party.id ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expandedItem === party.id && (
              <div className="px-4 pb-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-[#999999] mb-1">共享信息项</p>
                    <div className="flex flex-wrap gap-2">
                      {party.sharedInfo.map((info, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-[#F5F5F5] text-[#666666] rounded">
                          {info}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-[#999999] mb-1">共享目的</p>
                    <p className="text-sm text-[#333333]">{party.purpose}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#999999] mb-1">安全保障措施</p>
                    <p className="text-sm text-[#333333]">{party.securityMeasures}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 底部说明 */}
      <div className="px-4 py-4">
        <p className="text-xs text-[#999999]">
          完整的第三方共享清单以最新版本为准。如对信息共享有疑问，请联系客服。
        </p>
      </div>
    </div>
  );
};

export default ThirdPartySharingSettings;
