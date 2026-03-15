/**
 * 网络请求工具模块
 * 
 * 提供 fetchWithRetry 等健壮的网络请求函数
 */

/**
 * 通用 fetch 包装器，支持重试、超时和自定义头部
 * 
 * @param url 请求 URL
 * @param options fetch 选项
 * @param retries 重试次数，默认 3 次
 * @param timeout 超时时间（毫秒），默认 5000ms
 * @param delay 重试间隔（毫秒），默认 1000ms
 * @returns Response 对象
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3,
  timeout = 5000,
  delay = 1000
): Promise<Response> {
  const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    ...options.headers,
  }

  let lastError: Error | null = null

  for (let i = 0; i < retries; i++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: defaultHeaders,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return response
    } catch (err: any) {
      clearTimeout(timeoutId)
      lastError = err
      console.warn(`[fetchWithRetry] Attempt ${i + 1}/${retries} failed for ${url}:`, err.message)
      
      if (i < retries - 1) {
        // 指数退避：每次重试延迟递增
        await new Promise(res => setTimeout(res, delay * Math.pow(1.5, i)))
      }
    }
  }

  throw lastError || new Error('Max retries reached')
}

/**
 * 带重试的 JSON 请求
 */
export async function fetchJsonWithRetry<T = any>(
  url: string,
  options: RequestInit = {},
  retries = 3,
  timeout = 5000,
  delay = 1000
): Promise<T> {
  const response = await fetchWithRetry(url, options, retries, timeout, delay)
  return response.json()
}

/**
 * 请求配置预设
 */
export const FetchPresets = {
  // 实时行情：短超时，少重试（快速响应优先）
  realtime: { retries: 2, timeout: 3000, delay: 500 },
  
  // 普通行情：标准配置
  standard: { retries: 3, timeout: 5000, delay: 1000 },
  
  // 新闻资讯：长超时，多重试（容错优先）
  news: { retries: 3, timeout: 8000, delay: 1500 },
  
  // K线数据：较长超时（数据量大）
  kline: { retries: 2, timeout: 6000, delay: 1000 },
}
