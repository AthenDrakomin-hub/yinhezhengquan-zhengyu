/**
 * Vercel Cron Job - IPO 数据同步
 * 每天 8:00 AM 自动执行
 * 
 * 配置位置: vercel.json
 * Cron 表达式: 0 8 * * * (每天 8:00 AM)
 */

import { NextResponse } from 'next/server';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: Request) {
  // 验证是否为 Vercel Cron 调用
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.VERCEL_CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
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
    
    return NextResponse.json({
      success: true,
      message: 'Vercel Cron 触发成功',
      syncResult: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Vercel Cron 执行失败:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// 为了兼容 Next.js 13+ 的 App Router
export async function GET(req: Request) {
  return handler(req);
}

export async function POST(req: Request) {
  return handler(req);
}
