'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useWeb3Store } from '@/store/web3Store';
import { useEffect, useState } from 'react';
import { Button } from 'antd';

export function ConnectWallet() {
  // 添加状态以跟踪组件是否已渲染
  const [isLoaded, setIsLoaded] = useState(false);
  const [wagmiError, setWagmiError] = useState<Error | null>(null);
  
  // 使用状态存储钱包信息
  const [walletInfo, setWalletInfo] = useState({
    address: undefined as `0x${string}` | undefined,
    isConnected: false
  });
  
  // 使用try-catch包装useAccount钩子
  try {
    const accountData = useAccount();
    
    // 仅在组件加载后更新walletInfo，避免初次渲染时的问题
    useEffect(() => {
      setWalletInfo({
        address: accountData?.address,
        isConnected: !!accountData?.isConnected
      });
      setIsLoaded(true);
      // 添加调试信息
      console.log('钱包连接状态:', {
        address: accountData?.address,
        isConnected: accountData?.isConnected
      });
    }, [accountData?.address, accountData?.isConnected]);
    
  } catch (error) {
    // 捕获并记录错误
    console.error('钱包连接错误:', error);
    if (error instanceof Error && !wagmiError) {
      setWagmiError(error);
    }
  }
  
  const { setIsConnected, setAddress } = useWeb3Store();

  // 更新全局Web3状态
  useEffect(() => {
    if (isLoaded && !wagmiError) {
      setIsConnected(walletInfo.isConnected);
      setAddress(walletInfo.address);
    }
  }, [isLoaded, walletInfo, setIsConnected, setAddress, wagmiError]);

  // 调试信息
  useEffect(() => {
    console.log('ConnectWallet组件渲染, 状态:', {
      isLoaded,
      hasError: !!wagmiError,
      address: walletInfo.address?.slice(0, 6),
      isConnected: walletInfo.isConnected
    });
  }, [isLoaded, wagmiError, walletInfo]);

  // 如果有错误，显示基本的连接按钮
  if (wagmiError) {
    console.log('显示备用连接按钮 (出错)');
    return (
      <Button type="primary" onClick={() => window.location.reload()}>
        连接钱包
      </Button>
    );
  }

  // 未加载完成前显示占位按钮
  if (!isLoaded) {
    console.log('显示加载中按钮');
    return (
      <Button type="primary" loading>
        加载钱包...
      </Button>
    );
  }

  // 正常情况下返回RainbowKit的ConnectButton
  console.log('显示RainbowKit按钮');
  return <ConnectButton />;
}