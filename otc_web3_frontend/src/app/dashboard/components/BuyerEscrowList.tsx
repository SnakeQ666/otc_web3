'use client';

import { useEffect, useState } from 'react';
import { Table, Tag, Button, message, Space, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatUnits, parseUnits } from 'ethers';
import { escrowAbi } from '@/contractAbis/escrowAbi';
import { ESCROW_CONTRACT_ADDRESS_LOCAL } from '@/config/contracts';
import { token as tokenList } from '@/config/tokenList';
// 直接导入wagmi钩子
import { useAccount, useReadContract, useWriteContract, useReadContracts } from 'wagmi';
import { testTokenAbi } from '@/contractAbis/testTokenAbi';
import { Abi } from 'viem';

interface EscrowOrder {
  orderId: string;
  maker: string;
  taker: string;
  tokenToSell: string;
  tokenToBuy: string;
  amountToSell: string;
  amountToBuy: string;
  status: string;
  createdAt: string;
  completedAt: string;
}

interface EscrowData {
  orderId: bigint;
  maker: string;
  taker: string;
  tokenToSell: string;
  tokenToBuy: string;
  amountToSell: bigint;
  amountToBuy: bigint;
  status: number;
  createdAt: bigint;
  completedAt: bigint;
}

const BuyerEscrowList = () => {
  const { t } = useTranslation();
  const [escrowOrders, setEscrowOrders] = useState<EscrowOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [web3Error, setWeb3Error] = useState<string | null>(null);
  const [hasWeb3, setHasWeb3] = useState(false);
  const [approvingToken, setApprovingToken] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  // 使用钩子从钱包获取地址
  const accountData = useAccount();
  const address = accountData?.address;

  // 读取合约数据
  const { 
    data: eventsData, 
    refetch: refetchEvents 
  } = useReadContract({
    address: ESCROW_CONTRACT_ADDRESS_LOCAL,
    abi: escrowAbi,
    functionName: 'getTakerEscrows',
    args: [address as `0x${string}` || '0x0'],
    query: {
      enabled: !!address
    }
  });

  // 完成托管的合约调用
  const completeResult = useWriteContract();
  
  // 争议的合约调用
  const disputeResult = useWriteContract();

  // 授权合约
  const approveResult = useWriteContract();

  // 批量获取所有token的allowance
  const allowanceContracts = tokenList.map(token => ({
    address: token.address as `0x${string}`,
    abi: testTokenAbi as unknown as Abi,
    functionName: 'allowance',
    args: [address as `0x${string}` || '0x0', ESCROW_CONTRACT_ADDRESS_LOCAL],
  }));
  const { data: allowanceResults, refetch: refetchAllowances } = useReadContracts({
    contracts: allowanceContracts,
    query: { enabled: !!address }
  });

  // allowanceMap: { [tokenAddress]: allowanceValue }
  const allowanceMap: Record<string, bigint> = {};
  if (allowanceResults && Array.isArray(allowanceResults)) {
    allowanceResults.forEach((res, idx) => {
      if (res && res.status === 'success') {
        allowanceMap[tokenList[idx].address] = res.result as bigint;
      }
    });
  }

  // 初始化Web3状态
  useEffect(() => {
    try {
      if (address) {
        setHasWeb3(true);
        setWeb3Error(null);
      } else {
        setHasWeb3(false);
      }
    } catch (error) {
      console.error('Web3初始化错误:', error);
      setWeb3Error('钱包连接失败，请刷新页面重试');
      setHasWeb3(false);
    } finally {
      if (!address) {
        setLoading(false);
      }
    }
  }, [address]);

  // 处理订单数据
  useEffect(() => {
    if (!hasWeb3) {
      return;
    }
    
    if (eventsData) {
      try {
        // 确保eventsData是数组
        const escrowArray = Array.isArray(eventsData) ? eventsData : [];
        console.log("escrowArray", escrowArray)
        const orders = escrowArray.map((escrow: EscrowData) => ({
          orderId: escrow.orderId?.toString(),
          maker: escrow.maker,
          taker: escrow.taker,
          tokenToSell: escrow.tokenToSell,
          tokenToBuy: escrow.tokenToBuy,
          amountToSell: escrow.amountToSell ? formatUnits(escrow.amountToSell, tokenList.find(t => t.address === escrow.tokenToSell)?.decimals || 18) : '0',
          amountToBuy: escrow.amountToBuy ? formatUnits(escrow.amountToBuy, tokenList.find(t => t.address === escrow.tokenToBuy)?.decimals || 18) : '0',
          status: ['Created', 'Locked', 'Completed', 'Refunded', 'Disputed'][escrow.status],
          createdAt: new Date(Number(escrow.createdAt) * 1000).toLocaleString(),
          completedAt: Number(escrow.completedAt) > 0
            ? new Date(Number(escrow.completedAt) * 1000).toLocaleString()
            : '-'
        }));
        setEscrowOrders(orders);
      } catch (error) {
        console.error('处理区块链数据错误:', error);
        setWeb3Error('数据格式错误，请联系管理员');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [eventsData, hasWeb3]);

  // 处理完成托管结果
  useEffect(() => {
    if (!hasWeb3) return;
  
    if (completeResult.isSuccess) {
      message.success(t('dashboard.escrow.completeSuccess'));
      if (refetchEvents) refetchEvents();
    } else if (completeResult.isError) {
      message.error(t('dashboard.escrow.completeError'));
    }
  }, [completeResult.isSuccess, completeResult.isError, t, refetchEvents, hasWeb3]);

  // 处理争议结果
  useEffect(() => {
    if (!hasWeb3) return;
    
    if (disputeResult.isSuccess) {
      message.success(t('dashboard.escrow.disputeSuccess'));
      if (refetchEvents) refetchEvents();
    } else if (disputeResult.isError) {
      message.error(t('dashboard.escrow.disputeError'));
    }
  }, [disputeResult.isSuccess, disputeResult.isError, t, refetchEvents, hasWeb3]);

  // 处理授权结果
  useEffect(() => {
    if (!hasWeb3) return;
    if (approveResult.isSuccess) {
      message.success(t('dashboard.escrow.approveSuccess'));
      refetchAllowances();
      setApprovingToken(null);
    } else if (approveResult.isError) {
      message.error(t('dashboard.escrow.approveError'));
      setApprovingToken(null);
      setPendingOrderId(null);
    }
  }, [approveResult.isSuccess, approveResult.isError, hasWeb3, t, refetchAllowances]);

  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      Created: 'blue',
      Locked: 'orange',
      Completed: 'green',
      Refunded: 'red',
      Disputed: 'purple'
    };
    return statusColors[status] || 'default';
  };

  // 授权逻辑
  const handleApprove = async (tokenAddress: string, amount: string, orderId: string) => {
    if (!approveResult.writeContract || !address) {
      message.error('钱包未连接或合约不可用');
      return;
    }
    try {
      setApprovingToken(tokenAddress);
      setPendingOrderId(orderId);
      const token = tokenList.find(t => t.address === tokenAddress);
      if (!token) {
        message.error('代币信息不存在');
        return;
      }
      const amountInWei = parseUnits(amount, token.decimals || 18);
      await approveResult.writeContract({
        address: tokenAddress as `0x${string}`,
        abi: testTokenAbi as unknown as Abi,
        functionName: 'approve',
        args: [ESCROW_CONTRACT_ADDRESS_LOCAL, amountInWei],
      });
     
    } catch (error) {
      console.error('授权失败:', error);
      message.error(t('dashboard.escrow.approveError'));
      setApprovingToken(null);
      setPendingOrderId(null);
    }
  };

  // 修改handleCompleteEscrow，增加授权判断
  const handleCompleteEscrow = async (orderId: string) => {
    if (!completeResult.writeContract) {
      message.error('合约不可用');
      return;
    }
    try {
      const escrow = escrowOrders.find(order => order.orderId === orderId);
      if (!escrow) {
        message.error(t('dashboard.escrow.notFound'));
        return;
      }
      // 如果是ETH直接complete
      if (escrow.tokenToBuy === '0x0000000000000000000000000000000000000000') {
        completeResult.writeContract({
          address: ESCROW_CONTRACT_ADDRESS_LOCAL,
          abi: escrowAbi,
          functionName: 'completeEscrow',
          args: [orderId],
        });
      } else {
        // ERC20 代币需要先检查授权
        const token = tokenList.find(t => t.address === escrow.tokenToBuy);
        if (!token) {
          message.error('代币信息不存在');
          return;
        }
        const amountInWei = parseUnits(escrow.amountToBuy, token.decimals || 18);
        const allowance = allowanceMap[escrow.tokenToBuy] || BigInt(0);
        if (allowance >= amountInWei) {
          completeResult.writeContract({
            address: ESCROW_CONTRACT_ADDRESS_LOCAL,
            abi: escrowAbi,
            functionName: 'completeEscrow',
            args: [orderId],
          });
        } else {
          handleApprove(escrow.tokenToBuy, escrow.amountToBuy, orderId);
        }
      }
    } catch (error) {
      console.error('完成托管订单失败:', error);
      message.error(t('dashboard.escrow.completeError'));
    }
  };

  const handleDispute = async (orderId: string) => {
    if (!disputeResult.writeContract) {
      message.error('合约不可用');
      return;
    }
    
    try {
      disputeResult.writeContract({
        address: ESCROW_CONTRACT_ADDRESS_LOCAL,
        abi: escrowAbi,
        functionName: 'disputeEscrow',
        args: [orderId],
      });
    } catch (error) {
      console.error('发起争议失败:', error);
      message.error(t('dashboard.escrow.disputeError'));
    }
  };

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'orderId',
      key: 'orderId'
    },
    {
      title: 'Maker',
      dataIndex: 'maker',
      key: 'maker',
      render: (maker: string) => (
        <span>{!maker || maker === '0x0000000000000000000000000000000000000000' ? '-' : `${maker.slice(0, 6)}...${maker.slice(-4)}`}</span>
      )
    },
    {
      title: 'Amount to Sell',
      dataIndex: 'amountToSell',
      key: 'amountToSell',
      render: (amount: string, record: EscrowOrder) => {
        const token = tokenList.find(t => t.address === record.tokenToSell);
        return (
          <span>
            {token && token.icon && <img src={token.icon} alt={token.symbol} style={{width:16,height:16,verticalAlign:'middle',marginRight:4}} />} {amount}
          </span>
        );
      }
    },
    {
      title: 'Amount to Buy',
      dataIndex: 'amountToBuy',
      key: 'amountToBuy',
      render: (amount: string, record: EscrowOrder) => {
        const token = tokenList.find(t => t.address === record.tokenToBuy);
        return (
          <span>
            {token && token.icon && <img src={token.icon} alt={token.symbol} style={{width:16,height:16,verticalAlign:'middle',marginRight:4}} />} {amount}
          </span>
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      )
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: EscrowOrder) => {
        // 判断是否为ERC20
        const isERC20 = record.tokenToBuy !== '0x0000000000000000000000000000000000000000';
        // 当前是否正在授权
        const isApproving = approvingToken === record.tokenToBuy && pendingOrderId === record.orderId;
        // allowance判断
        let enoughAllowance = true;
        if (isERC20 && address) {
          const token = tokenList.find(t => t.address === record.tokenToBuy);
          const amountInWei = parseUnits(record.amountToBuy, token?.decimals || 18);
          const allowance = allowanceMap[record.tokenToBuy] || BigInt(0);
          enoughAllowance = allowance >= amountInWei;
        }
        return (
          <Space size="middle">
            {record.status === 'Locked' && isERC20 && !enoughAllowance && (
              <Button
                type="primary"
                loading={isApproving}
                onClick={() => handleApprove(record.tokenToBuy, record.amountToBuy, record.orderId)}
              >
                {isApproving ? 'Approving...' : 'Approve'}
              </Button>
            )}
            {record.status === 'Locked' && (!isERC20 || enoughAllowance) && (
              <Button
                type="primary"
                loading={completeResult.isPending}
                onClick={() => handleCompleteEscrow(record.orderId)}
              >
                Complete
              </Button>
            )}
            {record.status === 'Locked' && (
              <Button
                type="primary"
                danger
                loading={disputeResult.isPending}
                onClick={() => handleDispute(record.orderId)}
              >
                Dispute
              </Button>
            )}
          </Space>
        );
      }
    }
  ];

  if (web3Error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-red-500 mb-4">{web3Error}</p>
        <Button onClick={() => window.location.reload()}>刷新页面</Button>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center p-8"><Spin size="large" /></div>;
  }

  return (
    <div className="overflow-x-auto w-full">
      <Table
        dataSource={escrowOrders}
        columns={columns}
        rowKey="orderId"
        scroll={{ x: true }}
        locale={{ emptyText: '暂无订单数据' }}
      />
    </div>
  );
};

export default BuyerEscrowList;