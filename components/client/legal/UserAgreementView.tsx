/**
 * 用户服务协议页面
 * 证券交易服务协议
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface UserAgreementViewProps {
  onBack?: () => void;
}

const UserAgreementView: React.FC<UserAgreementViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [signDate, setSignDate] = useState<string>('--');

  // 获取用户注册时间作为签署时间
  useEffect(() => {
    const fetchUserSignDate = async () => {
      if (user) {
        try {
          // 从 auth.users 获取注册时间
          const { data, error } = await supabase
            .from('profiles')
            .select('created_at')
            .eq('id', user.id)
            .single();
          
          if (data?.created_at) {
            const date = new Date(data.created_at);
            setSignDate(date.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }));
          } else if (user.created_at) {
            // 如果 profiles 没有数据，使用 auth.users 的 created_at
            const date = new Date(user.created_at);
            setSignDate(date.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }));
          }
        } catch (error) {
          // 使用 auth 用户的 created_at
          if (user.created_at) {
            const date = new Date(user.created_at);
            setSignDate(date.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }));
          }
        }
      }
    };

    fetchUserSignDate();
  }, [user]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* 顶部导航 */}
      <div className="bg-[#0066CC] px-4 py-3 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={handleBack} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white text-lg font-semibold flex-1">用户服务协议</h1>
      </div>

      {/* 内容区域 */}
      <div className="p-4 pb-20">
        <div className="bg-white rounded-xl shadow-sm p-5">
          {/* 签署时间 */}
          {user && (
            <div className="bg-[#E3F2FD] rounded-lg p-3 mb-4 border border-[#90CAF9]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#1565C0]">您的签署时间</span>
                <span className="text-sm font-medium text-[#0D47A1]">{signDate}</span>
              </div>
            </div>
          )}
          
          {/* 更新日期 */}
          <p className="text-xs text-[#999999] mb-4 text-right">更新日期：2024年1月1日</p>
          
          {/* 生效日期 */}
          <p className="text-xs text-[#999999] mb-6 text-right">生效日期：2024年1月1日</p>

          {/* 协议标题 */}
          <h1 className="text-lg font-bold text-[#333333] text-center mb-6">
            银河证券网上证券交易服务协议
          </h1>

          {/* 重要提示 */}
          <div className="bg-[#FFF7ED] rounded-lg p-4 mb-6 border border-[#FED7AA]">
            <h3 className="text-sm font-semibold text-[#EA580C] mb-2">⚠️ 重要提示</h3>
            <p className="text-xs text-[#92400E] leading-relaxed">
              在您使用银河证券网上证券交易服务前，请仔细阅读本协议全部内容。您通过网络页面点击"同意"按钮或实际使用网上证券交易服务，即表示您已充分阅读、理解并接受本协议的全部内容。
            </p>
          </div>

          {/* 一、协议双方 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold text-[#333333] mb-3">一、协议双方</h2>
            <p className="text-sm text-[#666666] leading-relaxed">
              本协议是您（以下简称"甲方"或"投资者"）与银河证券股份有限公司（以下简称"乙方"或"证券公司"）之间关于网上证券交易服务相关事宜的协议。乙方是经中国证券监督管理委员会批准设立的综合类证券公司。
            </p>
          </section>

          {/* 二、服务内容 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold text-[#333333] mb-3">二、服务内容</h2>
            <p className="text-sm text-[#666666] leading-relaxed mb-2">乙方为甲方提供以下网上证券交易服务：</p>
            <ul className="text-sm text-[#666666] leading-relaxed list-disc pl-4 space-y-1">
              <li>证券账户开户、销户、资料变更</li>
              <li>证券交易委托、撤单</li>
              <li>资金存取、银证转账</li>
              <li>证券余额、资金余额、成交情况查询</li>
              <li>新股申购、配股认购</li>
              <li>理财产品购买、赎回</li>
              <li>行情查询、资讯服务</li>
              <li>其他经双方约定的服务</li>
            </ul>
          </section>

          {/* 三、甲方权利与义务 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold text-[#333333] mb-3">三、甲方权利与义务</h2>
            <h3 className="text-sm font-medium text-[#333333] mb-2">1. 甲方权利</h3>
            <ul className="text-sm text-[#666666] leading-relaxed list-disc pl-4 mb-3 space-y-1">
              <li>通过乙方网上交易系统进行证券交易</li>
              <li>查询账户资金、证券余额及交易记录</li>
              <li>获取乙方提供的证券交易相关信息服务</li>
              <li>对乙方服务提出意见和建议</li>
              <li>法律、法规及本协议规定的其他权利</li>
            </ul>
            
            <h3 className="text-sm font-medium text-[#333333] mb-2">2. 甲方义务</h3>
            <ul className="text-sm text-[#666666] leading-relaxed list-disc pl-4 space-y-1">
              <li>保证提供的身份信息真实、准确、完整</li>
              <li>妥善保管账户密码，不得转借他人</li>
              <li>对账户内的所有活动和事件负法律责任</li>
              <li>及时更新变更的身份信息</li>
              <li>遵守证券法律法规及交易所规则</li>
              <li>承担因违反本协议而产生的全部责任</li>
            </ul>
          </section>

          {/* 四、乙方权利与义务 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold text-[#333333] mb-3">四、乙方权利与义务</h2>
            <h3 className="text-sm font-medium text-[#333333] mb-2">1. 乙方权利</h3>
            <ul className="text-sm text-[#666666] leading-relaxed list-disc pl-4 mb-3 space-y-1">
              <li>对甲方身份进行核实验证</li>
              <li>对异常交易行为进行监控和报告</li>
              <li>在法律法规规定的情况下拒绝或暂停服务</li>
              <li>依法收取相关佣金和费用</li>
            </ul>
            
            <h3 className="text-sm font-medium text-[#333333] mb-2">2. 乙方义务</h3>
            <ul className="text-sm text-[#666666] leading-relaxed list-disc pl-4 space-y-1">
              <li>保障网上交易系统的安全、稳定运行</li>
              <li>准确、及时执行甲方的交易指令</li>
              <li>妥善保管甲方资料，保护甲方隐私</li>
              <li>按照甲方要求提供交易凭证和记录</li>
              <li>及时通知甲方账户异常情况</li>
            </ul>
          </section>

          {/* 五、风险揭示 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold text-[#333333] mb-3">五、风险揭示</h2>
            <div className="bg-[#FFF0F0] rounded-lg p-4 border border-[#FECACA]">
              <h3 className="text-sm font-semibold text-[#DC2626] mb-2">⚠️ 重要风险提示</h3>
              <ul className="text-xs text-[#991B1B] leading-relaxed space-y-2">
                <li><strong>市场风险</strong>：证券市场价格波动可能导致投资损失，投资者应根据自身风险承受能力审慎决策。</li>
                <li><strong>技术风险</strong>：网络传输存在不确定性，可能因网络故障、通讯线路等原因导致交易失败或延迟。</li>
                <li><strong>账户安全风险</strong>：密码泄露、设备遗失等可能导致账户被盗用，投资者应妥善保管账户信息。</li>
                <li><strong>系统风险</strong>：网上交易系统可能因维护、升级等原因暂停服务，投资者应预留其他交易渠道。</li>
                <li><strong>政策风险</strong>：相关法律法规、监管政策的变化可能影响投资收益。</li>
              </ul>
            </div>
          </section>

          {/* 六、交易规则 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold text-[#333333] mb-3">六、交易规则</h2>
            <ul className="text-sm text-[#666666] leading-relaxed list-disc pl-4 space-y-2">
              <li>交易时间：每个交易日9:15-11:30，13:00-15:00（法定节假日除外）</li>
              <li>委托方式：限价委托、市价委托等</li>
              <li>交易单位：A股买入委托数量应为100股或其整数倍，卖出委托可为零股</li>
              <li>涨跌幅限制：主板10%，科创板、创业板20%（具体以交易所规则为准）</li>
              <li>资金结算：T+1日结算，A股实行T+1交易制度</li>
              <li>收费标准：佣金、印花税、过户费等按国家和交易所规定执行</li>
            </ul>
          </section>

          {/* 七、免责条款 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold text-[#333333] mb-3">七、免责条款</h2>
            <p className="text-sm text-[#666666] leading-relaxed mb-2">因下列情况导致甲方损失的，乙方不承担责任：</p>
            <ul className="text-sm text-[#666666] leading-relaxed list-disc pl-4 space-y-1">
              <li>不可抗力因素（如自然灾害、战争等）</li>
              <li>电力、通讯、网络等公共设施故障</li>
              <li>证券交易所、登记结算公司等第三方原因</li>
              <li>甲方密码泄露或账户被盗用</li>
              <li>甲方操作不当或违反本协议</li>
              <li>政府行为、法律法规或监管政策变化</li>
            </ul>
          </section>

          {/* 八、协议变更与终止 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold text-[#333333] mb-3">八、协议变更与终止</h2>
            <p className="text-sm text-[#666666] leading-relaxed">
              乙方有权修改本协议内容，修改后的协议将在网站或APP公布。如甲方不同意修改内容，可选择停止使用服务；如甲方继续使用，则视为同意修改后的协议。甲方有权随时申请终止本协议，但须结清全部交易及费用后方可办理销户手续。
            </p>
          </section>

          {/* 九、争议解决 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold text-[#333333] mb-3">九、争议解决</h2>
            <p className="text-sm text-[#666666] leading-relaxed">
              因本协议引起的或与本协议有关的任何争议，双方应友好协商解决；协商不成的，任何一方均可向乙方所在地有管辖权的人民法院提起诉讼。本协议适用中华人民共和国法律。
            </p>
          </section>

          {/* 十、其他条款 */}
          <section className="mb-4">
            <h2 className="text-base font-semibold text-[#333333] mb-3">十、其他条款</h2>
            <ul className="text-sm text-[#666666] leading-relaxed list-disc pl-4 space-y-1">
              <li>本协议自甲方同意并开通网上交易服务时生效</li>
              <li>本协议未尽事宜，按照国家法律法规及证券监管规定执行</li>
              <li>本协议条款部分无效不影响其他条款的效力</li>
              <li>乙方对本协议拥有最终解释权</li>
            </ul>
          </section>

          {/* 底部说明 */}
          <div className="border-t border-[#E5E5E5] pt-4 mt-6">
            <p className="text-xs text-[#999999] text-center">
              银河证券股份有限公司 版权所有
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAgreementView;
