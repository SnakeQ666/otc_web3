'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Card, Button, Tag, Space, Typography, Image, message } from 'antd';
import { useWeb3Store } from '@/store/web3Store';
import { MARKET_CONTRACT_ADDRESS_LOCAL, ESCROW_CONTRACT_ADDRESS_LOCAL } from '@/config/contracts';
import { marketAbi } from '@/contractAbis/marketAbi';
import { escrowAbi } from '@/contractAbis/escrowAbi';
import { token as tokenList } from '@/config/tokenList';
import { useReadContract, useWriteContract } from 'wagmi';
import { formatUnits } from 'ethers';

const { Title } = Typography;

interface Order {
  orderId: bigint;
  maker: string;
  tokenToSell: string;
  tokenToBuy: string;
  amountToSell: bigint;
  amountToBuy: bigint;
  status: number;
  createdAt: bigint;
}

export default function OrderHall() {
  const router = useRouter();
  const { t } = useTranslation();
  const { address } = useWeb3Store();
  const [orders, setOrders] = useState<Order[]>([]);

  const { data: ordersData, refetch: refetchAllOrders, error: allOrdersFetchError } = useReadContract({
    address: MARKET_CONTRACT_ADDRESS_LOCAL,
    abi: marketAbi,
    functionName: 'getAllOrders',
  });

  useEffect(() => {
    if (ordersData) {
      // 显示所有订单，不进行过滤
      setOrders(ordersData as Order[]);
    }
  }, [ordersData]);

  const { writeContract: writeEscrowContract, isPending: isRespondingOrder, isSuccess: isRespondSuccess, isError: isRespondError,error } = useWriteContract();

  const handleRespond = async (orderId: bigint) => {
    try {
      writeEscrowContract({
        address: ESCROW_CONTRACT_ADDRESS_LOCAL,
        abi: escrowAbi,
        functionName: 'createEscrow',
        args: [orderId],
      });
    } catch (error) {
      console.error('响应订单失败:', error);
    }
  };

  useEffect(() => {
    if (isRespondSuccess) {
      message.success(t('orderhall.respondSuccess'));
      refetchAllOrders();
    }
    else if(isRespondError) {
      message.error(error?.message);
    }
  }, [isRespondSuccess,isRespondError]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div className="flex justify-between items-center mb-6">
              <Title level={4}>{t('orderhall.title')}</Title>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((order) => (
                <Card
                  key={order.orderId.toString()}
                  className={`border-l-4 ${order.maker.toLowerCase() === address?.toLowerCase() ? 'border-l-blue-500' : 'border-l-orange-500'}`}
                  hoverable
                >
                  <div className="flex flex-col space-y-3">
                    <div className="flex justify-between items-center">
                      <Tag color={order.maker.toLowerCase() === address?.toLowerCase() ? 'blue' : 'orange'}>
                        {order.maker.toLowerCase() === address?.toLowerCase() ? t('orders.sell') : t('orders.buy')}
                      </Tag>
                      <Tag color={
                        order.status === 1 ? 'success' :
                        order.status === 2 ? 'error' :
                        'processing'
                      }>
                        {t(`orders.${order.status === 1 ? 'completed' : order.status === 2 ? 'cancelled' : 'pending'}`)}
                      </Tag>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-gray-500">{t('orders.amountToSell')}</div>
                        <div className="font-medium">{Number(formatUnits(order.amountToSell, tokenList.find(t => t.address === order.tokenToSell)?.decimals || 18)).toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">{t('orders.amountToBuy')}</div>
                        <div className="font-medium">{Number(formatUnits(order.amountToBuy, tokenList.find(t => t.address === order.tokenToBuy)?.decimals || 18)).toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">{t('orders.tokenToSell')}</div>
                        <div className="font-medium flex items-center gap-2">
                          <Image
                            src={tokenList.find(t => t.address === order.tokenToSell)?.icon || ''}
                            alt={tokenList.find(t => t.address === order.tokenToSell)?.symbol || ''}
                            width={20}
                            height={20}
                            preview={false}
                          />
                          <span>{tokenList.find(t => t.address === order.tokenToSell)?.symbol || order.tokenToSell}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">{t('orders.tokenToBuy')}</div>
                        <div className="font-medium flex items-center gap-2">
                          <Image
                            src={tokenList.find(t => t.address === order.tokenToBuy)?.icon || ''}
                            alt={tokenList.find(t => t.address === order.tokenToBuy)?.symbol || ''}
                            width={20}
                            height={20}
                            preview={false}
                          />
                          <span>{tokenList.find(t => t.address === order.tokenToBuy)?.symbol || order.tokenToBuy}</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-gray-500">{t('orders.createdAt')}</div>
                        <div className="font-medium">{new Date(Number(order.createdAt) * 1000).toLocaleString()}</div>
                      </div>
                    </div>
                    {order.status === 0 && order.maker.toLowerCase() !== address?.toLowerCase() && (
                      <Button
                        type="primary"
                        loading={isRespondingOrder}
                        onClick={() => handleRespond(order.orderId)}
                        className="w-full"
                      >
                        {t('orders.respond')}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
}