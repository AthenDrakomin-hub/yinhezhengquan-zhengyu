import React, { useState, useEffect } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FaArrowLeft, FaCamera, FaUser, FaCheck, FaCheckCircle, FaShieldAlt, FaMobileAlt, FaIdCard, FaChartPie, FaBriefcase, FaFileSignature, FaSpinner, FaPen } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';
import { imageConfig } from '../../lib/imageConfig';
import { FaceVerificationResult } from '@/utils/face';
import AccountOpeningAgreement, { AgreementData } from './AccountOpeningAgreement';

// Zod 验证模式
const quickOpenSchema = z.object({
  phone: z.string()
    .min(11, '手机号应为11位数字')
    .max(11, '手机号应为11位数字')
    .regex(/^1[3-9]\d{9}$/, '请输入有效的手机号'),
  
  idCard: z.object({
    name: z.string().min(2, '姓名至少2个字符').max(20, '姓名最多20个字符'),
    idNumber: z.string().regex(/^\d{17}[\dXx]$/, '请输入有效的身份证号'),
    gender: z.enum(['male', 'female']),
    birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '请输入正确的生日格式'),
  }),
  
  faceVerified: z.boolean().refine(val => val === true, '请完成人脸识别'),
  
  riskAssessment: z.object({
    investmentExperience: z.enum(['none', 'less_1_year', '1_3_years', '3_5_years', 'over_5_years']),
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']),
    investmentHorizon: z.enum(['short_term', 'medium_term', 'long_term']),
    annualIncome: z.enum(['under_100k', '100k_300k', '300k_500k', 'over_500k']),
  }),
  
  suitabilityInfo: z.object({
    occupation: z.enum([
      'student', 'employee', 'self_employed', 'professional', 
      'manager', 'director', 'retired', 'other'
    ]),
    company: z.string().max(100, '工作单位最多100个字符').optional(),
  }),
  
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

// 步骤配置
const steps = [
  { number: 1, label: '手机验证', icon: FaMobileAlt },
  { number: 2, label: '身份信息', icon: FaIdCard },
  { number: 3, label: '人脸识别', icon: FaCamera },
  { number: 4, label: '风险测评', icon: FaChartPie },
  { number: 5, label: '职业信息', icon: FaBriefcase },
  { number: 6, label: '协议确认', icon: FaFileSignature },
  { number: 7, label: '手写签名', icon: FaPen },
];

// 输入框组件
const InputField: React.FC<{
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  error?: string;
  register: any;
}> = ({ id, label, type = 'text', placeholder, error, register }) => (
  <div>
    <label htmlFor={id} className="text-sm font-semibold text-gray-900 block mb-2">
      {label}
    </label>
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      className={`w-full h-12 px-4 border-2 rounded-lg text-sm text-gray-900 placeholder:text-gray-400
        focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10
        transition-all duration-200
        ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}
      {...register}
    />
    {error && <p className="text-red-600 text-xs mt-1.5 font-medium">{error}</p>}
  </div>
);

// Step 1: 手机号+姓名验证
import { verifyPhoneAndName, queryPhoneInfo, type PhoneInfo } from '../../services/verificationService';

const PhoneVerificationStep: React.FC<{
  onNext: () => void;
}> = ({ onNext }) => {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useFormContext<QuickOpenFormData>();
  const [loading, setLoading] = useState(false);
  const [phoneInfo, setPhoneInfo] = useState<PhoneInfo | null>(null);
  const [verifyError, setVerifyError] = useState('');

  const phone = watch('phone');

  // 实时查询手机号信息
  useEffect(() => {
    if (phone && /^1[3-9]\d{9}$/.test(phone)) {
      const timer = setTimeout(async () => {
        const info = await queryPhoneInfo(phone);
        setPhoneInfo(info);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [phone]);

  const handleVerify = async (data: { phone: string; idCard: { name: string } }) => {
    setLoading(true);
    setVerifyError('');
    
    try {
      // 验证姓名和手机号
      const result = await verifyPhoneAndName(data.idCard.name, data.phone);
      
      if (result.valid) {
        onNext();
      } else {
        setVerifyError(result.message);
      }
    } catch (error) {
      setVerifyError('验证失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaMobileAlt className="text-blue-600 text-2xl" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">手机号验证</h3>
        <p className="text-sm text-gray-500">请输入姓名和手机号进行验证</p>
      </div>

      <form onSubmit={handleSubmit(handleVerify)} className="space-y-4">
        {/* 姓名输入 */}
        <InputField
          id="idCard.name"
          label="真实姓名"
          type="text"
          placeholder="请输入您的真实姓名"
          error={errors.idCard?.name?.message || verifyError}
          register={register('idCard.name')}
        />

        {/* 手机号输入 */}
        <div className="space-y-2">
          <InputField
            id="phone"
            label="手机号码"
            type="tel"
            placeholder="请输入11位手机号"
            error={errors.phone?.message}
            register={register('phone')}
          />
          
          {/* 手机号信息提示 */}
          {phoneInfo && phoneInfo.valid && (
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded-lg">
              <FaCheckCircle />
              <span>{phoneInfo.operator} · {phoneInfo.province} {phoneInfo.city}</span>
            </div>
          )}
        </div>

        {/* 验证按钮 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <FaSpinner className="animate-spin" />
              验证中...
            </>
          ) : (
            <>
              <FaShieldAlt />
              验证并继续
            </>
          )}
        </button>

        {/* 说明文字 */}
        <p className="text-xs text-gray-400 text-center">
          请输入真实的信息用于个人认证，否则将被检测。
        </p>
      </form>
    </div>
  );
};

// Step 2: 身份证 OCR
const IdCardOcrStep: React.FC<{
  onNext: () => void;
  onAutoFill: (data: Partial<QuickOpenFormData['idCard']>) => void;
}> = ({ onNext, onAutoFill }) => {
  const { register, setValue, watch, formState: { errors } } = useFormContext<QuickOpenFormData>();
  
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
  const isComplete = formData?.name && formData?.idNumber && formData?.gender && formData?.birthday;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaIdCard className="text-blue-600 text-2xl" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">身份信息</h3>
        <p className="text-sm text-gray-500">请上传身份证照片或手动填写信息</p>
      </div>

      {/* OCR 上传区 */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={simulateOcr}
          className="h-32 bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-dashed border-blue-200 rounded-xl flex flex-col items-center justify-center hover:border-blue-400 hover:from-blue-50 hover:to-blue-100 transition-all group"
        >
          <FaCamera className="text-blue-400 group-hover:text-blue-600 text-2xl mb-2 transition-colors" />
          <span className="text-sm font-medium text-gray-700">上传身份证正面</span>
          <span className="text-xs text-gray-400 mt-1">自动识别</span>
        </button>
        
        <button
          type="button"
          className="h-32 bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-dashed border-blue-200 rounded-xl flex flex-col items-center justify-center hover:border-blue-400 hover:from-blue-50 hover:to-blue-100 transition-all group"
        >
          <FaCamera className="text-blue-400 group-hover:text-blue-600 text-2xl mb-2 transition-colors" />
          <span className="text-sm font-medium text-gray-700">上传身份证反面</span>
          <span className="text-xs text-gray-400 mt-1">验证有效期</span>
        </button>
      </div>

      {/* 表单区 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InputField
            id="name"
            label="姓名"
            placeholder="真实姓名"
            error={errors.idCard?.name?.message}
            register={register('idCard.name')}
          />
          
          <div>
            <label className="text-sm font-semibold text-gray-900 block mb-2">性别</label>
            <select
              className="w-full h-12 px-4 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 bg-white"
              {...register('idCard.gender')}
            >
              <option value="">选择性别</option>
              <option value="male">男</option>
              <option value="female">女</option>
            </select>
            {errors.idCard?.gender && <p className="text-red-600 text-xs mt-1.5">{errors.idCard.gender.message}</p>}
          </div>
        </div>

        <InputField
          id="idNumber"
          label="身份证号"
          placeholder="18位身份证号码"
          error={errors.idCard?.idNumber?.message}
          register={register('idCard.idNumber')}
        />

        <div>
          <label className="text-sm font-semibold text-gray-900 block mb-2">出生日期</label>
          <input
            type="date"
            className="w-full h-12 px-4 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10"
            {...register('idCard.birthday')}
          />
          {errors.idCard?.birthday && <p className="text-red-600 text-xs mt-1.5">{errors.idCard.birthday.message}</p>}
        </div>
      </div>

      {isComplete && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <FaCheck className="text-green-600" />
          <p className="text-sm text-green-700">信息已填写完整</p>
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        disabled={!isComplete}
        className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/25"
      >
        确认并继续
      </button>
    </div>
  );
};

// Step 3: 人脸识别
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
      const { initializeFaceRecognition } = await import('@/utils/face');
      const faceRecognition = await initializeFaceRecognition();

      const video = document.createElement('video');
      video.autoplay = true;
      await faceRecognition.initializeCamera(video);

      const livenessScore = await faceRecognition.performLivenessDetection(video, {
        requireBlink: true,
        requireHeadMovement: true,
        timeout: 5000,
        minConfidence: 0.5
      });

      const canvas = faceRecognition.captureFromCamera(video);
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9);
      });
      const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });

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
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaCamera className="text-blue-600 text-2xl" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">人脸识别</h3>
        <p className="text-sm text-gray-500">请确保光线充足，正对摄像头</p>
      </div>

      {/* 识别区域 */}
      <div className="relative mx-auto w-48 h-48">
        <div className={`w-full h-full rounded-full flex items-center justify-center border-4 transition-all ${
          verified ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-200'
        }`}>
          {verified ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <FaCheck className="text-white text-2xl" />
              </div>
              <p className="text-sm font-semibold text-green-700">验证成功</p>
            </div>
          ) : (
            <div className="text-center">
              <FaUser className="text-gray-300 text-5xl mx-auto mb-2" />
              <p className="text-sm text-gray-400">请将面部对准圆框</p>
            </div>
          )}
        </div>
        
        {/* 扫描动画 */}
        {!verified && (
          <div className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-ping" />
        )}
      </div>

      {/* 提示列表 */}
      <div className="bg-blue-50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <p className="text-sm text-gray-700">请保持面部在框内</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <p className="text-sm text-gray-700">请勿佩戴帽子、眼镜等遮挡物</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <p className="text-sm text-gray-700">请按照提示完成眨眼动作</p>
        </div>
      </div>

      {!verified ? (
        <button
          type="button"
          onClick={handleFaceVerify}
          disabled={loading}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/25"
        >
          {loading ? '识别中...' : '开始人脸识别'}
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-green-500/25"
        >
          继续下一步
        </button>
      )}
    </div>
  );
};

// Step 4: 风险测评
const RiskAssessmentStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  const { register, formState: { errors } } = useFormContext<QuickOpenFormData>();

  const questions = [
    {
      id: 'investmentExperience' as const,
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
      id: 'riskTolerance' as const,
      label: '您的风险承受能力是？',
      options: [
        { value: 'conservative', label: '保守型（保本为主）' },
        { value: 'moderate', label: '稳健型（平衡收益与风险）' },
        { value: 'aggressive', label: '进取型（追求高收益）' },
      ],
    },
    {
      id: 'investmentHorizon' as const,
      label: '您的投资期限是？',
      options: [
        { value: 'short_term', label: '短期（1年以内）' },
        { value: 'medium_term', label: '中期（1-3年）' },
        { value: 'long_term', label: '长期（3年以上）' },
      ],
    },
    {
      id: 'annualIncome' as const,
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
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaChartPie className="text-blue-600 text-2xl" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">风险测评</h3>
        <p className="text-sm text-gray-500">请根据实际情况选择，这将影响您的投资权限</p>
      </div>

      <div className="space-y-6 max-h-[400px] overflow-y-auto pr-1">
        {questions.map((question) => (
          <div key={question.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              {question.label}
            </label>
            <div className="space-y-2">
              {question.options.map((option) => (
                <label 
                  key={option.value} 
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                >
                  <input
                    type="radio"
                    value={option.value}
                    className="w-4 h-4 text-blue-600 border-2 border-gray-300 focus:ring-blue-500"
                    {...register(`riskAssessment.${question.id}`)}
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.riskAssessment?.[question.id] && (
              <p className="text-red-600 text-xs mt-2">{errors.riskAssessment[question.id]?.message}</p>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onNext}
        className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/25"
      >
        继续下一步
      </button>
    </div>
  );
};

// Step 5: 职业信息
const SuitabilityInfoStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
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
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaBriefcase className="text-blue-600 text-2xl" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">适当性信息</h3>
        <p className="text-sm text-gray-500">请完善您的职业信息</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div>
          <label className="text-sm font-semibold text-gray-900 block mb-2">
            职业类型 <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full h-12 px-4 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 bg-white"
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
            <p className="text-red-600 text-xs mt-1.5">{errors.suitabilityInfo.occupation.message}</p>
          )}
        </div>

        <InputField
          id="company"
          label="工作单位（选填）"
          placeholder="请输入工作单位名称"
          error={errors.suitabilityInfo?.company?.message}
          register={register('suitabilityInfo.company')}
        />
      </div>

      <button
        type="button"
        onClick={onNext}
        className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/25"
      >
        继续下一步
      </button>
    </div>
  );
};

// Step 6: 协议签署
const AgreementStep: React.FC<{
  onSubmit: (data: QuickOpenFormData) => Promise<void>;
  loading: boolean;
}> = ({ onSubmit, loading }) => {
  const { register, handleSubmit, formState: { errors } } = useFormContext<QuickOpenFormData>();

  const agreements = [
    { id: 'userAgreement', label: '《银河证券用户协议》' },
    { id: 'riskDisclosure', label: '《证券投资风险揭示书》' },
    { id: 'privacyPolicy', label: '《个人信息保护政策》' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaFileSignature className="text-blue-600 text-2xl" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">协议签署</h3>
        <p className="text-sm text-gray-500">请阅读并同意以下协议</p>
      </div>

      <div className="space-y-3">
        {agreements.map((agreement) => (
          <div key={agreement.id} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200">
            <input
              type="checkbox"
              id={agreement.id}
              className="w-5 h-5 mt-0.5 text-blue-600 rounded border-2 border-gray-300 focus:ring-blue-500"
              {...register(`agreements.${agreement.id as keyof QuickOpenFormData['agreements']}`)}
            />
            <div className="flex-1">
              <label htmlFor={agreement.id} className="text-sm font-semibold text-gray-900 cursor-pointer">
                {agreement.label}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                我已阅读并理解该协议的全部内容，同意遵守相关条款
              </p>
            </div>
            <button
              type="button"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              onClick={() => window.open('#', '_blank')}
            >
              查看
            </button>
          </div>
        ))}

        {Object.keys(errors.agreements || {}).length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">请同意所有必选协议后才能继续</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={loading}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/25"
        >
          {loading ? '提交中...' : '提交开户申请'}
        </button>
        
        <p className="text-xs text-gray-400 text-center">
          提交后，您的开户申请将进入审核流程，审核通过后您将收到短信通知
        </p>
      </div>
    </div>
  );
};


// 主组件
const QuickOpenView: React.FC<QuickOpenViewProps> = ({ onBack, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [formData, setFormData] = useState<QuickOpenFormData | null>(null);
  const [faceVerificationResult, setFaceVerificationResult] = useState<FaceVerificationResult | null>(null);
  
  const methods = useForm<QuickOpenFormData>({
    resolver: zodResolver(quickOpenSchema),
    defaultValues: {
      phone: '',
      idCard: { name: '', idNumber: '', gender: undefined, birthday: '' },
      faceVerified: false,
      riskAssessment: {
        investmentExperience: undefined,
        riskTolerance: undefined,
        investmentHorizon: undefined,
        annualIncome: undefined,
      },
      suitabilityInfo: { occupation: undefined, company: '' },
      agreements: { userAgreement: false, riskDisclosure: false, privacyPolicy: false },
    },
  });

  const LOGO_URL = imageConfig.logo.fullUrl;

  const handleSendOtp = async (phone: string) => {
    const formattedPhone = phone.startsWith('+') ? phone : `+86${phone}`;
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
      options: { shouldCreateUser: false },
    });
    if (error) throw error;
  };

  const handleFaceVerify = async (result: FaceVerificationResult) => {
    setFaceVerificationResult(result);
  };

  const handleAutoFillIdCard = (data: Partial<QuickOpenFormData['idCard']>) => {
    methods.setValue('idCard.name', data.name || '');
    methods.setValue('idCard.idNumber', data.idNumber || '');
    if (data.gender) methods.setValue('idCard.gender', data.gender);
    methods.setValue('idCard.birthday', data.birthday || '');
  };

  const handleSubmit = async (data: QuickOpenFormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('用户未登录');

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: data.phone + '@zhengyu.com',
          username: data.idCard.name,
          risk_level: data.riskAssessment.riskTolerance === 'conservative' ? 'C1-保守型' : 
                     data.riskAssessment.riskTolerance === 'moderate' ? 'C3-稳健型' : 'C5-进取型',
          balance: 100000.00,
          total_equity: 100000.00,
        }, {
          onConflict: 'id'
        });
      if (profileError) throw profileError;

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

  const handlePreSubmit = async (data: QuickOpenFormData) => {
    // 保存表单数据，进入协议签署页面
    setFormData(data);
    setStep(7);
    setShowAgreement(true);
  };

  const handleAgreementSubmit = async (agreementData: AgreementData) => {
    if (!formData) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('用户未登录');

      // 1. 上传签名图片到存储桶
      let signatureUrl = null;
      if (agreementData.signature) {
        const signatureBlob = await fetch(agreementData.signature).then(r => r.blob());
        const fileName = `signatures/${user.id}/${Date.now()}.png`;
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('account-documents')
          .upload(fileName, signatureBlob, {
            contentType: 'image/png',
            upsert: true,
          });
        
        if (uploadError) {
          console.error('签名上传失败:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('account-documents')
            .getPublicUrl(fileName);
          signatureUrl = urlData?.publicUrl;
        }
      }

      // 2. 创建用户档案
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: formData.phone + '@zhengyu.com',
          username: formData.idCard.name,
          risk_level: formData.riskAssessment.riskTolerance === 'conservative' ? 'C1-保守型' : 
                     formData.riskAssessment.riskTolerance === 'moderate' ? 'C3-稳健型' : 'C5-进取型',
          balance: 100000.00,
          total_equity: 100000.00,
        }, {
          onConflict: 'id'
        });
      if (profileError) throw profileError;

      // 3. 创建开户申请记录
      const { error: applicationError } = await supabase
        .from('account_applications')
        .insert({
          user_id: user.id,
          phone: formData.phone,
          id_card_info: formData.idCard,
          risk_assessment: formData.riskAssessment,
          suitability_info: formData.suitabilityInfo,
          agreements: formData.agreements,
          face_verified: formData.faceVerified,
          face_verification_result: faceVerificationResult,
          signature_url: signatureUrl,
          signature_date: agreementData.date,
          status: 'PENDING',
          submitted_at: new Date().toISOString(),
        });
      if (applicationError) throw applicationError;

      // 4. 发送管理端通知
      await sendAdminNotification({
        userId: user.id,
        userName: formData.idCard.name,
        phone: formData.phone,
        submittedAt: new Date().toISOString(),
      });

      onComplete({
        phone: formData.phone,
        username: formData.idCard.name,
        status: 'PENDING',
        userId: user.id,
        submittedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('提交开户申请失败:', error);
      alert('提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 发送管理端通知
  const sendAdminNotification = async (data: { userId: string; userName: string; phone: string; submittedAt: string }) => {
    try {
      // 创建系统通知 - 使用 user_notifications 表
      const { error: notifError } = await supabase.from('user_notifications').insert({
        notification_type: 'SYSTEM',
        title: '新的开户申请',
        content: `用户 ${data.userName} (${data.phone}) 提交了开户申请，请尽快审核`,
        user_id: data.userId,
        is_read: false,
        priority: 'HIGH',
        created_at: new Date().toISOString(),
      });

      if (notifError) {
        console.log('user_notifications 表可能不存在:', notifError.message);
      }

      // 创建待办任务 - 跳过，因为 admin_tasks 表不存在
      console.log('开户申请已提交，等待审核');
    } catch (error) {
      console.error('发送管理端通知失败:', error);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <PhoneVerificationStep onNext={() => setStep(2)} />;
      case 2:
        return <IdCardOcrStep onNext={() => setStep(3)} onAutoFill={handleAutoFillIdCard} />;
      case 3:
        return (
          <FaceRecognitionStep
            onNext={() => setStep(4)}
            onVerify={handleFaceVerify}
          />
        );
      case 4:
        return <RiskAssessmentStep onNext={() => setStep(5)} />;
      case 5:
        return <SuitabilityInfoStep onNext={() => setStep(6)} />;
      case 6:
        return <AgreementStep onSubmit={handlePreSubmit} loading={loading} />;
      case 7:
        return showAgreement && formData ? (
          <div className="fixed inset-0 z-50 bg-white overflow-auto">
            <AccountOpeningAgreement 
              onSubmit={handleAgreementSubmit}
              onCancel={() => {
                setShowAgreement(false);
                setStep(6);
              }}
            />
          </div>
        ) : null;
      default:
        return null;
    }
  };

  const CurrentIcon = steps[step - 1]?.icon || FaMobileAlt;

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-gray-900">
        {/* 顶部导航 */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <button 
              onClick={onBack} 
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            >
              <FaArrowLeft className="text-gray-600" />
            </button>
            <h1 className="text-base font-bold text-gray-900">快速开户</h1>
            <div className="w-10" />
          </div>
        </header>

        {/* 进度条 */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-4">
            {/* 进度 */}
            <div className="flex items-center justify-between mb-4">
              {steps.map((s, idx) => (
                <React.Fragment key={s.number}>
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all
                      ${step > s.number ? 'bg-green-500 text-white' :
                        step === s.number ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' :
                        'bg-gray-100 text-gray-400'}
                    `}>
                      {step > s.number ? <FaCheck size={16} /> : <s.icon size={16} />}
                    </div>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                      step > s.number ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
            {/* 步骤标签 */}
            <div className="flex justify-between">
              {steps.map((s) => (
                <span 
                  key={s.number}
                  className={`text-xs font-medium ${
                    step >= s.number ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 主内容 */}
        <main className="max-w-lg mx-auto px-4 py-6">
          {/* Logo和标题 */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4 p-3">
              <img src={LOGO_URL} alt="中国银河证券" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{steps[step - 1]?.label}</h2>
            <p className="text-sm text-gray-500 mt-1"> step {step} of 6</p>
          </div>

          {/* 步骤内容 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {renderStep()}
          </div>
        </main>

        {/* 底部安全提示 */}
        <footer className="max-w-lg mx-auto px-4 py-6 text-center">
          <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
            <FaShieldAlt />
            <span className="text-sm font-semibold">银行级安全保护</span>
          </div>
          <p className="text-xs text-gray-400">
            所有信息均通过加密传输，受《个人信息保护法》保护
          </p>
        </footer>
      </div>
    </FormProvider>
  );
};

export default QuickOpenView;
