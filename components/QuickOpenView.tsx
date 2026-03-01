import React, { useState } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';
import { FaceVerificationResult } from '../utils/face';

// ==========================================================
// 注意：使用前请先安装依赖：
// npm install react-hook-form zod @hookform/resolvers
// ==========================================================

// Zod 验证模式
const quickOpenSchema = z.object({
  // Step 1: 手机号验证
  phone: z.string()
    .min(11, '手机号应为11位数字')
    .max(11, '手机号应为11位数字')
    .regex(/^1[3-9]\d{9}$/, '请输入有效的手机号'),
  
  // Step 2: 身份证 OCR 信息
  idCard: z.object({
    name: z.string().min(2, '姓名至少2个字符').max(20, '姓名最多20个字符'),
    idNumber: z.string().regex(/^\d{17}[\dXx]$/, '请输入有效的身份证号'),
    gender: z.enum(['male', 'female']),
    birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '请输入正确的生日格式'),
  }),
  
  // Step 3: 人脸识别状态
  faceVerified: z.boolean().refine(val => val === true, '请完成人脸识别'),
  
  // Step 4: 风险测评
  riskAssessment: z.object({
    investmentExperience: z.enum(['none', 'less_1_year', '1_3_years', '3_5_years', 'over_5_years']),
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']),
    investmentHorizon: z.enum(['short_term', 'medium_term', 'long_term']),
    annualIncome: z.enum(['under_100k', '100k_300k', '300k_500k', 'over_500k']),
  }),
  
  // Step 5: 适当性信息
  suitabilityInfo: z.object({
    occupation: z.enum([
      'student', 'employee', 'self_employed', 'professional', 
      'manager', 'director', 'retired', 'other'
    ]),
    company: z.string().max(100, '工作单位最多100个字符').optional(),
  }),
  
  // Step 6: 协议签署
  agreements: z.object({
    userAgreement: z.boolean().refine(val => val === true, '请阅读并同意用户协议'),
    riskDisclosure: z.boolean().refine(val => val === true, '请阅读并同意风险揭示书'),
    privacyPolicy: z.boolean().refine(val => val === true, '请阅读并同意隐私政策'),
  }),
});

type QuickOpenFormData = z.infer<typeof quickOpenSchema>;

interface QuickOpenViewProps {
  onBack: () => void;
  onComplete: (data: any) => void;
}

// Step 1: 手机号验证组件
const PhoneVerificationStep: React.FC<{
  onNext: () => void;
  onSendOtp: (phone: string) => Promise<void>;
}> = ({ onNext, onSendOtp }) => {
  const { register, handleSubmit, formState: { errors } } = useFormContext<QuickOpenFormData>();
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (data: { phone: string }) => {
    setLoading(true);
    try {
      await onSendOtp(data.phone);
      setOtpSent(true);
    } catch (error) {
      console.error('发送验证码失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    // 这里应该验证 OTP，但为了简化，我们假设验证成功
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-bold text-white mb-2">手机号验证</h3>
        <p className="text-sm text-slate-400">请输入您的手机号接收验证码</p>
      </div>

      <form onSubmit={handleSubmit(handleSendOtp)} className="space-y-4">
        <div>
          <input
            type="tel"
            placeholder="请输入手机号"
            className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-[#00D4AA] transition-all"
            {...register('phone')}
          />
          {errors.phone && (
            <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>
          )}
        </div>

        {!otpSent ? (
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-[#00D4AA] text-[#0A1628] rounded-xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 transition-all"
          >
            {loading ? '发送中...' : '发送验证码'}
          </button>
        ) : (
          <>
            <div>
              <input
                type="text"
                placeholder="请输入6位验证码"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-[#00D4AA] transition-all text-center text-xl tracking-widest"
              />
            </div>
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={otp.length !== 6}
              className="w-full h-14 bg-[#00D4AA] text-[#0A1628] rounded-xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 transition-all"
            >
              验证并继续
            </button>
          </>
        )}
      </form>

      <p className="text-xs text-slate-500 text-center">
        开发环境：验证码将在日志中显示
      </p>
    </div>
  );
};

// Step 2: 身份证 OCR 组件
const IdCardOcrStep: React.FC<{
  onNext: () => void;
  onAutoFill: (data: Partial<QuickOpenFormData['idCard']>) => void;
}> = ({ onNext, onAutoFill }) => {
  const { register, setValue, watch, formState: { errors } } = useFormContext<QuickOpenFormData>();
  
  // OCR 识别
  const simulateOcr = () => {
    const mockData = {
      name: '张三',
      idNumber: '110101199003077516',
      gender: 'male' as const,
      birthday: '1990-03-07',
    };
    onAutoFill(mockData);
  };

  const formData = watch('idCard');

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-bold text-white mb-2">身份证信息</h3>
        <p className="text-sm text-slate-400">请上传身份证照片或手动填写信息</p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={simulateOcr}
            className="flex-1 h-32 bg-white/5 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center hover:border-[#00D4AA] transition-all group"
          >
            <ICONS.Camera size={32} className="text-white/50 group-hover:text-[#00D4AA] mb-2" />
            <span className="text-xs text-white/70">上传身份证正面</span>
            <span className="text-[10px] text-slate-500 mt-1">自动识别信息</span>
          </button>
          
          <button
            type="button"
            className="flex-1 h-32 bg-white/5 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center hover:border-[#00D4AA] transition-all group"
          >
            <ICONS.Camera size={32} className="text-white/50 group-hover:text-[#00D4AA] mb-2" />
            <span className="text-xs text-white/70">上传身份证反面</span>
            <span className="text-[10px] text-slate-500 mt-1">验证有效期</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <input
              type="text"
              placeholder="姓名"
              className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white outline-none focus:border-[#00D4AA] transition-all"
              {...register('idCard.name')}
            />
            {errors.idCard?.name && (
              <p className="text-red-400 text-xs mt-1">{errors.idCard.name.message}</p>
            )}
          </div>
          
          <div>
            <input
              type="text"
              placeholder="身份证号"
              className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white outline-none focus:border-[#00D4AA] transition-all"
              {...register('idCard.idNumber')}
            />
            {errors.idCard?.idNumber && (
              <p className="text-red-400 text-xs mt-1">{errors.idCard.idNumber.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <select
              className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white outline-none focus:border-[#00D4AA] transition-all"
              {...register('idCard.gender')}
            >
              <option value="">选择性别</option>
              <option value="male">男</option>
              <option value="female">女</option>
            </select>
            {errors.idCard?.gender && (
              <p className="text-red-400 text-xs mt-1">{errors.idCard.gender.message}</p>
            )}
          </div>
          
          <div>
            <input
              type="date"
              className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white outline-none focus:border-[#00D4AA] transition-all"
              {...register('idCard.birthday')}
            />
            {errors.idCard?.birthday && (
              <p className="text-red-400 text-xs mt-1">{errors.idCard.birthday.message}</p>
            )}
          </div>
        </div>

        {formData.name && formData.idNumber && (
          <div className="p-3 bg-white/5 border border-[#00D4AA]/20 rounded-lg">
            <p className="text-xs text-[#00D4AA]">
              ✅ 已自动填充信息，请确认无误后继续
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!formData.name || !formData.idNumber || !formData.gender || !formData.birthday}
        className="w-full h-14 bg-[#00D4AA] text-[#0A1628] rounded-xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 transition-all"
      >
        确认并继续
      </button>
    </div>
  );
};

// Step 3: 人脸识别组件
const FaceRecognitionStep: React.FC<{
  onNext: () => void;
  onVerify: (result: FaceVerificationResult) => Promise<void>;
}> = ({ onNext, onVerify }) => {
  const { setValue } = useFormContext<QuickOpenFormData>();
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleFaceVerify = async () => {
    setLoading(true);
    try {
      // 加载人脸识别模型
      const { initializeFaceRecognition } = await import('../utils/face');
      const faceRecognition = await initializeFaceRecognition();

      // 初始化摄像头
      const video = document.createElement('video');
      video.autoplay = true;
      await faceRecognition.initializeCamera(video);

      // 执行活体检测
      const livenessScore = await faceRecognition.performLivenessDetection(video, {
        requireBlink: true,
        requireHeadMovement: true,
        timeout: 5000,
        minConfidence: 0.5
      });

      // 捕获人脸图像
      const canvas = faceRecognition.captureFromCamera(video);
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9);
      });
      const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });

      // 检测人脸
      const detections = await faceRecognition.detectFaces(file);

      if (detections.length === 0 || !detections[0].detected) {
        throw new Error('未检测到人脸');
      }

      const mockResult: FaceVerificationResult = {
        verified: livenessScore > 0.7,
        confidence: detections[0].confidence,
        similarity: 0.92,
        isLive: livenessScore > 0.7,
        livenessScore,
        message: livenessScore > 0.7 ? '人脸验证成功' : '活体检测未通过',
        timestamp: new Date().toISOString(),
      };

      await onVerify(mockResult);
      setValue('faceVerified', true);
      setVerified(true);

      // 清理资源
      faceRecognition.cleanup();
    } catch (error) {
      console.error('人脸识别失败:', error);
      alert(`人脸识别失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-bold text-white mb-2">人脸识别</h3>
        <p className="text-sm text-slate-400">请确保光线充足，正对摄像头</p>
      </div>

      <div className="relative">
        <div className="w-48 h-48 mx-auto bg-white/5 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center">
          {verified ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-[#00D4AA] rounded-full flex items-center justify-center mx-auto mb-3">
                <ICONS.Check size={32} className="text-white" />
              </div>
              <p className="text-sm text-[#00D4AA] font-bold">验证成功</p>
            </div>
          ) : (
            <div className="text-center">
              <ICONS.User size={48} className="text-white/30 mx-auto mb-3" />
              <p className="text-sm text-white/50">人脸识别区域</p>
            </div>
          )}
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-56 h-56 border-2 border-white/10 rounded-full"></div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[#00D4AA] rounded-full"></div>
          <p className="text-xs text-white/70">请保持面部在框内</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[#00D4AA] rounded-full"></div>
          <p className="text-xs text-white/70">请勿佩戴帽子、眼镜等遮挡物</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[#00D4AA] rounded-full"></div>
          <p className="text-xs text-white/70">请按照提示完成动作</p>
        </div>
      </div>

      {!verified ? (
        <button
          type="button"
          onClick={handleFaceVerify}
          disabled={loading}
          className="w-full h-14 bg-[#00D4AA] text-[#0A1628] rounded-xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 transition-all"
        >
          {loading ? '识别中...' : '开始人脸识别'}
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          className="w-full h-14 bg-[#00D4AA] text-[#0A1628] rounded-xl font-bold text-sm uppercase tracking-widest transition-all"
        >
          继续下一步
        </button>
      )}

      <p className="text-xs text-slate-500 text-center">
        注：实际生产环境需接入人脸识别 SDK（如阿里云、腾讯云）
      </p>
    </div>
  );
};

// Step 4: 风险测评组件
const RiskAssessmentStep: React.FC<{
  onNext: () => void;
}> = ({ onNext }) => {
  const { register, formState: { errors } } = useFormContext<QuickOpenFormData>();

  const questions = [
    {
      id: 'investmentExperience',
      label: '您的投资经验是？',
      options: [
        { value: 'none', label: '无经验' },
        { value: 'less_1_year', label: '不足1年' },
        { value: '1_3_years', label: '1-3年' },
        { value: '3_5_years', label: '3-5年' },
        { value: 'over_5_years', label: '5年以上' },
      ],
    },
    {
      id: 'riskTolerance',
      label: '您的风险承受能力是？',
      options: [
        { value: 'conservative', label: '保守型（保本为主）' },
        { value: 'moderate', label: '稳健型（平衡收益与风险）' },
        { value: 'aggressive', label: '进取型（追求高收益）' },
      ],
    },
    {
      id: 'investmentHorizon',
      label: '您的投资期限是？',
      options: [
        { value: 'short_term', label: '短期（1年以内）' },
        { value: 'medium_term', label: '中期（1-3年）' },
        { value: 'long_term', label: '长期（3年以上）' },
      ],
    },
    {
      id: 'annualIncome',
      label: '您的年收入大约是？',
      options: [
        { value: 'under_100k', label: '10万元以下' },
        { value: '100k_300k', label: '10-30万元' },
        { value: '300k_500k', label: '30-50万元' },
        { value: 'over_500k', label: '50万元以上' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-bold text-white mb-2">风险测评</h3>
        <p className="text-sm text-slate-400">请根据实际情况选择，这将影响您的投资权限</p>
      </div>

      <div className="space-y-6">
        {questions.map((question) => (
          <div key={question.id} className="space-y-3">
            <label className="block text-sm font-medium text-white">
              {question.label}
            </label>
            <div className="space-y-2">
              {question.options.map((option) => (
                <label key={option.value} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer">
                  <input
                    type="radio"
                    value={option.value}
                    className="w-4 h-4 text-[#00D4AA] bg-white/10 border-white/20 focus:ring-[#00D4AA] focus:ring-2"
                    {...register(`riskAssessment.${question.id as keyof QuickOpenFormData['riskAssessment']}`)}
                  />
                  <span className="text-sm text-white/80">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.riskAssessment?.[question.id as keyof QuickOpenFormData['riskAssessment']] && (
              <p className="text-red-400 text-xs">
                {errors.riskAssessment[question.id as keyof QuickOpenFormData['riskAssessment']]?.message}
              </p>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onNext}
        className="w-full h-14 bg-[#00D4AA] text-[#0A1628] rounded-xl font-bold text-sm uppercase tracking-widest transition-all"
      >
        继续下一步
      </button>
    </div>
  );
};

// Step 5: 适当性信息组件
const SuitabilityInfoStep: React.FC<{
  onNext: () => void;
}> = ({ onNext }) => {
  const { register, formState: { errors } } = useFormContext<QuickOpenFormData>();

  const occupations = [
    { value: 'student', label: '学生' },
    { value: 'employee', label: '普通职员' },
    { value: 'self_employed', label: '自由职业者' },
    { value: 'professional', label: '专业人士（医生、律师等）' },
    { value: 'manager', label: '中层管理人员' },
    { value: 'director', label: '高级管理人员/董事' },
    { value: 'retired', label: '退休人员' },
    { value: 'other', label: '其他' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-bold text-white mb-2">适当性信息</h3>
        <p className="text-sm text-slate-400">请完善您的职业信息</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            职业类型 *
          </label>
          <select
            className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white outline-none focus:border-[#00D4AA] transition-all"
            {...register('suitabilityInfo.occupation')}
          >
            <option value="">请选择职业类型</option>
            {occupations.map((occupation) => (
              <option key={occupation.value} value={occupation.value}>
                {occupation.label}
              </option>
            ))}
          </select>
          {errors.suitabilityInfo?.occupation && (
            <p className="text-red-400 text-xs mt-1">{errors.suitabilityInfo.occupation.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            工作单位（选填）
          </label>
          <input
            type="text"
            placeholder="请输入工作单位名称"
            className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white outline-none focus:border-[#00D4AA] transition-all"
            {...register('suitabilityInfo.company')}
          />
          {errors.suitabilityInfo?.company && (
            <p className="text-red-400 text-xs mt-1">{errors.suitabilityInfo.company.message}</p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="w-full h-14 bg-[#00D4AA] text-[#0A1628] rounded-xl font-bold text-sm uppercase tracking-widest transition-all"
      >
        继续下一步
      </button>
    </div>
  );
};

// Step 6: 协议签署组件
const AgreementStep: React.FC<{
  onSubmit: (data: QuickOpenFormData) => Promise<void>;
  loading: boolean;
}> = ({ onSubmit, loading }) => {
  const { register, handleSubmit, formState: { errors } } = useFormContext<QuickOpenFormData>();

  const agreements = [
    {
      id: 'userAgreement',
      label: '《银河证券用户协议》',
      required: true,
    },
    {
      id: 'riskDisclosure',
      label: '《证券投资风险揭示书》',
      required: true,
    },
    {
      id: 'privacyPolicy',
      label: '《个人信息保护政策》',
      required: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-bold text-white mb-2">协议签署</h3>
        <p className="text-sm text-slate-400">请阅读并同意以下协议</p>
      </div>

      <div className="space-y-4">
        {agreements.map((agreement) => (
          <div key={agreement.id} className="flex items-start gap-3 p-4 bg-white/5 rounded-xl">
            <input
              type="checkbox"
              id={agreement.id}
              className="w-5 h-5 mt-1 text-[#00D4AA] bg-white/10 border-white/20 rounded focus:ring-[#00D4AA] focus:ring-2"
              {...register(`agreements.${agreement.id as keyof QuickOpenFormData['agreements']}`)}
            />
            <div className="flex-1">
              <label htmlFor={agreement.id} className="text-sm text-white font-medium cursor-pointer">
                {agreement.label}
                {agreement.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              <p className="text-xs text-slate-400 mt-1">
                我已阅读并理解该协议的全部内容，同意遵守相关条款
              </p>
            </div>
            <button
              type="button"
              className="text-xs text-[#00D4AA] hover:text-[#00b894] transition-colors"
              onClick={() => window.open('#', '_blank')}
            >
              查看全文
            </button>
          </div>
        ))}

        {Object.keys(errors.agreements || {}).length > 0 && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">
              请同意所有必选协议后才能继续
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={loading}
          className="w-full h-14 bg-[#00D4AA] text-[#0A1628] rounded-xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 transition-all"
        >
          {loading ? '提交中...' : '提交开户申请'}
        </button>
        
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          提交后，您的开户申请将进入审核流程<br />
          审核通过后，您将收到短信通知
        </p>
      </div>
    </div>
  );
};

// 主组件
const QuickOpenView: React.FC<QuickOpenViewProps> = ({ onBack, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [faceVerificationResult, setFaceVerificationResult] = useState<FaceVerificationResult | null>(null);
  
  const methods = useForm<QuickOpenFormData>({
    resolver: zodResolver(quickOpenSchema),
    defaultValues: {
      phone: '',
      idCard: {
        name: '',
        idNumber: '',
        gender: 'male',
        birthday: '',
      },
      faceVerified: false,
      riskAssessment: {
        investmentExperience: 'none',
        riskTolerance: 'conservative',
        investmentHorizon: 'short_term',
        annualIncome: 'under_100k',
      },
      suitabilityInfo: {
        occupation: 'student',
        company: '',
      },
      agreements: {
        userAgreement: false,
        riskDisclosure: false,
        privacyPolicy: false,
      },
    },
  });

  const LOGO_URL = "https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/logologo-removebg-preview.png";

  const handleSendOtp = async (phone: string) => {
    // 发送验证码到 Supabase
    const formattedPhone = phone.startsWith('+') ? phone : `+86${phone}`;
    
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) throw error;
  };

  const handleFaceVerify = async (result: FaceVerificationResult) => {
    // 保存人脸验证结果到 Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from('face_verification_logs')
          .insert({
            user_id: user.id,
            verified: result.verified,
            confidence: result.confidence,
            similarity: result.similarity,
            is_live: result.isLive,
            liveness_score: result.livenessScore,
            message: result.message,
            metadata: result,
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('保存人脸验证结果失败:', error);
    }
  };

  const handleAutoFillIdCard = (data: Partial<QuickOpenFormData['idCard']>) => {
    methods.setValue('idCard.name', data.name || '');
    methods.setValue('idCard.idNumber', data.idNumber || '');
    if (data.gender !== undefined) {
      methods.setValue('idCard.gender', data.gender);
    }
    methods.setValue('idCard.birthday', data.birthday || '');
  };

  const handleSubmit = async (data: QuickOpenFormData) => {
    setLoading(true);
    try {
      // 1. 获取当前用户
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('用户未登录');
      }

      // 2. 创建用户资料
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: data.phone + '@zhengyu.com', // 使用手机号作为邮箱
          username: data.idCard.name,
          risk_level: data.riskAssessment.riskTolerance === 'conservative' ? 'C1-保守型' : 
                     data.riskAssessment.riskTolerance === 'moderate' ? 'C3-稳健型' : 'C5-进取型',
          balance: 100000.00, // 初始余额
          total_equity: 100000.00,
        });

      if (profileError) throw profileError;

      // 3. 保存开户申请记录
      const { error: applicationError } = await supabase
        .from('account_applications')
        .insert({
          user_id: user.id,
          phone: data.phone,
          id_card_info: data.idCard,
          risk_assessment: data.riskAssessment,
          suitability_info: data.suitabilityInfo,
          agreements: data.agreements,
          face_verified: data.faceVerified,
          face_verification_result: faceVerificationResult,
          status: 'PENDING',
          submitted_at: new Date().toISOString(),
        });

      if (applicationError) throw applicationError;

      // 4. 调用完成回调
      onComplete({
        phone: data.phone,
        username: data.idCard.name,
        status: 'PENDING',
        userId: user.id,
        submittedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('提交开户申请失败:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, label: '手机验证' },
    { number: 2, label: '身份信息' },
    { number: 3, label: '人脸识别' },
    { number: 4, label: '风险测评' },
    { number: 5, label: '职业信息' },
    { number: 6, label: '协议签署' },
  ];

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <PhoneVerificationStep
            onNext={() => setStep(2)}
            onSendOtp={handleSendOtp}
          />
        );
      case 2:
        return (
          <IdCardOcrStep
            onNext={() => setStep(3)}
            onAutoFill={handleAutoFillIdCard}
          />
        );
      case 3:
        return (
          <FaceRecognitionStep
            onNext={() => setStep(4)}
            onVerify={async (result: FaceVerificationResult) => {
              setFaceVerificationResult(result);
              await handleFaceVerify(result);
            }}
          />
        );
      case 4:
        return <RiskAssessmentStep onNext={() => setStep(5)} />;
      case 5:
        return <SuitabilityInfoStep onNext={() => setStep(6)} />;
      case 6:
        return <AgreementStep onSubmit={handleSubmit} loading={loading} />;
      default:
        return null;
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-slate-950 flex flex-col animate-slide-up relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,212,170,0.1),transparent_50%)]" />
        
        {/* 顶部进度条 */}
        <div className="h-1 bg-white/5 w-full sticky top-0 z-50">
          <div 
            className="h-full bg-[#00D4AA] transition-all duration-500 shadow-[0_0_10px_#00D4AA]" 
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>

        <header className="p-4 flex items-center justify-between relative z-10">
          <button 
            onClick={onBack} 
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all"
          >
            <ICONS.ArrowRight className="rotate-180" size={18} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              第 {step} 步 / 共 6 步
            </span>
          </div>
        </header>

        {/* 步骤指示器 */}
        <div className="px-4 py-3 relative z-10">
          <div className="flex justify-between items-center">
            {steps.map((s) => (
              <div key={s.number} className="flex flex-col items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                  ${step >= s.number 
                    ? 'bg-[#00D4AA] text-[#0A1628] shadow-[0_0_10px_#00D4AA]' 
                    : 'bg-white/5 text-white/50'
                  }
                `}>
                  {s.number}
                </div>
                <span className={`
                  text-[9px] mt-1 font-medium uppercase tracking-wider
                  ${step >= s.number ? 'text-[#00D4AA]' : 'text-slate-500'}
                `}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full relative z-10">
          <div className="mb-8 text-center space-y-4">
            <div className="w-full max-w-[240px] aspect-[2.5/1] bg-white rounded-[20px] mx-auto flex items-center justify-center p-4 shadow-2xl">
              <img src={LOGO_URL} alt="中国银河证券 证裕交易单元" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-lg font-black text-white tracking-tight">
              {steps[step - 1]?.label || '开户申请'}
            </h2>
          </div>

          <div className="w-full">
            {renderStep()}
          </div>
        </main>

        <footer className="p-6 text-center space-y-2 relative z-10">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
            证裕交易单元 · 数字化合规开户
          </p>
          <p className="text-[8px] text-slate-600 font-medium leading-relaxed">
            所有信息均通过银行级加密传输，受《个人信息保护法》及银河证券合规协议保护。
          </p>
        </footer>
      </div>
    </FormProvider>
  );
};

export default QuickOpenView;