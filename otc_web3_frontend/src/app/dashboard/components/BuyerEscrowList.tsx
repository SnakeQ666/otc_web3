'use client';

import { useEffect, useState } from 'react';
import { Table, Tag, Button, message, Space, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatUnits } from 'ethers';
import { escrowAbi } from '@/contractAbis/escrowAbi';
import { ESCROW_CONTRACT_ADDRESS_LOCAL } from '@/config/contracts';
import { token as tokenList } from '@/config/tokenList';
// 直接导入wagmi钩子
import { useAccount, useReadContract, useWriteContract } from 'wagmi';

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

  const handleCompleteEscrow = async (orderId: string) => {
    if (!completeResult.writeContract) {
      message.error('合约不可用');
      return;
    }
    
    try {
      completeResult.writeContract({
        address: ESCROW_CONTRACT_ADDRESS_LOCAL,
        abi: escrowAbi,
        functionName: 'completeEscrow',
        args: [orderId],
      });
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
      title: t('dashboard.escrow.orderId'),
      dataIndex: 'orderId',
      key: 'orderId'
    },
    {
      title: t('dashboard.escrow.maker'),
      dataIndex: 'maker',
      key: 'maker',
      render: (maker: string) => (
        <span>{!maker || maker === '0x0000000000000000000000000000000000000000' ? '-' : `${maker.slice(0, 6)}...${maker.slice(-4)}`}</span>
      )
    },
    {
      title: t('dashboard.escrow.amountToSell'),
      dataIndex: 'amountToSell',
      key: 'amountToSell'
    },
    {
      title: t('dashboard.escrow.amountToBuy'),
      dataIndex: 'amountToBuy',
      key: 'amountToBuy'
    },
    {
      title: t('dashboard.escrow.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      )
    },
    {
      title: t('dashboard.escrow.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt'
    },
    {
      title: t('dashboard.escrow.actions'),
      key: 'actions',
      render: (_: any, record: EscrowOrder) => (
        <Space size="middle">
          {record.status === 'Locked' && (
            <Button type="primary" loading={completeResult.isPending} onClick={() => handleCompleteEscrow(record.orderId)}>
              {t('dashboard.escrow.complete')}
            </Button>
          )}
          {record.status === 'Locked' && (
            <Button type="primary" danger loading={disputeResult.isPending} onClick={() => handleDispute(record.orderId)}>
              {t('dashboard.escrow.dispute')}
            </Button>
          )}
        </Space>
      )
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