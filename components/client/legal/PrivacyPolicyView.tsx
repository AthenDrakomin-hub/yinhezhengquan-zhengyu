/**
 * 隐私政策页面
 * 符合《中华人民共和国个人信息保护法》要求
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

interface PrivacyPolicyViewProps {
  onBack?: () => void;
}

const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onBack }) => {
  const navigate = useNavigate();

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
        <h1 className="text-white text-lg font-semibold flex-1">隐私政策</h1>
      </div>

      {/* 内容区域 */}
      <div className="p-4 pb-20">
        <div className="bg-white rounded-xl shadow-sm p-5">
          {/* 更新日期 */}
          <p className="text-xs text-[#999999] mb-4 text-right">更新日期：2024年1月1日</p>
          
          {/* 生效日期 */}
          <p className="text-xs text-[#999999] mb-6 text-right">生效日期：2024年1月1日</p>

          {/* 引言 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold text-[#333333] mb-3">引言</h2>
            <p className="text-sm text-[#666666] leading-relaxed">
              银河证券股份有限公司（以下简称"我们"）深知个人信息对您的重要性，我们将按照法律法规要求，采取相应安全保护措施，尽力保护您的个人信息安全可控。我们制定本《隐私政策》并特别提示：希望您在使用我们的产品和服务前仔细阅读并理解本隐私政策，以便做出适当的选择。
            </p>
          </section>

          {/* 一、我们如何收集和使用您的个人信息 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold text-[#333333] mb-3">一、我们如何收集和使用您的个人信息</h2>
            
            <h3 className="text-sm font-medium text-[#333333] mb-2 mt-4">1. 账户注册与登录</h3>
            <div className="bg-[#F8F9FA] rounded-lg p-3 mb-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5E5]">
                    <th className="text-left py-2 text-[#666666]">信息类型</th>
                    <th className="text-left py-2 text-[#666666]">使用目的</th>
                  </tr>
                </thead>
                <tbody className="text-[#333333]">
                  <tr className="border-b border-[#E5E5E5]">
                    <td className="py-2">手机号码</td>
                    <td className="py-2">账户注册、身份验证、安全通知</td>
                  </tr>
                  <tr className="border-b border-[#E5E5E5]">
                    <td className="py-2">身份证号码</td>
                    <td className="py-2">实名认证、合规要求</td>
                  </tr>
                  <tr className="border-b border-[#E5E5E5]">
                    <td className="py-2">姓名</td>
                    <td className="py-2">账户开立、身份确认</td>
                  </tr>
                  <tr>
                    <td className="py-2">登录密码</td>
                    <td className="py-2">账户安全保护</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-medium text-[#333333] mb-2 mt-4">2. 交易服务</h3>
            <div className="bg-[#F8F9FA] rounded-lg p-3 mb-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5E5]">
                    <th className="text-left py-2 text-[#666666]">信息类型</th>
                    <th className="text-left py-2 text-[#666666]">使用目的</th>
                  </tr>
                </thead>
                <tbody className="text-[#333333]">
                  <tr className="border-b border-[#E5E5E5]">
                    <td className="py-2">银行账户信息</td>
                    <td className="py-2">资金存取、银证转账</td>
                  </tr>
                  <tr className="border-b border-[#E5E5E5]">
                    <td className="py-2">交易记录</td>
                    <td className="py-2">交易执行、历史查询</td>
                  </tr>
                  <tr>
                    <td className="py-2">持仓信息</td>
                    <td className="py-2">资产管理、风险控制</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-medium text-[#333333] mb-2 mt-4">3. 设备信息</h3>
            <p className="text-sm text-[#666666] leading-relaxed">
              为了保障账户安全，我们会收集您的设备信息，包括：设备型号、操作系统版本、设备标识符、IP地址、网络状态等。
            </p>
          </section>

          {/* 二、我们如何使用Cookie和同类技术 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold text-[#333333] mb-3">二、我们如何使用Cookie和同类技术</h2>
            <p className="text-sm text-[#666666] leading-relaxed">
              为确保网站正常运转、为您获得更轻松的访问体验、推荐您可能感兴趣的内容，我们会在您的计算机或移动设备上存储Cookie、Flash Cookie或浏览器提供的其他本地存储。您可以通过浏览器设置管理Cookie，但这可能影响您使用我们服务的部分功能。
            </p>
          </section>

          {/* 三、我们如何共享、转让、公开披露您的个人信息 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold text-[#333333] mb-3">三、我们如何共享、转让、公开披露您的个人信息</h2>
            
            <h3 className="text-sm font-medium text-[#333333] mb-2 mt-4">1. 共享</h3>
            <p className="text-sm text-[#666666] leading-relaxed mb-3">
              我们不会与任何公司、组织和个人共享您的个人信息，但以下情况除外：
            </p>
            <ul className="text-sm text-[#666666] leading-relaxed list-disc pl-4 space-y-1">
              <li>事先获得您明确的同意或授权</li>
              <li>根据适用的法律法规、法律程序、诉讼或政府主管部门强制性要求</li>
              <li>与授权合作伙伴共享：我们可能委托合作伙伴提供服务，包括交易所、结算机构、银行等</li>
            </ul>

            <h3 className="text-sm font-medium text-[#333333] mb-2 mt-4">2. 第三方共享清单</h3>
            <div className="bg-[#F8F9FA] rounded-lg p-3 mb-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5E5]">
                    <th className="text-left py-2 text-[#666666]">共享对象</th>
                    <th className="text-left py-2 text-[#666666]">共享信息</th>
                    <th className="text-left py-2 text-[#666666]">目的</th>
                  </tr>
                </thead>
                <tbody className="text-[#333333]">
                  <tr className="border-b border-[#E5E5E5]">
                    <td className="py-2">证券交易所</td>
                    <td className="py-2">身份信息、交易指令</td>
                    <td className="py-2">交易执行</td>
                  </tr>
                  <tr className="border-b border-[#E5E5E5]">
                    <td className="py-2">存管银行</td>
                    <td className="py-2">银行账户、资金信息</td>
                    <td className="py-2">资金存取</td>
                  </tr>
                  <tr>
                    <td className="py-2">监管机构</td>
                    <td className="py-2">必要信息</td>
                    <td className="py-2">合规报送</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-medium text-[#333333] mb-2 mt-4">3. 转让</h3>
            <p className="text-sm text-[#666666] leading-relaxed">
              我们不会将您的个人信息转让给任何公司、组织和个人，但以下情况除外：事先获得您明确的同意；涉及合并、收购、资产转让时。
            </p>

            <h3 className="text-sm font-medium text-[#333333] mb-2 mt-4">4. 公开披露</h3>
            <p className="text-sm text-[#666666] leading-relaxed">
              我们仅会在以下情况下，公开披露您的个人信息：事先获得您明确的同意；基于法律法规、法律程序、诉讼或政府主管部门强制性要求。
            </p>
          </section>

          {/* 四、我们如何保护您的个人信息 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold text-[#333333] mb-3">四、我们如何保护您的个人信息</h2>
            <p className="text-sm text-[#666666] leading-relaxed">
              我们采取以下安全措施保护您的个人信息：数据加密存储和传输、访问控制、安全审计、漏洞扫描等。我们已通过ISO27001信息安全管理体系认证，建立了完善的个人信息安全管理制度。
            </p>
          </section>

          {/* 五、您的权利 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold text-[#333333] mb-3">五、您的权利</h2>
            <p className="text-sm text-[#666666] leading-relaxed">
              您对您的个人信息享有以下权利：
            </p>
            <ul className="text-sm text-[#666666] leading-relaxed list-disc pl-4 mt-2 space-y-1">
              <li><strong>访问权</strong>：您有权访问您的个人信息</li>
              <li><strong>更正权</strong>：您有权更正不准确或不完整的个人信息</li>
              <li><strong>删除权</strong>：在特定情况下，您有权要求删除您的个人信息</li>
              <li><strong>撤回同意权</strong>：您有权撤回之前给予我们的同意</li>
              <li><strong>注销账户</strong>：您可以通过客服申请注销账户</li>
            </ul>
          </section>

          {/* 六、未成年人保护 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold text-[#333333] mb-3">六、未成年人保护</h2>
            <p className="text-sm text-[#666666] leading-relaxed">
              我们的产品和服务主要面向成年人。如果我们发现在未事先获得可证实的父母同意的情况下收集了未成年人的个人信息，则会设法尽快删除相关数据。
            </p>
          </section>

          {/* 七、隐私政策的变更 */}
          <section className="mb-6">
            <h2 className="text-base font-semibold text-[#333333] mb-3">七、隐私政策的变更</h2>
            <p className="text-sm text-[#666666] leading-relaxed">
              我们可能会适时修订本隐私政策。当隐私政策发生变更时，我们会在版本更新时向您展示变更后的隐私政策。未经您明确同意，我们不会限制您按照本隐私政策所应享有的权利。
            </p>
          </section>

          {/* 八、联系我们 */}
          <section className="mb-4">
            <h2 className="text-base font-semibold text-[#333333] mb-3">八、联系我们</h2>
            <div className="bg-[#F8F9FA] rounded-lg p-3">
              <p className="text-sm text-[#666666] mb-2">如果您对本隐私政策有任何疑问、意见或建议，可通过以下方式联系我们：</p>
              <ul className="text-sm text-[#666666] space-y-1">
                <li>客服热线：<span className="text-[#0066CC]">95551</span></li>
                <li>公司地址：北京市西城区金融大街35号国际企业大厦C座</li>
                <li>邮箱：<span className="text-[#0066CC]">service@chinastock.com.cn</span></li>
              </ul>
              <p className="text-sm text-[#666666] mt-3">
                一般情况下，我们将在15个工作日内回复。
              </p>
            </div>
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

export default PrivacyPolicyView;
