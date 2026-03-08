import React, { useState, useRef } from 'react';
import { FaCheckCircle, FaPen, FaShieldAlt } from 'react-icons/fa';
import SignatureCanvas from 'react-signature-canvas';

interface AccountOpeningAgreementProps {
  onSubmit?: (data: AgreementData) => void;
  onCancel?: () => void;
}

export interface AgreementData {
  agreements: {
    read: boolean;
    promise: boolean;
    risk: boolean;
    electronic: boolean;
  };
  signature: string | null;
  date: string;
}

const AccountOpeningAgreement: React.FC<AccountOpeningAgreementProps> = ({ 
  onSubmit, 
  onCancel 
}) => {
  const [agreed, setAgreed] = useState({
    read: false,
    promise: false,
    risk: false,
    electronic: false,
  });
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);

  const allChecked = Object.values(agreed).every(Boolean) && signatureImage !== null;

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAgreed({ ...agreed, [e.target.name]: e.target.checked });
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
    setSignatureImage(null);
  };

  const saveSignature = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataURL = sigCanvas.current.getCanvas().toDataURL('image/png');
      setSignatureImage(dataURL);
    } else {
      alert('请先完成签名');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (allChecked) {
      const agreementData: AgreementData = {
        agreements: agreed,
        signature: signatureImage,
        date,
      };
      
      if (onSubmit) {
        await onSubmit(agreementData);
      }
      
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
        <div className="bg-white max-w-2xl w-full rounded-xl shadow-lg p-8 text-center">
          <FaCheckCircle className="text-6xl text-[#10B981] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#1F2937] mb-2">签署成功</h2>
          <p className="text-[#6B7280] mb-6">您已成功签署《客户账户开户协议》，感谢您选择中国银河证券·证裕交易单元。</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.location.href = '/'}
              className="bg-[#2563EB] hover:bg-[#1E4BB3] text-white px-6 py-3 rounded-lg font-medium transition"
            >
              返回首页
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="bg-[#10B981] hover:bg-[#059669] text-white px-6 py-3 rounded-lg font-medium transition"
            >
              去登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* 品牌标识 */}
        <div className="flex items-center justify-between mb-6 border-b border-[#E5E7EB] pb-4">
          <div className="flex items-center gap-2">
            <img
              src="https://rfnrosyfeivcbkimjlwo.supabase.co/storage/v1/object/sign/tupian/logo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81OTE1YzMzMC03MGY2LTQ2ZmQtOGViMy01YzdjZDA2ODQ4NjgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0dXBpYW4vbG9nby5wbmciLCJpYXQiOjE3NzI5NTgyMDUsImV4cCI6MTgwNDQ5NDIwNX0.YUIr129FJb48hSjatqZYc4bSOJ-_1k4LlJk5YxwJQyM"
              alt="中国银河证券"
              className="h-8 w-auto"
            />
          </div>
          <span className="text-sm text-[#6B7280]">客户账户开户协议</span>
        </div>

        {/* 协议内容卡片 */}
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-[#E5E7EB]">
          {/* 协议内容 - 可滚动区域 */}
          <div className="p-6 sm:p-8 max-h-[400px] overflow-y-auto bg-[#F9FAFB] border-b border-[#E5E7EB]">
            <div className="prose prose-sm max-w-none text-[#1F2937]">
              <h1 className="text-xl font-bold text-center text-[#1F2937] mb-2">中国银河证券·证裕交易单元</h1>
              <h2 className="text-lg font-semibold text-center text-[#2563EB] mb-6">客户账户开户协议</h2>
              
              <div className="text-sm text-[#4B5563] space-y-4">
                <p className="italic bg-yellow-50 border-l-4 border-yellow-400 p-3">
                  <strong>重要提示：</strong>本协议是您与中国银河证券股份有限公司（以下简称"本公司"）就开立证券账户及使用相关服务所订立的有效法律文件。请您仔细阅读本协议所有条款（特别是加粗或下划线标注的条款），充分理解证券投资的风险。如有任何疑问，请咨询本公司客服或您的客户经理。
                </p>

                <h3 className="font-bold text-[#1F2937] mt-6">第一条 账户开立</h3>
                <p>1.1 甲方（客户）自愿向乙方（中国银河证券股份有限公司）申请开立证券账户，用于进行证券交易及相关业务。</p>
                <p>1.2 甲方保证所提供的开户资料真实、准确、完整、有效。如有虚假，甲方愿承担由此引起的一切法律责任和经济损失。</p>
                <p>1.3 甲方同意乙方根据相关法律法规及监管要求，对甲方的身份信息、资产状况、投资经验等进行适当性管理。</p>

                <h3 className="font-bold text-[#1F2937] mt-6">第二条 身份识别与验证</h3>
                <p>2.1 甲方同意乙方通过人脸识别、银行卡验证等方式进行身份识别与验证。</p>
                <p>2.2 甲方保证在使用本服务过程中，进行人脸识别时为本人操作，不得使用照片、视频等伪造手段。</p>
                <p>2.3 如甲方身份信息发生变更，应及时通知乙方并办理变更手续。</p>

                <h3 className="font-bold text-[#1F2937] mt-6">第三条 风险提示</h3>
                <p className="font-semibold text-red-600">3.1 甲方充分了解证券投资存在以下风险：</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>市场风险：证券价格受多种因素影响而波动，可能导致投资损失。</li>
                  <li>信用风险：交易对手方可能无法履行合约义务。</li>
                  <li>流动性风险：某些证券可能难以在期望的时间和价格上买卖。</li>
                  <li>操作风险：因系统故障、网络中断等原因导致交易失败或延误。</li>
                  <li>政策风险：国家政策、法律法规变化可能影响证券市场。</li>
                </ul>
                <p className="font-semibold text-red-600">3.2 甲方确认：证券投资有风险，入市需谨慎。甲方自愿承担投资风险，不要求乙方保证投资收益或承担投资损失。</p>

                <h3 className="font-bold text-[#1F2937] mt-6">第四条 交易委托</h3>
                <p>4.1 甲方可通过乙方提供的交易终端进行证券交易委托。</p>
                <p>4.2 甲方应妥善保管账户密码、交易密码、资金密码等安全信息，因密码泄露导致的损失由甲方自行承担。</p>
                <p>4.3 甲方确认通过乙方交易系统发出的所有委托指令均为甲方真实意思表示。</p>

                <h3 className="font-bold text-[#1F2937] mt-6">第五条 资金与证券</h3>
                <p>5.1 甲方保证用于证券交易的资金来源合法，不属于洗钱资金或其他非法资金。</p>
                <p>5.2 甲方同意乙方按照监管要求对甲方的资金进行第三方存管。</p>
                <p>5.3 甲方确认证券账户内的证券资产权属清晰，不存在权属争议。</p>

                <h3 className="font-bold text-[#1F2937] mt-6">第六条 信息披露</h3>
                <p>6.1 甲方同意乙方按照法律法规及监管要求，向有权机关提供甲方的账户信息及交易信息。</p>
                <p>6.2 乙方承诺对甲方的个人信息和交易信息严格保密，未经甲方同意不向第三方披露（法律法规另有规定的除外）。。</p>

                <h3 className="font-bold text-[#1F2937] mt-6">第七条 电子签名与协议效力</h3>
                <p>7.1 甲方同意本协议通过电子签名方式签署，甲方在电子协议上的签名与纸质签名具有同等法律效力。</p>
                <p>7.2 本协议自甲方电子签名且乙方系统确认之日起生效。</p>
                <p>7.3 本协议的电子文本保存在乙方系统中，甲方可随时查询下载。</p>

                <h3 className="font-bold text-[#1F2937] mt-6">第八条 违约责任</h3>
                <p>8.1 任何一方违反本协议约定，应承担相应的违约责任。</p>
                <p>8.2 因甲方提供虚假信息或违反法律法规导致的损失，由甲方自行承担。</p>

                <h3 className="font-bold text-[#1F2937] mt-6">第九条 争议解决</h3>
                <p>9.1 本协议的订立、执行和解释及争议的解决均适用中华人民共和国法律。</p>
                <p>9.2 因本协议引起的或与本协议有关的任何争议，双方应友好协商解决；协商不成的，任何一方均可向乙方所在地有管辖权的人民法院提起诉讼。</p>

                <h3 className="font-bold text-[#1F2937] mt-6">第十条 其他</h3>
                <p>10.1 本协议未尽事宜，按照相关法律法规及乙方的业务规则执行。</p>
                <p>10.2 乙方有权根据法律法规变化或业务发展需要，对本协议进行修改，修改后的协议将在乙方网站或交易终端公布。</p>
                <p>10.3 本协议一式两份，甲乙双方各执一份，具有同等法律效力。</p>

                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                  <p className="font-semibold">甲方（客户）声明：</p>
                  <p>本人已认真阅读并完全理解上述协议条款，自愿申请开立证券账户并遵守本协议约定。</p>
                </div>
              </div>
            </div>
          </div>

          {/* 确认和签名区域 */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 bg-white">
            <h3 className="font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
              <FaPen className="text-[#2563EB]" /> 投资者确认与签署
            </h3>
            <p className="text-sm text-[#6B7280] mb-4">请逐项勾选确认：</p>

            <div className="space-y-3 mb-6">
              <label className="flex items-start gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded transition">
                <input
                  type="checkbox"
                  name="read"
                  checked={agreed.read}
                  onChange={handleCheckboxChange}
                  className="mt-1 accent-[#2563EB] w-4 h-4"
                />
                <span className="text-[#4B5563]">本人已认真阅读并完全理解本协议所有条款，特别是加粗的风险提示和免责条款。</span>
              </label>
              <label className="flex items-start gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded transition">
                <input
                  type="checkbox"
                  name="promise"
                  checked={agreed.promise}
                  onChange={handleCheckboxChange}
                  className="mt-1 accent-[#2563EB] w-4 h-4"
                />
                <span className="text-[#4B5563]">本人承诺所提供开户资料真实、准确、完整，并愿意承担因资料不实引发的一切后果。</span>
              </label>
              <label className="flex items-start gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded transition">
                <input
                  type="checkbox"
                  name="risk"
                  checked={agreed.risk}
                  onChange={handleCheckboxChange}
                  className="mt-1 accent-[#2563EB] w-4 h-4"
                />
                <span className="text-[#4B5563]">本人确认证券投资风险由自己承担，不要求证券公司保证收益或承担亏损。</span>
              </label>
              <label className="flex items-start gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded transition">
                <input
                  type="checkbox"
                  name="electronic"
                  checked={agreed.electronic}
                  onChange={handleCheckboxChange}
                  className="mt-1 accent-[#2563EB] w-4 h-4"
                />
                <span className="text-[#4B5563]">本人同意本协议通过电子签名方式签署，与纸质签字具有同等法律效力。</span>
              </label>
            </div>

            {/* 手写签名区域 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#374151] mb-2">客户手写签名 <span className="text-red-500">*</span></label>
              <div className="border border-[#E5E7EB] rounded-lg p-3 bg-white">
                <SignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{
                    width: 600,
                    height: 150,
                    className: 'w-full h-[150px] border border-gray-200 rounded cursor-crosshair bg-white',
                    style: { touchAction: 'none' },
                  }}
                  backgroundColor="white"
                  penColor="#1F2937"
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="px-4 py-2 text-sm border border-[#E5E7EB] rounded hover:bg-gray-50 text-[#6B7280] transition"
                  >
                    清空重签
                  </button>
                  <button
                    type="button"
                    onClick={saveSignature}
                    className="px-4 py-2 text-sm bg-[#2563EB] text-white rounded hover:bg-[#1E4BB3] transition"
                  >
                    确认签名
                  </button>
                </div>
              </div>
              {signatureImage && (
                <p className="text-sm text-[#10B981] mt-2 flex items-center gap-1">
                  <FaCheckCircle /> 签名已保存，可进行下一步
                </p>
              )}
            </div>

            {/* 签署日期 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#374151] mb-1">签署日期 <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                required
              />
            </div>

            {/* 公司盖章区域 */}
            <div className="mb-6 flex items-center gap-4 border-t border-[#E5E7EB] pt-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-[#374151] mb-1">公司盖章</p>
                <img
                  src="https://rfnrosyfeivcbkimjlwo.supabase.co/storage/v1/object/sign/tupian/photo_2026-03-08_19-53-39.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81OTE1YzMzMC03MGY2LTQ2ZmQtOGViMy01YzdjZDA2ODQ4NjgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0dXBpYW4vcGhvdG9fMjAyNi0wMy0wOF8xOS01My0zOS5qcGciLCJpYXQiOjE3NzI5NzEzMTEsImV4cCI6MTgwNDUwNzMxMX0.JmnXvaUK8ZgUMxC1HuFbroVakrNLDEDRbSbOFVyvbuY"
                  alt="中国银河证券·证裕交易单元公章"
                  className="h-16 w-auto opacity-80 hover:opacity-100 transition-opacity"
                  title="电子公章"
                />
              </div>
              <div className="flex-1 text-xs text-[#6B7280]">
                <p className="flex items-center gap-1"><FaShieldAlt className="text-[#9CA3AF]" /> 电子公章与实体公章具有同等法律效力</p>
                <p className="mt-1">盖章日期：{new Date().toLocaleDateString('zh-CN')}</p>
              </div>
            </div>

            {/* 按钮区域 */}
            <div className="flex gap-4">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 py-3 rounded-lg font-semibold border border-[#E5E7EB] text-[#6B7280] hover:bg-gray-50 transition"
                >
                  取消
                </button>
              )}
              <button
                type="submit"
                disabled={!allChecked}
                className={`flex-1 py-3 rounded-lg font-semibold text-white transition ${
                  allChecked
                    ? 'bg-[#2563EB] hover:bg-[#1E4BB3]'
                    : 'bg-[#9CA3AF] cursor-not-allowed'
                }`}
              >
                确认签署
              </button>
            </div>

            <p className="text-xs text-[#9CA3AF] text-center mt-4 flex items-center justify-center gap-1">
              <FaShieldAlt /> 本协议签署后将具有法律效力，请确保您已充分理解。
            </p>
          </form>
        </div>

        {/* 页脚 */}
        <div className="text-center text-xs text-[#9CA3AF] mt-6">
          Copyright © 2026 中国银河证券·证裕交易单元 版权所有 | 许可证号：Z123456
        </div>
      </div>
    </div>
  );
};

export default AccountOpeningAgreement;
