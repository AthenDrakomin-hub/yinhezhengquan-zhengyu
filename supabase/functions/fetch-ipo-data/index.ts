import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 新浪新股表格固定列索引（实际验证的准确位置）
const COLUMN_INDEX = {
  stockCode: 0,        // 新股代码
  subscribeCode: 1,    // 申购代码
  subscribeDate: 2,    // 申购日期
  listingDate: 3,      // 上市日期
  issuePrice: 4,       // 发行价格
  issueVolume: 5,      // 发行量(万股)
  peRatio: 6,          // 发行市盈率
  winRate: 7,          // 中签率(%)
  perLot: 8,           // 每中一签(万元)
  frozenFund: 9        // 冻结资金(亿元)
}

// 完整的浏览器请求头
const requestHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
  'Accept-Encoding': 'identity',
  'Referer': 'https://www.sina.com.cn/',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Connection': 'keep-alive'
}

// 处理编码，保留可解析的字符
function processHtml(uint8Array: Uint8Array): string {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false })
    let html = decoder.decode(uint8Array)
    // 只清理乱码字符，保留数字、字母、常用符号
    html = html.replace(/�/g, '').replace(/[\u0000-\u001f]/g, '')
    return html
  } catch (e) {
    return Array.from(uint8Array)
      .map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '')
      .join('')
  }
}

// 智能解析数值（处理单位、空格、逗号）
function smartParseNumber(text: string): number {
  if (!text || text.trim() === '') return 0
  
  // 提取所有数字和小数点，忽略其他字符
  const numStr = text.replace(/[^\d\.]/g, '')
  if (!numStr) return 0
  
  const num = parseFloat(numStr)
  return isNaN(num) ? 0 : num
}

// 解析表格数据（稳定的固定索引方案）
function parseIpoData($: cheerio.CheerioAPI) {
  const ipoList = []
  
  // 定位核心表格
  let $table = $('#NewStockTable')
  if ($table.length === 0) {
    // 备选：找包含足够行的表格（新浪新股表格至少有10行数据）
    $table = $('table').filter((_, el) => {
      return $(el).find('tr').length >= 10 && $(el).find('tr:first').find('td,th').length >= 10
    }).first()
  }

  if ($table.length === 0) {
    console.error('未找到新股表格')
    return ipoList
  }

  // 遍历所有行（跳过前1-2行表头）
  $table.find('tr').each((rowIndex, row) => {
    // 跳过表头行（前2行通常是表头/空行）
    if (rowIndex < 2) return
    
    const $cols = $(row).find('td')
    // 有效数据行至少有10列
    if ($cols.length < 10) return

    // 提取新股代码（核心过滤条件）
    const stockCodeText = $($cols[COLUMN_INDEX.stockCode]).text().trim()
    const stockCode = stockCodeText.replace(/\D/g, '')
    // 必须是6位数字的新股代码
    if (!/^\d{6}$/.test(stockCode)) return

    // 提取各列数据
    const subscribeCode = $($cols[COLUMN_INDEX.subscribeCode]).text().replace(/\s+/g, '')
    const subscribeDate = $($cols[COLUMN_INDEX.subscribeDate]).text().replace(/[^\d\/\-]/g, '')
    let listingDate = $($cols[COLUMN_INDEX.listingDate]).text().replace(/[^\d\/\-]/g, '')
    
    // 解析发行价格（核心修复）
    const issuePriceText = $($cols[COLUMN_INDEX.issuePrice]).text()
    const issuePrice = smartParseNumber(issuePriceText)

    // 解析其他数值字段
    const issueVolume = smartParseNumber($($cols[COLUMN_INDEX.issueVolume]).text())
    const peRatio = smartParseNumber($($cols[COLUMN_INDEX.peRatio]).text())
    const winRate = smartParseNumber($($cols[COLUMN_INDEX.winRate]).text())
    const perLot = smartParseNumber($($cols[COLUMN_INDEX.perLot]).text())
    const frozenFund = smartParseNumber($($cols[COLUMN_INDEX.frozenFund]).text())

    // 标准化上市日期
    let status = 'UPCOMING'
    if (listingDate) {
      // 统一格式为 YYYY-MM-DD
      if (listingDate.match(/\d{4}[\/-]\d{1,2}[\/-]\d{1,2}/)) {
        listingDate = listingDate.replace(/\//g, '-')
        const parts = listingDate.split('-')
        if (parts.length === 3) {
          listingDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
        }
        
        // 判断上市状态
        try {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const listDate = new Date(listingDate)
          listDate.setHours(0, 0, 0, 0)
          status = listDate < today ? 'LISTED' : 'UPCOMING'
        } catch (e) {}
      } else {
        listingDate = '未定'
      }
    } else {
      listingDate = '未定'
    }

    // 识别市场类型
    let market = 'SH'
    if (stockCode.startsWith('0') || stockCode.startsWith('3')) {
      market = 'SZ'
    } else if (stockCode.startsWith('8') || stockCode.startsWith('4')) {
      market = 'BJ'
    }

    // 添加到结果列表
    ipoList.push({
      stockCode,
      subscribeCode,
      subscribeDate,
      listingDate,
      issuePrice,
      issueVolume,
      peRatio,
      winRate,
      perLot,
      frozenFund,
      status,
      market
    })
  })

  console.log(`成功解析 ${ipoList.length} 条新股数据`)
  return ipoList
}

serve(async (req) => {
  // 处理CORS预检
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. 请求页面（带重试）
    let buffer: ArrayBuffer
    let retryCount = 0
    const maxRetry = 2

    while (retryCount < maxRetry) {
      try {
        const response = await fetch(
          'https://vip.stock.finance.sina.com.cn/corp/go.php/vRPD_NewStockIssue/page/1.phtml',
          {
            headers: requestHeaders,
            redirect: 'follow',
            timeout: 10000,
            compress: false
          }
        )

        if (!response.ok) throw new Error(`HTTP错误: ${response.status}`)
        buffer = await response.arrayBuffer()
        break
      } catch (e) {
        retryCount++
        console.log(`重试 ${retryCount}/${maxRetry}:`, e.message)
        if (retryCount >= maxRetry) throw e
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // 2. 处理编码
    const uint8Array = new Uint8Array(buffer)
    const html = processHtml(uint8Array)

    // 3. 解析数据
    const $ = cheerio.load(html)
    const ipoList = parseIpoData($)

    // 4. 返回结果
    return new Response(JSON.stringify({
      success: true,
      data: ipoList,
      count: ipoList.length,
      timestamp: new Date().toISOString(),
      debug: {
        pageLength: html.length,
        hasTable: !!$('#NewStockTable').length,
        tableRowCount: $('table').length > 0 ? $('table').first().find('tr').length : 0
      }
    }, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8'
      }
    })

  } catch (error) {
    console.error('执行错误:', error.stack || error.message)
    return new Response(JSON.stringify({
      success: false,
      data: [],
      count: 0,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})