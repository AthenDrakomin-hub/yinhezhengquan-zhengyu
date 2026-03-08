/**
 * Vercel Serverless Function - IPO 数据同步
 * 每天 8:00 AM 自动执行（通过 vercel.json crons 配置）
 * 
 * Vercel 路径: /api/ipo-sync-cron
 * 兼容 Vercel Serverless Functions (Node.js runtime)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 验证是否为 Vercel Cron 调用
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.VERCEL_CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({
      error: 'Unauthorized',
      timestamp: new Date().toISOString()
    });
  }

  try {
    console.log('🕐 Vercel Cron 触发 IPO 同步...');
    
    // 调用 Supabase Edge Function 执行同步
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const syncUrl = `${supabaseUrl}/functions/v1/sync-ipo`;
    
    console.log(`📡 调用 Edge Function: ${syncUrl}`);
    
    const response = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Edge Function 返回错误: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ IPO 同步完成:', result);
    
    return res.status(200).json({
      success: true,
      message: 'Vercel Cron 触发成功',
      syncResult: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Vercel Cron 执行失败:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
}
