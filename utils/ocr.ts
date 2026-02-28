import { createWorker, Worker, PSM } from 'tesseract.js';

export interface IdCardOcrResult {
  name: string;
  idNumber: string;
  gender: 'male' | 'female';
  birthday: string;
  address?: string;
  nationality?: string;
  issuingAuthority?: string;
  validPeriod?: string;
  confidence: number;
  rawText: string;
}

export interface OcrOptions {
  language?: string;
  oem?: number;
  psm?: number;
  debug?: boolean;
}

class IdCardOcr {
  private worker: Worker | null = null;
  private isInitialized = false;

  /**
   * 初始化 Tesseract.js Worker
   * @param options OCR 配置选项
   */
  async initialize(options: OcrOptions = {}): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 创建 Worker - 新版 API
      const language = options.language || 'chi_sim+eng';
      this.worker = await createWorker(language, 1, {
        corePath: 'https://unpkg.com/tesseract.js-core@v4.0.4/tesseract-core.wasm.js',
        logger: options.debug ? (m: any) => console.log('OCR Logger:', m) : undefined,
      });

      // 设置 OCR 参数
      if (options.oem) await this.worker.setParameters({ tessedit_ocr_engine_mode: options.oem });
      if (options.psm) await this.worker.setParameters({ tessedit_pageseg_mode: options.psm as unknown as PSM });

      // 设置中文身份证识别优化参数
      await this.worker.setParameters({
        preserve_interword_spaces: '1',
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz中华人民共和国居民身份证男女年月日签发机关有效期限',
        user_defined_dpi: '300',
      });

      this.isInitialized = true;
      console.log('OCR Worker 初始化成功');
    } catch (error) {
      console.error('OCR Worker 初始化失败:', error);
      throw new Error(`OCR初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 识别身份证正面（国徽面）
   * @param imageFile 身份证正面图片文件
   * @returns 识别结果
   */
  async recognizeFront(imageFile: File): Promise<IdCardOcrResult> {
    if (!this.isInitialized || !this.worker) {
      throw new Error('OCR Worker 未初始化，请先调用 initialize()');
    }

    try {
      console.log('开始识别身份证正面...');
      
      // 识别图片
      const { data: { text, confidence } } = await this.worker.recognize(imageFile);
      
      // 解析识别结果
      const result = this.parseIdCardText(text);
      result.confidence = confidence;
      result.rawText = text;

      console.log('身份证正面识别完成:', result);
      return result;
    } catch (error) {
      console.error('身份证正面识别失败:', error);
      throw new Error(`身份证识别失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 识别身份证反面（个人信息面）
   * @param imageFile 身份证反面图片文件
   * @returns 识别结果
   */
  async recognizeBack(imageFile: File): Promise<IdCardOcrResult> {
    if (!this.isInitialized || !this.worker) {
      throw new Error('OCR Worker 未初始化，请先调用 initialize()');
    }

    try {
      console.log('开始识别身份证反面...');
      
      // 识别图片
      const { data: { text, confidence } } = await this.worker.recognize(imageFile);
      
      // 解析反面信息（主要是签发机关和有效期）
      const result = this.parseIdCardBackText(text);
      result.confidence = confidence;
      result.rawText = text;

      console.log('身份证反面识别完成:', result);
      return result;
    } catch (error) {
      console.error('身份证反面识别失败:', error);
      throw new Error(`身份证反面识别失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 解析身份证正面文本
   * @param text OCR 识别的原始文本
   */
  private parseIdCardText(text: string): IdCardOcrResult {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    let name = '';
    let idNumber = '';
    let gender: 'male' | 'female' = 'male';
    let birthday = '';
    let address = '';
    let nationality = '汉';

    // 提取姓名（通常在第二行）
    const nameMatch = text.match(/姓名[\s:：]*([^\s]+)/);
    if (nameMatch) name = nameMatch[1].trim();
    
    // 提取身份证号（18位数字，可能包含X）
    const idMatch = text.match(/\b(\d{17}[\dXx])\b/);
    if (idMatch) idNumber = idMatch[1].toUpperCase();
    
    // 提取性别
    const genderMatch = text.match(/性别[\s:：]*([男女])/);
    if (genderMatch) gender = genderMatch[1] === '女' ? 'female' : 'male';
    
    // 提取出生日期（YYYY年MM月DD日 或 YYYY-MM-DD）
    const birthdayMatch = text.match(/(\d{4})[\s年\-./](\d{1,2})[\s月\-./](\d{1,2})[\s日]/);
    if (birthdayMatch) {
      const year = birthdayMatch[1];
      const month = birthdayMatch[2].padStart(2, '0');
      const day = birthdayMatch[3].padStart(2, '0');
      birthday = `${year}-${month}-${day}`;
    }
    
    // 提取民族
    const nationalityMatch = text.match(/民族[\s:：]*([^\s]+)/);
    if (nationalityMatch) nationality = nationalityMatch[1].trim();
    
    // 提取地址（通常多行）
    const addressMatch = text.match(/住址[\s:：]*([^\n]+(?:\n[^\n]+)*)/);
    if (addressMatch) address = addressMatch[1].replace(/\n/g, '').trim();

    // 如果自动提取失败，尝试从行中提取
    if (!name && lines.length >= 2) {
      const potentialName = lines[1].replace(/[^a-zA-Z\u4e00-\u9fa5]/g, '');
      if (potentialName.length >= 2 && potentialName.length <= 4) {
        name = potentialName;
      }
    }

    if (!idNumber) {
      // 在文本中搜索18位身份证号
      for (const line of lines) {
        const found = line.match(/\d{17}[\dXx]/);
        if (found) {
          idNumber = found[0].toUpperCase();
          break;
        }
      }
    }

    return {
      name,
      idNumber,
      gender,
      birthday,
      address,
      nationality,
      confidence: 0,
      rawText: text,
    };
  }

  /**
   * 解析身份证反面文本
   * @param text OCR 识别的原始文本
   */
  private parseIdCardBackText(text: string): IdCardOcrResult {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    let issuingAuthority = '';
    let validPeriod = '';

    // 提取签发机关
    const authorityMatch = text.match(/签发机关[\s:：]*([^\n]+)/);
    if (authorityMatch) issuingAuthority = authorityMatch[1].trim();
    
    // 提取有效期限
    const periodMatch = text.match(/有效期限[\s:：]*([^\n]+)/);
    if (periodMatch) validPeriod = periodMatch[1].trim();

    return {
      name: '',
      idNumber: '',
      gender: 'male',
      birthday: '',
      issuingAuthority,
      validPeriod,
      confidence: 0,
      rawText: text,
    };
  }

  /**
   * 合并正反面识别结果
   * @param frontResult 正面识别结果
   * @param backResult 反面识别结果
   */
  mergeResults(frontResult: IdCardOcrResult, backResult: IdCardOcrResult): IdCardOcrResult {
    return {
      ...frontResult,
      issuingAuthority: backResult.issuingAuthority || frontResult.issuingAuthority,
      validPeriod: backResult.validPeriod || frontResult.validPeriod,
      confidence: (frontResult.confidence + backResult.confidence) / 2,
    };
  }

  /**
   * 验证身份证号合法性
   * @param idNumber 身份证号
   */
  validateIdNumber(idNumber: string): boolean {
    if (!/^\d{17}[\dXx]$/.test(idNumber)) return false;
    
    // 校验码验证
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += parseInt(idNumber[i]) * weights[i];
    }
    
    const checkCode = checkCodes[sum % 11];
    return idNumber[17].toUpperCase() === checkCode;
  }

  /**
   * 从身份证号提取信息
   * @param idNumber 身份证号
   */
  extractInfoFromIdNumber(idNumber: string): { birthday: string; gender: 'male' | 'female'; region: string } {
    if (!this.validateIdNumber(idNumber)) {
      throw new Error('无效的身份证号');
    }

    // 提取出生日期
    const year = idNumber.substring(6, 10);
    const month = idNumber.substring(10, 12);
    const day = idNumber.substring(12, 14);
    const birthday = `${year}-${month}-${day}`;

    // 提取性别（第17位，奇数为男，偶数为女）
    const genderDigit = parseInt(idNumber[16]);
    const gender: 'male' | 'female' = genderDigit % 2 === 1 ? 'male' : 'female';

    // 提取地区代码
    const regionCode = idNumber.substring(0, 6);

    return { birthday, gender, region: regionCode };
  }

  /**
   * 清理 Worker 资源
   */
  async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log('OCR Worker 资源已清理');
    }
  }
}

// 单例实例
let ocrInstance: IdCardOcr | null = null;

/**
 * 获取 OCR 单例实例
 */
export function getOcrInstance(): IdCardOcr {
  if (!ocrInstance) {
    ocrInstance = new IdCardOcr();
  }
  return ocrInstance;
}

/**
 * 初始化 OCR 系统
 */
export async function initializeOcr(options?: OcrOptions): Promise<IdCardOcr> {
  const ocr = getOcrInstance();
  await ocr.initialize(options);
  return ocr;
}

/**
 * 识别身份证图片的快捷函数
 * @param frontImage 身份证正面图片
 * @param backImage 身份证反面图片（可选）
 */
export async function recognizeIdCard(
  frontImage: File,
  backImage?: File
): Promise<IdCardOcrResult> {
  const ocr = getOcrInstance();
  
  if (!ocr['isInitialized']) {
    await ocr.initialize();
  }

  const frontResult = await ocr.recognizeFront(frontImage);
  
  if (backImage) {
    const backResult = await ocr.recognizeBack(backImage);
    return ocr.mergeResults(frontResult, backResult);
  }

  return frontResult;
}

/**
 * 预处理图片（调整大小、增强对比度等）
 * @param imageFile 图片文件
 * @param maxWidth 最大宽度
 */
export async function preprocessImage(
  imageFile: File,
  maxWidth: number = 1200
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('无法创建 Canvas 上下文'));
      return;
    }

    img.onload = () => {
      // 计算缩放比例
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      // 设置 Canvas 尺寸
      canvas.width = width;
      canvas.height = height;

      // 绘制图片
      ctx.drawImage(img, 0, 0, width, height);

      // 图像增强：调整对比度和亮度
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // 简单对比度增强
      const contrast = 1.2;
      const brightness = 10;
      
      for (let i = 0; i < data.length; i += 4) {
        // 增强对比度
        data[i] = truncate((data[i] - 128) * contrast + 128 + brightness);
        data[i + 1] = truncate((data[i + 1] - 128) * contrast + 128 + brightness);
        data[i + 2] = truncate((data[i + 2] - 128) * contrast + 128 + brightness);
      }

      ctx.putImageData(imageData, 0, 0);

      // 转换为 Blob 然后 File
      canvas.toBlob((blob) => {
        if (blob) {
          const processedFile = new File([blob], imageFile.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(processedFile);
        } else {
          reject(new Error('图片处理失败'));
        }
      }, 'image/jpeg', 0.9);
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    img.src = URL.createObjectURL(imageFile);
  });
}

/**
 * 限制数值在 0-255 范围内
 */
function truncate(value: number): number {
  return Math.max(0, Math.min(255, value));
}

export default getOcrInstance();