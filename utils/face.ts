import * as faceapi from 'face-api.js';

export interface FaceDetectionResult {
  detected: boolean;
  faceCount: number;
  confidence: number;
  box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    mouth: { x: number; y: number };
    leftEyeBrow: { x: number; y: number }[];
    rightEyeBrow: { x: number; y: number }[];
    jaw: { x: number; y: number }[];
  };
  descriptors?: Float32Array[];
  age?: number;
  gender?: 'male' | 'female';
  expression?: string;
}

export interface FaceVerificationResult {
  verified: boolean;
  confidence: number;
  similarity: number;
  isLive: boolean;
  livenessScore: number;
  message: string;
  timestamp: string;
}

export interface FaceMatch {
  label: string;
  distance: number;
}

export interface LivenessDetectionOptions {
  requireBlink?: boolean;
  requireHeadMovement?: boolean;
  timeout?: number;
  minConfidence?: number;
}

class FaceRecognition {
  private modelsLoaded = false;
  private referenceDescriptor: Float32Array | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;

  /**
   * 加载 face-api.js 模型
   */
  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;

    try {
      console.log('开始加载人脸识别模型...');

      // 设置模型路径（从 CDN 加载）
      const modelPath = '/models';
      
      // 加载所有必要模型
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
        faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
        faceapi.nets.ageGenderNet.loadFromUri(modelPath),
        faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath),
      ]);

      this.modelsLoaded = true;
      console.log('人脸识别模型加载完成');
    } catch (error) {
      console.error('加载人脸识别模型失败:', error);
      throw new Error(`模型加载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 检测图片中的人脸
   * @param image 图片元素或文件
   */
  async detectFaces(image: HTMLImageElement | File): Promise<FaceDetectionResult[]> {
    if (!this.modelsLoaded) {
      await this.loadModels();
    }

    try {
      let img: HTMLImageElement;
      
      if (image instanceof File) {
        img = await this.fileToImage(image);
      } else {
        img = image;
      }

      // 使用 TinyFaceDetector（更快）或 SSD Mobilenet（更准确）
      const detectionOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 512,
        scoreThreshold: 0.5,
      });

      // 检测人脸
      const detections = await faceapi
        .detectAllFaces(img, detectionOptions)
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withAgeAndGender()
        .withFaceExpressions();

      return detections.map((detection) => {
        const box = detection.detection.box;
        const landmarks = detection.landmarks;

        return {
          detected: true,
          faceCount: detections.length,
          confidence: detection.detection.score || 0,
          box: {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
          },
          landmarks: {
            leftEye: { x: landmarks.getLeftEye()[0].x, y: landmarks.getLeftEye()[0].y },
            rightEye: { x: landmarks.getRightEye()[0].x, y: landmarks.getRightEye()[0].y },
            nose: { x: landmarks.getNose()[0].x, y: landmarks.getNose()[0].y },
            mouth: { x: landmarks.getMouth()[0].x, y: landmarks.getMouth()[0].y },
            leftEyeBrow: landmarks.getLeftEyeBrow().map(p => ({ x: p.x, y: p.y })),
            rightEyeBrow: landmarks.getRightEyeBrow().map(p => ({ x: p.x, y: p.y })),
            jaw: landmarks.getJawOutline().map(p => ({ x: p.x, y: p.y })),
          },
          descriptors: detection.descriptor ? [detection.descriptor] : [],
          age: detection.age,
          gender: detection.gender === 'male' ? 'male' : 'female',
          expression: this.getDominantExpression(detection.expressions),
        };
      });
    } catch (error) {
      console.error('人脸检测失败:', error);
      return [{
        detected: false,
        faceCount: 0,
        confidence: 0,
        message: error instanceof Error ? error.message : '人脸检测失败',
      }];
    }
  }

  /**
   * 设置参考人脸（用于后续比对）
   * @param image 参考人脸图片
   */
  async setReferenceFace(image: HTMLImageElement | File): Promise<void> {
    try {
      const detections = await this.detectFaces(image);
      
      if (detections.length === 0 || !detections[0].detected) {
        throw new Error('未检测到人脸');
      }

      if (detections.length > 1) {
        throw new Error('检测到多张人脸，请只包含一张人脸');
      }

      const detection = detections[0];
      if (detection.descriptors && detection.descriptors.length > 0) {
        this.referenceDescriptor = detection.descriptors[0];
        console.log('参考人脸设置成功');
      } else {
        throw new Error('无法提取人脸特征');
      }
    } catch (error) {
      console.error('设置参考人脸失败:', error);
      throw error;
    }
  }

  /**
   * 验证人脸是否匹配
   * @param image 待验证图片
   */
  async verifyFace(image: HTMLImageElement | File): Promise<FaceVerificationResult> {
    if (!this.referenceDescriptor) {
      throw new Error('请先设置参考人脸');
    }

    try {
      const detections = await this.detectFaces(image);
      
      if (detections.length === 0 || !detections[0].detected) {
        return {
          verified: false,
          confidence: 0,
          similarity: 0,
          isLive: false,
          livenessScore: 0,
          message: '未检测到人脸',
          timestamp: new Date().toISOString(),
        };
      }

      if (detections.length > 1) {
        return {
          verified: false,
          confidence: 0,
          similarity: 0,
          isLive: false,
          livenessScore: 0,
          message: '检测到多张人脸',
          timestamp: new Date().toISOString(),
        };
      }

      const detection = detections[0];
      
      if (!detection.descriptors || detection.descriptors.length === 0) {
        return {
          verified: false,
          confidence: 0,
          similarity: 0,
          isLive: false,
          livenessScore: 0,
          message: '无法提取人脸特征',
          timestamp: new Date().toISOString(),
        };
      }

      // 计算人脸相似度
      const distance = faceapi.euclideanDistance(
        this.referenceDescriptor,
        detection.descriptors[0]
      );

      // 距离越小越相似，转换为相似度百分比
      const similarity = Math.max(0, 100 - distance * 50);
      const verified = distance < 0.6; // 阈值可根据需要调整
      const confidence = detection.confidence;

      // 简单的活体检测（基于人脸框大小变化）
      const livenessScore = await this.performLivenessDetection(image);
      const isLive = livenessScore > 0.7;

      return {
        verified,
        confidence,
        similarity,
        isLive,
        livenessScore,
        message: verified 
          ? (isLive ? '人脸验证成功（活体检测通过）' : '人脸验证成功（活体检测未通过）')
          : '人脸不匹配',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('人脸验证失败:', error);
      return {
        verified: false,
        confidence: 0,
        similarity: 0,
        isLive: false,
        livenessScore: 0,
        message: `验证失败: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 执行活体检测
   * @param image 图片或视频
   */
  async performLivenessDetection(
    image: HTMLImageElement | File | HTMLVideoElement,
    options: LivenessDetectionOptions = {}
  ): Promise<number> {
    const {
      requireBlink = true,
      requireHeadMovement = true,
      timeout = 5000,
      minConfidence = 0.5,
    } = options;

    try {
      let score = 0;
      const tests = [];

      // 测试1：人脸检测置信度
      const detections = await this.detectFaces(image as any);
      if (detections.length > 0 && detections[0].confidence >= minConfidence) {
        score += 0.3;
        tests.push('人脸检测通过');
      }

      // 测试2：多帧检测（如果是视频）
      if (image instanceof HTMLVideoElement) {
        const frameResults = await this.detectMultipleFrames(image, 3, 1000);
        if (frameResults.variation > 0.1) { // 人脸位置有变化
          score += 0.3;
          tests.push('头部移动检测通过');
        }
      } else if (requireHeadMovement) {
        // 对于静态图片，无法检测头部移动
        tests.push('头部移动检测跳过（静态图片）');
      }

      // 测试3：眨眼检测（需要视频）
      if (requireBlink && image instanceof HTMLVideoElement) {
        const blinkDetected = await this.detectBlink(image);
        if (blinkDetected) {
          score += 0.4;
          tests.push('眨眼检测通过');
        }
      } else if (requireBlink) {
        tests.push('眨眼检测跳过（静态图片）');
      }

      console.log('活体检测结果:', { score, tests });
      return score;
    } catch (error) {
      console.error('活体检测失败:', error);
      return 0;
    }
  }

  /**
   * 检测多帧以获取变化
   */
  private async detectMultipleFrames(
    video: HTMLVideoElement,
    frameCount: number,
    interval: number
  ): Promise<{ positions: Array<{ x: number; y: number }>; variation: number }> {
    const positions: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < frameCount; i++) {
      await new Promise(resolve => setTimeout(resolve, interval));
      
      const detections = await this.detectFaces(video as any);
      if (detections.length > 0 && detections[0].box) {
        positions.push({
          x: detections[0].box.x,
          y: detections[0].box.y,
        });
      }
    }

    // 计算位置变化
    let variation = 0;
    if (positions.length > 1) {
      for (let i = 1; i < positions.length; i++) {
        const dx = positions[i].x - positions[i - 1].x;
        const dy = positions[i].y - positions[i - 1].y;
        variation += Math.sqrt(dx * dx + dy * dy);
      }
      variation /= (positions.length - 1);
    }

    return { positions, variation };
  }

  /**
   * 检测眨眼
   */
  private async detectBlink(video: HTMLVideoElement): Promise<boolean> {
    try {
      // 检测眼睛开合状态
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      if (detections.length === 0) return false;

      const landmarks = detections[0].landmarks;
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();

      // 计算眼睛纵横比（EAR）
      const leftEAR = this.calculateEyeAspectRatio(leftEye);
      const rightEAR = this.calculateEyeAspectRatio(rightEye);
      const ear = (leftEAR + rightEAR) / 2;

      // 如果 EAR 低于阈值，可能是眨眼
      const blinkThreshold = 0.2;
      return ear < blinkThreshold;
    } catch (error) {
      console.error('眨眼检测失败:', error);
      return false;
    }
  }

  /**
   * 计算眼睛纵横比
   */
  private calculateEyeAspectRatio(eyePoints: faceapi.Point[]): number {
    // 计算垂直距离
    const vertical1 = this.distance(eyePoints[1], eyePoints[5]);
    const vertical2 = this.distance(eyePoints[2], eyePoints[4]);
    
    // 计算水平距离
    const horizontal = this.distance(eyePoints[0], eyePoints[3]);
    
    // 眼睛纵横比
    return (vertical1 + vertical2) / (2 * horizontal);
  }

  /**
   * 计算两点距离
   */
  private distance(p1: faceapi.Point, p2: faceapi.Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 获取主要表情
   */
  private getDominantExpression(expressions: faceapi.FaceExpressions): string {
    let dominant = 'neutral';
    let maxScore = 0;

    for (const [expression, score] of Object.entries(expressions)) {
      if (score > maxScore) {
        maxScore = score;
        dominant = expression;
      }
    }

    return dominant;
  }

  /**
   * 初始化摄像头
   */
  async initializeCamera(
    videoElement: HTMLVideoElement,
    constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user',
      },
      audio: false,
    }
  ): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = stream;
      this.videoElement = videoElement;
      
      // 创建 Canvas 用于绘图
      this.canvasElement = document.createElement('canvas');
      
      return stream;
    } catch (error) {
      console.error('摄像头初始化失败:', error);
      throw new Error(`摄像头访问失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 从摄像头捕获图片
   */
  captureFromCamera(video: HTMLVideoElement): HTMLCanvasElement {
    if (!this.canvasElement) {
      this.canvasElement = document.createElement('canvas');
    }

    const canvas = this.canvasElement;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('无法创建 Canvas 上下文');
    }

    // 设置 Canvas 尺寸与视频一致
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 绘制视频帧到 Canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas;
  }

  /**
   * 在 Canvas 上绘制检测结果
   */
  drawDetectionResults(
    canvas: HTMLCanvasElement,
    detections: FaceDetectionResult[]
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空 Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制人脸框
    detections.forEach(detection => {
      if (!detection.box) return;

      const { x, y, width, height } = detection.box;
      
      // 绘制边框
      ctx.strokeStyle = detection.confidence > 0.8 ? '#00FF00' : '#FFFF00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // 绘制置信度
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      ctx.fillText(
        `置信度: ${(detection.confidence * 100).toFixed(1)}%`,
        x,
        y - 5
      );

      // 绘制特征点
      if (detection.landmarks) {
        ctx.fillStyle = '#FF0000';
        const points = [
          detection.landmarks.leftEye,
          detection.landmarks.rightEye,
          detection.landmarks.nose,
          detection.landmarks.mouth,
        ];
        
        points.forEach(point => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    });
  }

  /**
   * 文件转图片元素
   */
  private fileToImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.videoElement && this.videoElement.srcObject) {
      const stream = this.videoElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      this.videoElement.srcObject = null;
    }
    
    this.referenceDescriptor = null;
    this.videoElement = null;
    this.canvasElement = null;
    
    console.log('人脸识别资源已清理');
  }
}

// 单例实例
let faceRecognitionInstance: FaceRecognition | null = null;

/**
 * 获取人脸识别单例实例
 */
export function getFaceRecognitionInstance(): FaceRecognition {
  if (!faceRecognitionInstance) {
    faceRecognitionInstance = new FaceRecognition();
  }
  return faceRecognitionInstance;
}

/**
 * 初始化人脸识别系统
 */
export async function initializeFaceRecognition(): Promise<FaceRecognition> {
  const faceRecognition = getFaceRecognitionInstance();
  await faceRecognition.loadModels();
  return faceRecognition;
}

/**
 * 快速人脸验证函数
 */
export async function verifyFaceWithReference(
  referenceImage: File,
  testImage: File
): Promise<FaceVerificationResult> {
  const faceRecognition = getFaceRecognitionInstance();
  
  if (!faceRecognition['modelsLoaded']) {
    await faceRecognition.loadModels();
  }

  // 设置参考人脸
  await faceRecognition.setReferenceFace(referenceImage);
  
  // 验证测试人脸
  return await faceRecognition.verifyFace(testImage);
}

/**
 * 执行活体检测
 */
export async function performLivenessCheck(
  videoElement: HTMLVideoElement,
  options?: LivenessDetectionOptions
): Promise<number> {
  const faceRecognition = getFaceRecognitionInstance();
  
  if (!faceRecognition['modelsLoaded']) {
    await faceRecognition.loadModels();
  }

  return await faceRecognition.performLivenessDetection(videoElement, options);
}

export default getFaceRecognitionInstance();