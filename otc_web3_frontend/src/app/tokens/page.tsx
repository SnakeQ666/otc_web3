'use client';

import { useTranslation } from 'react-i18next';
import { Card, Typography, Button, Table, Tag, message, Spin, Avatar, Tooltip } from 'antd';
import { useAccount } from 'wagmi';
import { useAllTokens, useClaimToken, processTokenData, TokenInfo } from '@/app/services/tokenFaucetService';
import { formatDistanceToNow } from 'date-fns';
import { ConnectWallet } from '@/app/components/ConnectWallet';
import { useReadContracts } from 'wagmi';
import { TOKEN_FAUCET_ADDRESS_LOCAL } from '@/config/contracts';
import type { Abi } from 'viem';
import { testTokenAbi } from '@/contractAbis/testTokenAbi';
import { tokenFaucetAbi } from '@/contractAbis/tokenFaucetAbi';
import React, { useEffect, useState, useMemo } from 'react';

const { Title, Text } = Typography;

export default function TokenFaucetPage() {
  const { t } = useTranslation();
  const { address, isConnected } = useAccount();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const { data: rawTokenList, isLoading: isLoadingTokens, refetch: refetchTokens } = useAllTokens();
  const { claimToken, isClaiming, isClaimSuccess } = useClaimToken();

  const tokenArray = useMemo(() => (rawTokenList as any[]) || [], [rawTokenList]);

  // 使用 useMemo 缓存 contracts 配置
  const balanceContracts = useMemo(() => 
    tokenArray.map(tokenData => ({
      address: tokenData.tokenAddress,
      abi: testTokenAbi as Abi,
      functionName: 'balanceOf',
      args: address ? [address] : undefined,
    })), [tokenArray, address]);

  const claimStatusContracts = useMemo(() => 
    tokenArray.map(tokenData => ({
      address: TOKEN_FAUCET_ADDRESS_LOCAL as `0x${string}`,
      abi: tokenFaucetAbi as Abi,
      functionName: 'getClaimStatus',
      args: address ? [address, tokenData.tokenAddress] : undefined,
    })), [tokenArray, address]);

  // 批量读取
  const { data: balancesData, refetch: refetchBalances } = useReadContracts({
    contracts: balanceContracts,
    query: { enabled: isConnected && !!address && tokenArray.length > 0 },
  });

  const { data: claimStatusesData, refetch: refetchClaimStatuses } = useReadContracts({
    contracts: claimStatusContracts,
    query: { enabled: isConnected && !!address && tokenArray.length > 0 },
  });

  // 优化后的 useEffect
  useEffect(() => {
    if (!tokenArray.length || !balancesData || !claimStatusesData) {
      return;
    }

    const newTokens: TokenInfo[] = tokenArray.map((tokenData, idx) => {
      const balance = balancesData[idx]?.result as bigint | undefined;
      const claimStatus = claimStatusesData[idx]?.result as [boolean, bigint, bigint] | undefined;
      return processTokenData(tokenData, address, balance, claimStatus);
    });

    // 添加数据比较，避免不必要的更新
    const hasChanged = newTokens.some((token, index) => {
      const oldToken = tokens[index];
      return !oldToken || 
             token.balance !== oldToken.balance || 
             token.canClaim !== oldToken.canClaim;
    });

    if (hasChanged) {
      setTokens(newTokens);
    }
  }, [balancesData, claimStatusesData, tokenArray, address, tokens]);

  useEffect(() => {
    if (isClaimSuccess) {
      message.success(t('tokens.claimSuccess'));
      refetchTokens();
      refetchClaimStatuses();
      refetchBalances();
    }
  }, [isClaimSuccess, t, refetchTokens, refetchClaimStatuses, refetchBalances]);

  const handleClaimToken = async (tokenAddress: string) => {
    if (!isConnected) {
      message.warning(t('tokens.connectWallet'));
      return;
    }
   
    try {
      const res = await claimToken(tokenAddress);
      console.log("res", res);
    } catch (error) {
      console.error('Error claiming token:', error);
      message.error(t('tokens.claimError'));
    } 
  };

  const columns = [
    {
      title: t('tokens.token'),
      dataIndex: 'name',
      key: 'token',
      render: (_: string, record: TokenInfo) => (
        <div className="flex items-center">
          <Avatar 
            src={record.icon} 
            size={24} 
            className="mr-2"
            alt={record.symbol}
          />
          <div>
            <div className="font-medium">{record.name}</div>
            <div className="text-xs text-gray-500">{record.symbol}</div>
          </div>
        </div>
      ),
    },
    {
      title: t('tokens.amount'),
      dataIndex: 'faucetAmount',
      key: 'amount',
      render: (amount: string, record: TokenInfo) => (
        <Text>{`${amount} ${record.symbol}`}</Text>
      ),
    },
    {
      title: t('tokens.balance'),
      dataIndex: 'balance',
      key: 'balance',
      render: (balance: string, record: TokenInfo) => (
        <Text>{isConnected ? `${balance} ${record.symbol}` : '-'}</Text>
      ),
    },
    {
      title: t('tokens.status'),
      key: 'status',
      render: (_: string, record: TokenInfo) => {
        if (!isConnected) {
          return <Tag color="default">{t('tokens.walletNotConnected')}</Tag>;
        }
        
        if (record.canClaim) {
          return <Tag color="success">{t('tokens.available')}</Tag>;
        }
        
        if (record.nextClaimTime && record.nextClaimTime > 0) {
          const nextClaimDate = new Date(record.nextClaimTime * 1000);
          const timeLeft = formatDistanceToNow(nextClaimDate, { addSuffix: true });
          
          return (
            <Tooltip title={`${t('tokens.availableIn')} ${timeLeft}`}>
              <Tag color="warning">{t('tokens.cooldown')}</Tag>
            </Tooltip>
          );
        }
        
        return <Tag color="default">{t('tokens.unknown')}</Tag>;
      },
    },
    {
      title: t('tokens.action'),
      key: 'action',
      render: (_: string, record: TokenInfo) => {
      
        const canClaim = isConnected && record.canClaim;
        
        return (
          <Button
            type="primary"
            onClick={() => handleClaimToken(record.tokenAddress)}
            loading={isClaiming}
            disabled={!canClaim || isClaiming}
          >
            {t('tokens.claim')}
          </Button>
        );
      },
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-4">
        <Title level={3}>{t('tokens.pageTitle')}</Title>
        <Text>{t('tokens.pageDescription')}</Text>
        
        {!isConnected && (
          <div className="mt-4 mb-4 p-4 bg-blue-50 rounded-md">
            <Text className="block mb-2">{t('tokens.connectWalletMessage')}</Text>
            <ConnectWallet />
          </div>
        )}
      </Card>
      
      <Card>
        <Title level={4}>{t('tokens.availableTokens')}</Title>
        <Table 
          dataSource={tokens} 
          columns={columns} 
          rowKey="tokenAddress"
          pagination={false}
          locale={{ emptyText: t('tokens.noTokens') }}
        />
      </Card>
    </div>
  );
} 