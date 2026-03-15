// Supabase Edge Function: 热点数据爬虫 (调试版)
// 运行时: Deno

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const BASE_URL = "https://duanxianxia.com"

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Content-Type': 'application/x-www-form-urlencoded',
}

// 调试日志
const logs: string[] = []
function log(msg: string) {
  logs.push(msg)
  console.log(msg)
}

// 解析热点资讯
function parseHotNews(html: string, source: string): any[] {
  const results: any[] = []
  const regex = /<div class='item flex'>[\s\S]*?<a href='([^']*)'[^>]*>([^<]*)<\/a>[\s\S]*?<span class='time'[^>]*>([^<]*)<\/span>[\s\S]*?热度[：:]\s*(\d+)/g
  
  let match
  let rank = 0
  while ((match = regex.exec(html)) !== null && rank < 50) {
    rank++
    results.push({
      rank,
      title: match[2].trim(),
      link: match[1].startsWith('//') ? 'https:' + match[1] : match[1],
      publish_time: match[3].trim(),
      heat: match[4],
      source
    })
  }
  
  log(`parseHotNews(${source}): ${results.length} items`)
  return results
}

// 解析今日热点
function parseTodayHotspot(html: string): any[] {
  const results: any[] = []
  const kwRegex = /<div class='keyword'>\s*<b>([^<]+)<\/b>/g
  const dateRegex = /<div class='panel-heading'>([^<]+)<\/div>/g
  
  // 收集日期位置
  const dates: {pos: number, val: string}[] = []
  let m
  while ((m = dateRegex.exec(html)) !== null) {
    dates.push({ pos: m.index, val: m[1].trim() })
  }
  
  // 收集关键词
  while ((m = kwRegex.exec(html)) !== null) {
    let date = ''
    for (let i = dates.length - 1; i >= 0; i--) {
      if (dates[i].pos < m.index) {
        date = dates[i].val
        break
      }
    }
    results.push({ date, title: m[1].trim(), keywords: '', heat: '' })
  }
  
  log(`parseTodayHotspot: ${results.length} items`)
  return results.slice(0, 30)
}

// 解析财经日历
function parseFinancialCalendar(html: string): any[] {
  const results: any[] = []
  const eventRegex = /<li class='list-group-item'>([^<]+)<\/li>/g
  const dateRegex = /<div class='panel-heading'>([^<]+)<\/div>/g
  
  const dates: {pos: number, val: string}[] = []
  let m
  while ((m = dateRegex.exec(html)) !== null) {
    dates.push({ pos: m.index, val: m[1].trim() })
  }
  
  while ((m = eventRegex.exec(html)) !== null) {
    let date = ''
    for (let i = dates.length - 1; i >= 0; i--) {
      if (dates[i].pos < m.index) {
        date = dates[i].val
        break
      }
    }
    results.push({ date, event: m[1].trim() })
  }
  
  log(`parseFinancialCalendar: ${results.length} items`)
  return results.slice(0, 50)
}

// 获取数据（返回解析结果和调试信息）
async function fetchData(type: string): Promise<{data: any[], debug: any}> {
  const debug: any = { type }
  
  try {
    log(`Fetching ${type}...`)
    
    const response = await fetch(`${BASE_URL}/api/getHotNewsByType`, {
      method: 'POST',
      headers: HEADERS,
      body: `type=${type}`
    })
    
    debug.status = response.status
    log(`Status: ${response.status}`)
    
    const text = await response.text()
    debug.responseLength = text.length
    log(`Response length: ${text.length}`)
    
    if (text.length < 200) {
      debug.responseText = text
      log(`Response: ${text}`)
    }
    
    const json = JSON.parse(text)
    debug.jsonResult = json.result
    debug.htmlLength = json.html?.length || 0
    
    if (json.result !== 'success' || !json.html) {
      log(`No valid data for ${type}`)
      return { data: [], debug }
    }
    
    let data: any[] = []
    switch (type) {
      case 'ths':
      case 'jiuyan':
        data = parseHotNews(json.html, type)
        break
      case 'chaosha':
        data = parseTodayHotspot(json.html)
        break
      case 'timeline':
        data = parseFinancialCalendar(json.html)
        break
    }
    
    debug.parsedCount = data.length
    return { data, debug }
    
  } catch (e) {
    debug.error = e.message
    log(`Error ${type}: ${e.message}`)
    return { data: [], debug }
  }
}

// 保存数据（去重：相同标题的只保留最新）
async function saveData(table: string, data: any[], uniqueField: string = 'title'): Promise<number> {
  if (data.length === 0) return 0
  
  log(`saveData: ${table}, data length: ${data.length}`)
  
  // 删除7天前的数据
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  const deleteResult = await supabase.from(table).delete().lt('crawl_time', cutoff.toISOString())
  log(`Delete old data: ${deleteResult.error?.message || 'success'}`)
  
  // 获取现有数据（用于去重）
  const selectResult = await supabase
    .from(table)
    .select(uniqueField)
  
  log(`Select existing: count=${selectResult.data?.length || 0}, error=${selectResult.error?.message || 'none'}`)
  
  const existingValues = new Set(selectResult.data?.map((item: any) => item[uniqueField]) || [])
  
  // 只插入新数据
  const newData = data.filter(item => !existingValues.has(item[uniqueField]))
  log(`New data to insert: ${newData.length} (existing: ${existingValues.size})`)
  
  if (newData.length === 0) {
    log(`No new data to insert for ${table}`)
    return 0
  }
  
  // 添加 crawl_time
  const dataWithTimestamp = newData.map(item => ({
    ...item,
    crawl_time: new Date().toISOString()
  }))
  
  const insertResult = await supabase.from(table).insert(dataWithTimestamp)
  if (insertResult.error) {
    log(`Insert ${table} error: ${insertResult.error.message}`)
    return 0
  }
  
  log(`Saved ${newData.length} new items to ${table} (skipped ${data.length - newData.length} duplicates)`)
  return newData.length
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Use POST' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  logs.length = 0
  const start = Date.now()
  log('=== Crawler Started ===')
  
  try {
    const results: Record<string, number> = {}
    const debugInfo: Record<string, any> = {}
    
    // 获取热点资讯
    const r1 = await fetchData('ths')
    debugInfo.hot_news = r1.debug
    results.hot_news = await saveData('hot_news', r1.data)
    
    // 获取公社热帖
    const r2 = await fetchData('jiuyan')
    debugInfo.community_posts = r2.debug
    results.community_posts = await saveData('community_posts', r2.data)
    
    // 获取今日热点
    const r3 = await fetchData('chaosha')
    debugInfo.today_hotspot = r3.debug
    results.today_hotspot = await saveData('today_hotspot', r3.data)
    
    // 获取财经日历（按 event 字段去重）
    const r4 = await fetchData('timeline')
    debugInfo.financial_calendar = r4.debug
    results.financial_calendar = await saveData('financial_calendar', r4.data, 'event')
    
    const duration = Date.now() - start
    log(`=== Done in ${duration}ms ===`)
    
    return new Response(JSON.stringify({
      success: true,
      duration: `${duration}ms`,
      saved: results,
      debug: debugInfo,
      logs
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (e) {
    return new Response(JSON.stringify({
      success: false,
      error: e.message,
      logs
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
