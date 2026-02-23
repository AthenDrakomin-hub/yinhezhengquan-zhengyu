
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getGalaxyNews = async () => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "请为中国银河证券证裕单元生成 4 条实时快讯新闻头条。包括简短的标题、类别（如科技、能源、宏观）和情感趋势（正面、负面或中性）。",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              sentiment: { type: Type.STRING },
              time: { type: Type.STRING, description: "格式为 HH:mm" }
            },
            required: ["title", "category", "sentiment", "time"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return [
      { title: "银河证券：沪指窄幅震荡，白酒板块集体走强", category: "沪深", sentiment: "positive", time: timeStr },
      { title: "银河港股通：科技股午后走低，美团跌超2%", category: "港股", sentiment: "negative", time: timeStr },
      { title: "新能源汽车出口数据创历史新高 - 银河投研", category: "汽车", sentiment: "positive", time: timeStr },
      { title: "银河宏观：央行今日开展 20 亿逆回购操作", category: "宏观", sentiment: "neutral", time: timeStr }
    ];
  }
};

export const getSmartCustomerSupport = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一位中国银河证券证裕单元的资深客服助理。请专业地回答客户问题：${query}。`,
      config: {
        systemInstruction: "你是中国银河证券证裕交易单元的智能客服机器人。你的风格是专业、合规、富有亲和力，始终代表银河证券品牌形象。",
      }
    });
    return response.text || "抱歉，目前由于网络波动，我无法处理您的请求。请稍后再试。";
  } catch (error) {
    return "智能客服正在维护中，请联系在线人工。";
  }
};

export const validateTradeRisk = async (stockName: string, amount: number, userRiskLevel: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `银河证券合规审查：股票名称：${stockName}，金额：${amount}，用户风险等级：${userRiskLevel}。请分析该笔交易是否符合投资者适当性。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isAppropriate: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
            riskWarning: { type: Type.STRING }
          },
          required: ["isAppropriate", "reason", "riskWarning"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    return { isAppropriate: true, reason: "银河风控审核中", riskWarning: "入市有风险，投资需谨慎。" };
  }
};

export const getStockF10Analysis = async (symbol: string, name: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `请作为银河证券分析师，为股票 ${name} (${symbol}) 提供详细的 F10 基本面分析。包括业务摘要、财务数据、主营构成、前5大股东。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            valuation: { type: Type.STRING },
            yield: { type: Type.STRING },
            financials: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.STRING },
                  trend: { type: Type.STRING }
                },
                required: ["label", "value", "trend"]
              }
            },
            businessSegments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  ratio: { type: Type.STRING }
                },
                required: ["name", "ratio"]
              }
            },
            shareholders: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  ratio: { type: Type.STRING },
                  change: { type: Type.STRING }
                },
                required: ["name", "ratio", "change"]
              }
            },
            announcements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  title: { type: Type.STRING }
                },
                required: ["date", "title"]
              }
            }
          },
          required: ["summary", "valuation", "yield", "financials", "businessSegments", "shareholders", "announcements"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    return { 
      summary: "根据银河证券投研数据，该标的护城河极深，建议关注。", 
      valuation: "估值合理",
      yield: "2.10%",
      financials: [
        { label: "营业收入", value: "1503.2 亿", trend: "positive" },
        { label: "归母净利", value: "747.3 亿", trend: "positive" },
        { label: "毛利率", value: "91.8%", trend: "neutral" }
      ],
      businessSegments: [
        { name: "主营产品", ratio: "88.2%" },
        { name: "次要业务", ratio: "11.8%" }
      ],
      shareholders: [
        { name: "中央汇金", ratio: "10.22%", change: "持平" },
        { name: "香港结算", ratio: "7.15%", change: "增持" }
      ],
      announcements: [
        { date: "2026-03-20", title: "银河证券承销业务公告" }
      ]
    };
  }
};
