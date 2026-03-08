import React from 'react';
import { FaTimes, FaShieldAlt } from 'react-icons/fa';

interface WebsiteDisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WebsiteDisclaimerModal: React.FC<WebsiteDisclaimerModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 弹窗内容 - 全屏 */}
      <div className="relative bg-white w-full h-full flex flex-col animate-in fade-in duration-200">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-[#0F2B5C] to-[#1E3A8A] px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <FaShieldAlt className="text-white text-xl" />
            <h2 className="text-white font-semibold text-lg">网站声明及安全提示</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white transition p-1 hover:bg-white/10 rounded"
          >
            <FaTimes size={20} />
          </button>
        </div>
        
        {/* 内容区域 */}
        <div className="flex-1 p-6 overflow-y-auto text-sm text-gray-700 leading-relaxed">
          <div className="mb-4 text-gray-600">
            衷心欢迎您访问"中国银河证券网"，"中国银河证券网"是我司的官方网站，网址为 http://www.chinastock.com.cn。请您将正确的网址加入到收藏夹，以防止进入假冒网站。
          </div>
          <div className="mb-4 text-gray-600">
            本声明及安全提示包括网站声明和网站安全提示两部分内容，请仔细阅读。您在"中国银河证券网"的一切行为将被视为您接受以下声明条款。
          </div>
          
          <h3 className="font-bold text-gray-900 mt-6 mb-3 text-base">一、网站声明</h3>
          
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>本网站提供的信息（包括但不限于股评、投资分析报告、股市披露文章信息及其他评论、数据、图表、理论、直接的或暗示的标示）等仅供参考，我司力求但不保证信息的准确性、完整性，相关信息以中国证监会指定披露上市公司信息报刊为准。我司不对因使用本网站全部或部分内容而产生的或因依赖本网站内容而引起的任何损失承担任何责任。</li>
            <li>本网站可能提供部分与其他网站的链接，前述链接仅为方便您的使用，我司不对所链接到的网站的信息的真实性、有效性、合法性承担任何责任。</li>
            <li>您了解并同意，本网站可能因地震、其他自然灾害或相关电信部门的互联网硬件设施故障或遗失，或人为操作疏忽而全部或部分中断、延迟、遗漏、误导或造成资料传输或储存上的错误，或遭受第三人侵入系统篡改或变造您资料等，对因此产生的损失我司不承担任何责任。</li>
            <li>未经我司书面事先授权，您不得以任何方式或目的使用本网站所载商标、徽号和服务标志，同时您不得将本网站所载信息、资料作任何修改、复制、转载、储存于检索系统、传送、分发或进行其他侵权行为。</li>
            <li>您通过本网站向我司提供的注册资料，包括姓名、地址、联系方式等，必须是真实、有效、准确的。一旦发现您提供虚假资料，我司保留在不通知的情况下删除您资料的权利。您了解并同意，必要时，我们可能需要您提供有关证件资料，以核实您提供信息的真实性。</li>
            <li>请妥善保管好您的用户名和密码。通过您的用户名和密码编制、发布的任何信息或做出的任何行为将都被视为是您自己的行为，对因此产生的任何损失我司不承担任何责任。</li>
            <li>请您严格遵守中华人民共和国信息产业部等三个部门公布的《互联网电子公告服务管理规定》，不在本网站上发布违规内容。</li>
            <li>本网站上提供的某些产品和服务是只开放给拥有特定权限的客户的，我司不保证您能看到所有的内容。</li>
            <li>我司保留对网站页面包含的信息和资料及其显示的条款、条件进行说明和变更的权利。</li>
            <li>本网站某些页面可能包含单独条款和条件，作为对本声明的补充，如果与本声明有不一致之处，以该单独条款条件为准。</li>
          </ol>
          
          <h3 className="font-bold text-gray-900 mt-6 mb-3 text-base">二、网站安全提示</h3>
          
          <div className="mb-3 text-gray-600">
            鉴于目前不断出现假冒网站、钓鱼网站、短信及邮件诈骗等网络诈骗行为，我司提高安全防范意识、谨防上当受骗。
          </div>
          <div className="mb-3 text-gray-600">
            我司不会通过短信、电话、邮件或任何其他渠道进行诱导交易、收取会员费或分成等非法证券活动。您如收到类似的短信、电话或看到类似的网站，请明辨真伪、谨防受骗，同时欢迎您举报有关非法行为，举报电话：4008-888-888，举报邮箱：websecurity@chinastock.com.cn。
          </div>
          
          <p className="font-medium text-gray-900 mb-2">请您从以下几方面提高警惕：</p>
          
          <p className="font-medium text-gray-800 mt-4 mb-2">1. 请保护好您的账号及密码</p>
          <ol className="list-decimal list-inside space-y-1 ml-2 text-gray-600">
            <li>请不要通过任何方式泄露自己的账号及密码（包括但不限于资金密码、交易密码、证书密码，下同）。无论任何单位、个人（包括我司及我司员工）通过电话、短信、邮件或任何其他方式向您索要密码，请您重置密码。</li>
            <li>账户初始密码使用"888888"、"123456"及"出生日期"等简单且容易被猜中的密码。</li>
            <li>请定期更换密码，建议至少每三个月更换一次。</li>
            <li>请不要在计算机上保存您的密码，同时尽量不要使用公共场所的计算机登录。</li>
            <li>若系统提示"上次登录系统的时间、IP地址、预留信息"等信息，请您校验信息，以便及时发现异常情况。</li>
          </ol>
          
          <p className="font-medium text-gray-800 mt-4 mb-2">2. 提高安全意识，杜绝安全隐患</p>
          <ol className="list-decimal list-inside space-y-1 ml-2 text-gray-600">
            <li>请不要随意点击或访问不信任的网站，网站弹出对您提示信息或安装提示软件时，在无法肯定的且正是安全的网站之前不要轻易点击确认。</li>
            <li>请不要随意打开邮件及其附件。不信任的邮件请不要轻易打开，也不要点击邮件中的链接。</li>
            <li>请尽量不要在网吧等公共场合使用网上交易。在每次使用网上交易系统后，不要只关闭浏览器，请点击页面上的"退出登录"来安全退出网上交易。</li>
          </ol>
          
          <p className="font-medium text-gray-800 mt-4 mb-2">3. 请做好防病毒计划</p>
          <ol className="list-decimal list-inside space-y-1 ml-2 text-gray-600">
            <li>计算机安装操作系统后，请及时安装系统和浏览器的最新补丁，并经常使用系统更新功能，杜绝系统自身的安全漏洞；</li>
            <li>建议安装个人防火墙，只开启必要的应用程序的端口，防止黑客入侵您的计算机；</li>
            <li>请安装杀毒软件，并及时更新病毒库，防止病毒入侵；</li>
            <li>请不要轻易使用来源不明的CDROM、USB磁盘等存储介质，以防止病毒传播；</li>
            <li>计算机上安装的软件（如QQ、MSN等）请尽量使用最新版本。</li>
          </ol>
        </div>
        
        {/* 底部关闭按钮 */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg transition font-medium"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebsiteDisclaimerModal;
