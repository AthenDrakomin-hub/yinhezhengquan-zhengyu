// scripts/sync-ipo-data.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { get } from 'https';
import * as iconv from 'iconv-lite';

// 加载环境变量
dotenv.config({
  path: path.resolve(process.cwd(), '.env.local'),
  override: true
});

// 验证环境变量
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 缺少 Supabase 环境变量！');
  process.exit(1);
}

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

// 修复编码：GBK → UTF-8
const fetchIPO = (): Promise<any[]> => {
  return new Promise((resolve) => {
    console.log('📡 正在获取新浪 IPO 数据...');
    
    get({
      hostname: 'vip.stock.finance.sina.com.cn',
      path: '/corp/go.php/vRPD_NewStockIssue/page/1.phtml',
      headers: requestHeaders
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          // 核心修复：先合并 Buffer，再用 iconv-lite 从 GBK 转 UTF-8
          const buffer = Buffer.concat(chunks);
          const html = iconv.decode(buffer, 'GBK');
          
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

            const stockName = cells[2]; // 现在 name 不会乱码了
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

          console.log(`✅ 成功解析 ${ipoList.length} 条真实 IPO 数据（name 已修复乱码）`);
          resolve(ipoList);
        } catch (e) {
          console.error('❌ 解析失败');
          resolve([]);
        }
      });
    }).on('error', () => {
      console.error('❌ 请求失败');
      resolve([]);
    });
  });
};

// 主同步
const sync = async () => {
  try {
    const data = await fetchIPO();
    if (data.length === 0) {
      console.log('⚠️ 无数据');
      return;
    }

    await supabase.from('ipos').delete().not('id', 'is', null);
    console.log('🗑️ 已清空旧数据');

    await supabase.from('ipos').insert(data);
    console.log('📥 已插入真实数据（name 无乱码）');

    console.log('🎉 完成！');
  } catch (e) {
    console.error('❌ 同步失败：', (e as Error).message);
  }
};

sync();