import { formatUnits } from 'viem';
import { token as tokenList } from '@/config/tokenList';
import { tokenFaucetAbi } from '@/contractAbis/tokenFaucetAbi';
import { testTokenAbi } from '@/contractAbis/testTokenAbi';
import { TOKEN_FAUCET_ADDRESS_LOCAL } from '@/config/contracts';
import { useReadContract, useWriteContract } from 'wagmi';

export interface TokenInfo {
  tokenAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  faucetAmount: string;
  cooldown: number;
  active: boolean;
  balance?: string;
  canClaim?: boolean;
  nextClaimTime?: number;
  totalClaimed?: string;
  icon?: string;
}

// 获取所有代币的hook
export function useAllTokens() {
  return useReadContract({
    address: TOKEN_FAUCET_ADDRESS_LOCAL as `0x${string}`,
    abi: tokenFaucetAbi,
    functionName: 'getAllTokens',
    query: { refetchInterval: 30000 }, // 每30秒自动刷新
  });
}

// 获取代币余额的hook
export function useTokenBalance(tokenAddress: string | undefined, userAddress: string | undefined) {
  return useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: testTokenAbi,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: { refetchInterval: 30000 },
  });
}

// 获取领取状态的hook
export function useClaimStatus(userAddress: string | undefined, tokenAddress: string | undefined) {
  return useReadContract({
    address: TOKEN_FAUCET_ADDRESS_LOCAL as `0x${string}`,
    abi: tokenFaucetAbi,
    functionName: 'getClaimStatus',
    args: userAddress && tokenAddress ? [userAddress as `0x${string}`, tokenAddress as `0x${string}`] : undefined,
    query: { refetchInterval: 30000 },
  });
}

// 领取代币的hook
export function useClaimToken() {
  const { writeContract,isPending: isClaiming,isSuccess:isClaimSuccess } = useWriteContract();
  
  return {
    claimToken: (tokenAddress: string) => {
     return writeContract({
        address: TOKEN_FAUCET_ADDRESS_LOCAL as `0x${string}`,
        abi: tokenFaucetAbi,
        functionName: 'claimToken',
        args: [tokenAddress as `0x${string}`],
      });
    },
    isClaiming,
    isClaimSuccess
  };
}

// 处理代币数据的辅助函数
export const processTokenData = (
  tokenData: any,
  userAddress?: string,
  balance?: bigint,
  claimStatus?: [boolean, bigint, bigint]
): TokenInfo => {
  const {tokenAddress, name, symbol, decimals, faucetAmount, cooldown, active} = tokenData;
  
  // 查找对应的icon
  const tokenConfig = tokenList.find(t => 
    t.symbol === symbol || 
    t.symbol === symbol.replace('T', '') || // 处理测试代币前缀
    symbol === 'T' + t.symbol
  );

  let canClaim = false;
  let nextClaimTime = 0;
  let totalClaimed = '0';

  if (claimStatus) {
    [canClaim, nextClaimTime, totalClaimed] = claimStatus;
    totalClaimed = formatUnits(totalClaimed, Number(decimals));
  }

  const decimalsNum = Number(decimals);
  const faucetAmountBigInt = typeof faucetAmount === 'string' ? BigInt(faucetAmount) : BigInt(faucetAmount.toString());

  return {
    tokenAddress,
    name,
    symbol,
    decimals: decimalsNum,
    faucetAmount: formatUnits(faucetAmountBigInt, decimalsNum),
    cooldown: Number(cooldown),
    active,
    balance: balance ? formatUnits(balance, decimalsNum) : '0',
    canClaim,
    nextClaimTime: Number(nextClaimTime),
    totalClaimed,
    icon: tokenConfig?.icon || ''
  };
}; 