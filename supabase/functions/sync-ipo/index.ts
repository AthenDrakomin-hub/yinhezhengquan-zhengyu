import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 环境变量
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// 初始化 Supabase 客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 新浪请求头
const requestHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': 'https://www.sina.com.cn/'
};

// 数字解析
function parseNum(text: string): number | null {
  const num = parseFloat(text.replace(/[^\d\.]/g, ''));
  return isNaN(num) ? null : num;
}

// 获取并解析新浪IPO数据
async function fetchIPO(): Promise<any[]> {
  return new Promise((resolve) => {
    console.log('📡 正在获取新浪 IPO 数据...');
    
    Deno.connect({
      hostname: 'vip.stock.finance.sina.com.cn',
      port: 443,
      transport: 'tls'
    }).then(async (conn) => {
      const encoder = new TextEncoder();
      const request = `GET /corp/go.php/vRPD_NewStockIssue/page/1.phtml HTTP/1.1\r\n` +
                      `Host: vip.stock.finance.sina.com.cn\r\n` +
                      `User-Agent: ${requestHeaders['User-Agent']}\r\n` +
                      `Referer: ${requestHeaders['Referer']}\r\n` +
                      `Connection: close\r\n\r\n`;
      
      await conn.write(encoder.encode(request));
      
      let responseData = new Uint8Array(0);
      const buffer = new Uint8Array(1024 * 64);
      
      try {
        while (true) {
          const n = await conn.read(buffer);
          if (n === null) break;
          const temp = new Uint8Array(responseData.length + n);
          temp.set(responseData);
          temp.set(buffer.subarray(0, n), responseData.length);
          responseData = temp;
        }
        
        const decoder = new TextDecoder('gbk');
        const responseText = decoder.decode(responseData);
        
        // 提取HTML内容
        const htmlMatch = responseText.match(/<html[\s\S]*<\/html>/i);
        const html = htmlMatch ? htmlMatch[0] : responseText;
        
        // 正则匹配表格行
        const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
        const rows = html.match(rowRegex) || [];
        const ipoList: any[] = [];

        for (let i = 2; i < rows.length; i++) {
          const row = rows[i];
          const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
          const cells: string[] = [];
          let match;
          while ((match = cellRegex.exec(row)) !== null) {
            const text = match[1].replace(/<[^>]*>/g, '').trim();
            cells.push(text);
          }

          if (cells.length < 10) continue;

          const stockCode = cells[0].replace(/\D/g, '');
          if (!/^\d{6}$/.test(stockCode)) continue;

          const stockName = cells[2];
          const subscribeCode = cells[1];
          const subscribeDate = cells[3];
          let listingDate = cells[4];
          const issuePrice = parseNum(cells[7]);
          const issueVolume = parseNum(cells[5]);
          const onlineIssueVolume = parseNum(cells[6]);
          const peRatio = parseNum(cells[8]);

          let status = 'UPCOMING';
          if (listingDate && listingDate.match(/\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/)) {
            listingDate = listingDate.replace(/\//g, '-');
            const listDate = new Date(listingDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            listDate.setHours(0, 0, 0, 0);
            status = listDate < today ? 'LISTED' : 'UPCOMING';
          }

          let market = 'SH';
          if (stockCode.startsWith('0') || stockCode.startsWith('3')) market = 'SZ';

          ipoList.push({
            symbol: stockCode,
            name: stockName,
            market: market,
            status: status,
            ipo_price: issuePrice,
            issue_date: subscribeDate ? new Date(subscribeDate) : null,
            listing_date: listingDate ? new Date(listingDate) : null,
            subscription_code: subscribeCode,
            issue_volume: issueVolume,
            online_issue_volume: onlineIssueVolume,
            pe_ratio: peRatio
          });
        }

        console.log(`✅ 成功解析 ${ipoList.length} 条真实 IPO 数据`);
        resolve(ipoList);
      } finally {
        conn.close();
      }
    }).catch((error) => {
      console.error('❌ 连接失败:', error);
      resolve([]);
    });
  });
}

serve(async (req) => {
  try {
    // 验证请求方法
    if (req.method !== 'POST' && req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 简单的API密钥验证（可选）
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = Deno.env.get('IPO_SYNC_API_KEY');
    
    if (expectedKey && apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🚀 开始同步 IPO 数据...');
    
    // 获取数据
    const data = await fetchIPO();
    
    if (data.length === 0) {
      console.log('⚠️ 无数据');
      return new Response(JSON.stringify({ 
        success: false, 
        message: '无数据可同步' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 清空旧数据
    const { error: deleteError } = await supabase.from('ipos').delete().not('id', 'is', null);
    
    if (deleteError) {
      console.error('❌ 删除旧数据失败:', deleteError);
      throw deleteError;
    }
    console.log('🗑️ 已清空旧数据');

    // 插入新数据
    const { error: insertError } = await supabase.from('ipos').insert(data);
    
    if (insertError) {
      console.error('❌ 插入新数据失败:', insertError);
      throw insertError;
    }
    console.log('📥 已插入真实数据');

    console.log('🎉 IPO 数据同步完成！');
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `成功同步 ${data.length} 条 IPO 数据`,
      count: data.length,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ 同步失败：', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || '同步失败' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
