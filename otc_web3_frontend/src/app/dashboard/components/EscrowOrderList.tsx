'use client';

import { useEffect, useState } from 'react';
import { Table, Tag, Button, message, Space, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatUnits, parseEther, parseUnits } from 'ethers';
import { escrowAbi } from '@/contractAbis/escrowAbi';
import { ESCROW_CONTRACT_ADDRESS_LOCAL } from '@/config/contracts';
import { token as tokenList } from '@/config/tokenList';
import {testTokenAbi} from '@/contractAbis/testTokenAbi';
import { Abi } from 'viem';
// 直接导入wagmi钩子，避免动态导入
import { useAccount, useReadContract, useWriteContract, useReadContracts } from 'wagmi';

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
  const [approvingToken, setApprovingToken] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  
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
      setWeb3Error('Wallet connection failed, please refresh the page and try again');
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
        console.log("eventsData", eventsData);
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
        setWeb3Error('Data format error, please contact the administrator');
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

  // 处理授权结果
  useEffect(() => {
    if (!hasWeb3) return;
    
    if (approveResult.isSuccess) {
      message.success(t('dashboard.escrow.approveSuccess'));
      // 重新获取授权额度
      refetchAllowances();
      // 清除授权状态
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

  const handleApprove = async (tokenAddress: string, amount: string, orderId: string) => {
    if (!approveResult.writeContract || !address) {
      message.error('Wallet not connected or contract not available');
      return;
    }
    try {
      setApprovingToken(tokenAddress);
      setPendingOrderId(orderId);
      const token = tokenList.find(t => t.address === tokenAddress);
      if (!token) {
        message.error('Token information does not exist');
        return;
      }
      const amountInWei = parseUnits(amount, token.decimals || 18);
      await approveResult.writeContract({
        address: tokenAddress as `0x${string}`,
        abi: testTokenAbi,
        functionName: 'approve',
        args: [ESCROW_CONTRACT_ADDRESS_LOCAL, amountInWei],
      });
    } catch (error) {
      console.error('Authorization failed:', error);
      message.error(t('dashboard.escrow.approveError'));
      setApprovingToken(null);
      setPendingOrderId(null);
    }
  };

  const handleLockEscrow = async (orderId: string) => {
    if (!lockResult.writeContract || !address) {
      message.error('Wallet not connected or contract not available');
      return;
    }
    
    try {
      const escrow = escrowOrders.find(order => order.orderId === orderId);
      if (!escrow) {
        message.error(t('dashboard.escrow.notFound'));
        return;
      }

      // Check if the token is ETH (address 0)
      if (escrow.tokenToSell === '0x0000000000000000000000000000000000000000') {
        // ETH 直接锁定
        handleLockEscrowDirect(orderId);
      } else {
        // ERC20 代币需要先检查授权
        const token = tokenList.find(t => t.address === escrow.tokenToSell);
        if (!token) {
          message.error('Token information does not exist');
          return;
        }

        const amountInWei = parseUnits(escrow.amountToSell, tokenList.find(t => t.address === escrow.tokenToSell)?.decimals || 18);
        console.log("amountInWei", amountInWei)
        console.log("allowanceMap[escrow.tokenToSell]", allowanceMap[escrow.tokenToSell])
        // 检查授权额度
        if (allowanceMap[escrow.tokenToSell] && allowanceMap[escrow.tokenToSell] >= amountInWei) {
          
          // 已有足够授权，直接锁定
          handleLockEscrowDirect(orderId);
        } else {
        
          // 需要授权
          handleApprove(escrow.tokenToSell, escrow.amountToSell, orderId);
        }
      }
    } catch (error) {
      console.error('Lock escrow failed:', error);
      message.error(t('dashboard.escrow.lockError'));
    }
  };

  const handleLockEscrowDirect = async (orderId: string) => {
    if (!lockResult.writeContract || !address) {
      message.error('Wallet not connected or contract not available');
      return;
    }

    try {
      lockResult.writeContract({
        address: ESCROW_CONTRACT_ADDRESS_LOCAL,
        abi: escrowAbi,
        functionName: 'lockEscrow',
        args: [orderId],
      });
    } catch (error) {
      console.error('Lock escrow failed:', error);
      message.error(t('dashboard.escrow.lockError'));
    }
  };

  const handleDispute = async (orderId: string) => {
    if (!disputeResult.writeContract) {
      message.error('Contract not available');
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
      console.error('Dispute failed:', error);
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
      title: 'Taker',
      dataIndex: 'taker',
      key: 'taker',
      render: (taker: string) => (
        <span>{taker === '0x0000000000000000000000000000000000000000' ? '-' : `${taker.slice(0, 6)}...${taker.slice(-4)}`}</span>
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
        const isERC20 = record.tokenToSell !== '0x0000000000000000000000000000000000000000';
        // 当前是否正在授权
        const isApproving = approvingToken === record.tokenToSell && pendingOrderId === record.orderId;
        // allowance判断
        let enoughAllowance = true;
        if (isERC20 && address) {
          const token = tokenList.find(t => t.address === record.tokenToSell);
          try {
            // 使用try-catch包裹，防止精度异常导致程序崩溃
            const decimals = token?.decimals || 18;
            // 对极小的数值进行特殊处理，使用最小的有效值代替
            const safeAmount = record.amountToSell === '0' ? '0' : 
              (Number(record.amountToSell) < 1e-15 ? '0.000000000000001' : record.amountToSell);
            const amountInWei = parseUnits(safeAmount, decimals);
            const allowance = allowanceMap[record.tokenToSell] || BigInt(0);
            enoughAllowance = allowance >= amountInWei;
          } catch (error) {
            console.error('Error parsing amount:', error);
            // 出错时保守处理，认为授权不足
            enoughAllowance = false;
          }
        }
        return (
          <Space size="middle">
            {record.status === 'Created' && isERC20 && !enoughAllowance && (
              <Button
                type="primary"
                loading={isApproving}
                onClick={() => handleApprove(record.tokenToSell, record.amountToSell, record.orderId)}
              >
                {isApproving ? 'Approving...' : 'Approve'}
              </Button>
            )}
            {record.status === 'Created' && (!isERC20 || enoughAllowance) && (
              <Button
                type="primary"
                loading={lockResult.isPending}
                onClick={() => handleLockEscrow(record.orderId)}
              >
                Lock
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

  if (loading) {
    return <div className="flex justify-center p-8"><Spin size="large" /></div>;
  }

  if (web3Error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-red-500 mb-4">{web3Error}</p>
        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
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
        locale={{ emptyText: 'No order data' }}
      />
    </div>
  );
};

export default EscrowOrderList;