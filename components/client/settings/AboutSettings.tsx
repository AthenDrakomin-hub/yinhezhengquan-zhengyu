"use strict";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../../../lib/constants';

// 条款弹窗
interface TermsModalProps {
  type: 'terms' | 'privacy' | 'disclaimer';
  onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ type, onClose }) => {
  const titles: Record<string, string> = {
    terms: '服务条款',
    privacy: '隐私政策',
    disclaimer: '风险免责声明'
  };
  
  const contents: Record<string, string> = {
    terms: `
一、总则

1.1 本服务条款是您（以下简称"用户"）与中国银河证券股份有限公司（以下简称"银河证券"）之间关于使用银河证券日斗投资单元服务所订立的协议。

1.2 用户通过网络页面点击确认或以其他方式选择接受本服务条款，即表示用户与银河证券已达成协议并同意接受本服务条款的全部约定内容。

二、服务内容

2.1 银河证券日斗投资单元为用户提供证券交易、行情查询、资产查询、智能投顾等服务。

2.2 银河证券有权根据业务发展需要调整、变更服务内容，并及时通知用户。

三、用户权利与义务

3.1 用户应按照相关法律法规及银河证券的要求，如实提供身份信息。

3.2 用户应妥善保管账户信息和密码，因用户保管不当造成的损失由用户自行承担。

3.3 用户不得利用本服务从事任何违法违规活动。

四、风险提示

4.1 证券投资有风险，入市需谨慎。

4.2 用户应充分了解证券投资的风险，根据自身风险承受能力进行投资决策。

五、免责条款

5.1 因不可抗力、网络故障、系统维护等原因导致的服务中断，银河证券不承担责任。

5.2 用户因自身操作不当造成的损失，银河证券不承担责任。
    `,
    privacy: `
一、信息收集

1.1 我们收集的信息包括：身份信息、联系方式、交易信息、设备信息等。

1.2 我们仅在提供服务所必需的情况下收集您的个人信息。

二、信息使用

2.1 我们使用您的信息用于：提供交易服务、风险控制、客户服务、合规监管等目的。

2.2 未经您的同意，我们不会将您的信息用于其他目的。

三、信息保护

3.1 我们采用行业标准的安全措施保护您的个人信息。

3.2 我们不会向第三方出售您的个人信息。

四、信息共享

4.1 我们仅在法律法规要求或经您同意的情况下向第三方共享您的信息。

4.2 我们要求接收信息的第三方遵守本隐私政策。

五、用户权利

5.1 您有权查询、更正、删除您的个人信息。

5.2 您有权撤回对信息处理的同意。

六、联系我们

如对隐私政策有任何疑问，请联系客服：95551
    `,
    disclaimer: `
一、投资风险提示

1.1 证券投资存在风险，投资者可能面临本金损失。

1.2 过往业绩不代表未来表现，银河证券不对投资收益作出保证。

二、信息免责

2.1 本系统提供的行情信息、资讯内容仅供参考，不构成投资建议。

2.2 银河证券对信息的准确性、完整性不作保证，用户据此操作风险自担。

三、系统风险

3.1 因网络、系统故障导致的交易失败或延迟，银河证券在法律允许范围内免责。

3.2 用户应做好风险管理，合理控制仓位。

四、合规声明

4.1 本系统仅面向合格投资者开放。

4.2 用户应遵守相关法律法规，不得利用本系统从事违法违规活动。

五、法律适用

本声明适用中华人民共和国法律。
    `
  };
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-[var(--color-surface)] rounded-2xl w-[90%] max-w-lg p-6 animate-slide-up max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">{titles[type]}</h3>
        
        <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
          {contents[type]}
        </div>
        
        <button
          onClick={onClose}
          className="w-full h-11 mt-6 bg-[var(--color-primary)] rounded-xl text-sm font-medium text-white hover:opacity-90 transition-all"
        >
          我已阅读并了解
        </button>
      </div>
    </div>
  );
};

const AboutSettings: React.FC = () => {
  const navigate = useNavigate();
  const [showTermsModal, setShowTermsModal] = useState<'terms' | 'privacy' | 'disclaimer' | null>(null);
  
  const handleContactSupport = () => {
    navigate('/client/chat');
  };
  
  return (
    <div className="animate-slide-up space-y-6">
      <div className="galaxy-card p-6 rounded-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#00D4AA]/10 flex items-center justify-center">
            <ICONS.Headset size={28} className="text-[#00D4AA]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[var(--color-text-primary)]">关于与帮助</h3>
            <p className="text-xs text-[var(--color-text-muted)]">联系客服、查看隐私政策和服务条款</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">系统版本</p>
            <p className="text-sm font-bold text-[var(--color-text-primary)]">银河证券日斗单元 v2.10</p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">© 2026 中国银河证券</p>
          </div>
          
          <button 
            onClick={handleContactSupport}
            className="w-full p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex items-center justify-between hover:border-[#00D4AA]/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <ICONS.MessageCircle size={18} className="text-[var(--color-text-muted)]" />
              <div className="text-left">
                <p className="text-sm font-bold text-[var(--color-text-primary)]">联系客服</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">在线咨询或拨打 95551</p>
              </div>
            </div>
            <ICONS.ArrowRight size={16} className="text-[var(--color-text-muted)]" />
          </button>
          
          <button 
            onClick={() => setShowTermsModal('terms')}
            className="w-full p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex items-center justify-between hover:border-[#00D4AA]/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <ICONS.FileText size={18} className="text-[var(--color-text-muted)]" />
              <p className="text-sm font-bold text-[var(--color-text-primary)]">服务条款</p>
            </div>
            <ICONS.ArrowRight size={16} className="text-[var(--color-text-muted)]" />
          </button>
          
          <button 
            onClick={() => setShowTermsModal('privacy')}
            className="w-full p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex items-center justify-between hover:border-[#00D4AA]/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <ICONS.Shield size={18} className="text-[var(--color-text-muted)]" />
              <p className="text-sm font-bold text-[var(--color-text-primary)]">隐私政策</p>
            </div>
            <ICONS.ArrowRight size={16} className="text-[var(--color-text-muted)]" />
          </button>
          
          <button 
            onClick={() => setShowTermsModal('disclaimer')}
            className="w-full p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex items-center justify-between hover:border-[#00D4AA]/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <ICONS.AlertTriangle size={18} className="text-[var(--color-text-muted)]" />
              <p className="text-sm font-bold text-[var(--color-text-primary)]">风险免责声明</p>
            </div>
            <ICONS.ArrowRight size={16} className="text-[var(--color-text-muted)]" />
          </button>
        </div>
        
        {/* 客服信息 */}
        <div className="mt-6 p-4 bg-[#00D4AA]/5 rounded-xl border border-[#00D4AA]/20">
          <div className="flex items-start gap-3">
            <ICONS.Phone size={16} className="text-[#00D4AA] mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#00D4AA]">客服热线</p>
              <p className="text-sm font-bold text-[var(--color-text-primary)] mt-1">95551</p>
              <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">工作时间：工作日 9:00-21:00</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* 条款弹窗 */}
      {showTermsModal && (
        <TermsModal type={showTermsModal} onClose={() => setShowTermsModal(null)} />
      )}
    </div>
  );
};

export default AboutSettings;
