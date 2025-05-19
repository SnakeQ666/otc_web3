import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokens = searchParams.get('tokens') || '';

  try {
    console.log('开始获取价格，代币IDs:', tokens);
    
    // 使用ids参数统一获取所有代币价格，包括ETH和其他代币
    const priceRes = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${tokens}&vs_currencies=usd`
    );
    
    if (!priceRes.ok) {
      throw new Error(`API请求失败: ${priceRes.status}`);
    }
    
    const prices = await priceRes.json();
    console.log('获取到价格数据:', prices);
    
    return NextResponse.json(prices);
  } catch (error) {
    console.error('Failed to fetch prices:', error);
    
    // 出错时返回模拟数据，确保前端不会崩溃
    const mockPrices = {
      ethereum: { usd: 3000 },
      tether: { usd: 1 },     // TUSDT
      uniswap: { usd: 5 },    // TUNI
      chainlink: { usd: 15 }, // TLINK
      weth: { usd: 3000 }     // TWETH
    };
    
    console.log('使用模拟价格:', mockPrices);
    return NextResponse.json(mockPrices);
  }
} 