'use client';

import { useEffect, useState } from 'react';
import { Table, Tag, Button, message, Space, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatUnits, parseEther } from 'ethers';
import { escrowAbi } from '@/contractAbis/escrowAbi';
import { ESCROW_CONTRACT_ADDRESS_LOCAL } from '@/config/contracts';
// 直接导入wagmi钩子，避免动态导入
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

// 定义合约返回的订单类型
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

const EscrowOrderList = () => {
  const { t } = useTranslation();
  const [escrowOrders, setEscrowOrders] = useState<EscrowOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [web3Error, setWeb3Error] = useState<string | null>(null);
  const [hasWeb3, setHasWeb3] = useState(false);
  
  // 直接使用wagmi钩子
  const account = useAccount();
  const address = account?.address;
  
  // 读取合约数据
  const { 
    data: eventsData, 
    refetch: refetchEvents 
  } = useReadContract({
    address: ESCROW_CONTRACT_ADDRESS_LOCAL,
    abi: escrowAbi,
    functionName: 'getMakerEscrows',
    args: [address as `0x${string}` || '0x0'],
    query: {
      enabled: !!address
    }
  });
  
  // 锁定合约
  const lockResult = useWriteContract();
  
  // 争议合约
  const disputeResult = useWriteContract();
  
  // 初始化状态
  useEffect(() => {
    try {
      if (address) {
        setHasWeb3(true);
        setWeb3Error(null);
      } else {
        setHasWeb3(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Web3初始化错误:', error);
      setWeb3Error('钱包连接失败，请刷新页面重试');
      setHasWeb3(false);
      setLoading(false);
    }
  }, [address]);

  // 处理合约数据
  useEffect(() => {
    if (!hasWeb3) {
      return;
    }
    
    if (eventsData) {
      try {
        // 确保eventsData是数组类型
        const escrowArray = Array.isArray(eventsData) ? eventsData : [];
        
        const orders = escrowArray.map((escrow: EscrowData) => ({
          orderId: escrow.orderId?.toString(),
          maker: escrow.maker,
          taker: escrow.taker,
          tokenToSell: escrow.tokenToSell,
          tokenToBuy: escrow.tokenToBuy,
          amountToSell: formatUnits(escrow.amountToSell, 18),
          amountToBuy: formatUnits(escrow.amountToBuy, 18),
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

  // 处理锁定结果
  useEffect(() => {
    if (!hasWeb3) return;
    
    if (lockResult.isSuccess) {
      message.success(t('dashboard.escrow.lockSuccess'));
      if (refetchEvents) refetchEvents();
    } else if (lockResult.isError && lockResult.error) {
      message.error(lockResult.error.message || t('dashboard.escrow.lockError'));
    }
  }, [lockResult.isSuccess, lockResult.isError, lockResult.error, refetchEvents, t, hasWeb3]);

  // 处理争议结果
  useEffect(() => {
    if (!hasWeb3) return;
    
    if (disputeResult.isSuccess) {
      message.success(t('dashboard.escrow.disputeSuccess'));
      if (refetchEvents) refetchEvents();
    } else if (disputeResult.isError) {
      message.error(t('dashboard.escrow.disputeError'));
    }
  }, [disputeResult.isSuccess, disputeResult.isError, refetchEvents, t, hasWeb3]);

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

  const handleLockEscrow = async (orderId: string) => {
    if (!lockResult.writeContract || !address) {
      message.error('钱包未连接或合约不可用');
      return;
    }
    
    try {
      const escrow = escrowOrders.find(order => order.orderId === orderId);
      if (!escrow) {
        message.error(t('dashboard.escrow.notFound'));
        return;
      }

      // Check if the token is ETH (address 0)
      if (escrow.tokenToSell !== '0x0000000000000000000000000000000000000000') {
        // 为简化示例，我们跳过了ERC20代币的授权检查
        message.warning('ERC20代币需要先授权');
        return;
      }

      lockResult.writeContract({
        address: ESCROW_CONTRACT_ADDRESS_LOCAL,
        abi: escrowAbi,
        functionName: 'lockEscrow',
        value: parseEther(escrow.amountToSell),
        args: [orderId],
      });
    } catch (error) {
      console.error('Lock escrow failed:', error);
      message.error(t('dashboard.escrow.lockError'));
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
      title: t('dashboard.escrow.taker'),
      dataIndex: 'taker',
      key: 'taker',
      render: (taker: string) => (
        <span>{taker === '0x0000000000000000000000000000000000000000' ? '-' : `${taker.slice(0, 6)}...${taker.slice(-4)}`}</span>
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
          {record.status === 'Created' && (
            <Button type="primary" loading={lockResult.isPending} onClick={() => handleLockEscrow(record.orderId)}>
              {t('dashboard.escrow.lock')}
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

  if (loading) {
    return <div className="flex justify-center p-8"><Spin size="large" /></div>;
  }

  if (web3Error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-red-500 mb-4">{web3Error}</p>
        <Button onClick={() => window.location.reload()}>刷新页面</Button>
      </div>
    );
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

export default EscrowOrderList;