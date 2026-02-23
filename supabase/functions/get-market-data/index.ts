import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { market_type, stock_codes } = await req.json()

    // 模拟实时行情数据
    const quotes = stock_codes.map((code: string) => {
      const basePrice = code.startsWith('6') ? 10 : 100
      const change = (Math.random() - 0.5) * 2
      const currentPrice = basePrice + change
      const changePercent = (change / basePrice) * 100

      // 模拟趋势图数据
      const sparkline = Array.from({ length: 10 }, () => basePrice + (Math.random() - 0.5) * 5)

      return {
        symbol: code,
        name: `模拟股票 ${code}`,
        price: currentPrice.toFixed(2),
        change: change.toFixed(2),
        changePercent: changePercent.toFixed(2),
        sparkline,
        market: market_type,
        volume: Math.floor(Math.random() * 1000000),
        amount: (Math.random() * 10000000).toFixed(2),
        high: (currentPrice + 0.5).toFixed(2),
        low: (currentPrice - 0.5).toFixed(2),
        open: basePrice.toFixed(2),
        lastClose: basePrice.toFixed(2)
      }
    })

    return new Response(JSON.stringify(quotes), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
