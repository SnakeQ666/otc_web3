'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Card, Button, Tag, Space, Typography, Modal, Form, Input, Select, message, Image, Statistic } from 'antd';
import useAuthStore from '@/store/authStore';
import { useWeb3Store } from '@/store/web3Store';
import { MARKET_CONTRACT_ADDRESS_LOCAL, ESCROW_CONTRACT_ADDRESS_LOCAL } from '@/config/contracts';
import { marketAbi } from '@/contractAbis/marketAbi';
import { escrowAbi } from '@/contractAbis/escrowAbi';
import { token as tokenList } from '@/config/tokenList';
import { useReadContract, useWriteContract, useBalance } from 'wagmi';
import { formatUnits, ethers } from 'ethers';

// 添加全局样式
const globalStyles = `
  .ant-select-selection-item .ant-image {
    vertical-align: middle !important;
    display: inline-flex !important;
    align-items: center !important;
  }
  
  .ant-select-selection-item {
    display: flex !important;
    align-items: center !important;
  }
`;

// 标准 ERC-20 ABI（仅包含 balanceOf）
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];
const { Title } = Typography;
const { Option } = Select;

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

// 主网真实代币ID映射 (CoinGecko IDs)
const MAINNET_ID_MAP: Record<string, string> = {
  ETH: 'ethereum',
  TUSDT: 'tether',
  TUNI: 'uniswap',
  TLINK: 'chainlink',
  TWETH: 'weth',
};

function getMainnetId(symbol: string): string {
  // 添加调试日志
  console.log(`getMainnetId 调用: ${symbol} -> ${MAINNET_ID_MAP[symbol] || '未找到'}`);
  return MAINNET_ID_MAP[symbol] || '';
}

export default function Orders() {
  const router = useRouter();
  const { t } = useTranslation();
  const { address } = useWeb3Store();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [selectedTokenBalance, setSelectedTokenBalance] = useState<string>('0');
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>('');
  const [sellToken, setSellToken] = useState<any>();
  const [buyToken, setBuyToken] = useState<any>();
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [prices, setPrices] = useState<any>({});
  const [buyBalance, setBuyBalance] = useState('0');

  const { data: ordersData, refetch:refetchAllOrders, error: allOrdersFetchError} = useReadContract({
    address: MARKET_CONTRACT_ADDRESS_LOCAL,
    abi: marketAbi,
    functionName: 'getAllOrders',
  });

  useEffect(() => {
    if (ordersData && address) {
      // 过滤只显示当前钱包地址创建的订单
      const filteredOrders = (ordersData as Order[]).filter(order => 
        order.maker.toLowerCase() === address.toLowerCase()
      );
      setOrders(filteredOrders);
    } else if(allOrdersFetchError) {
      message.error(t('orders.fetchError'));
    }
  }, [ordersData, allOrdersFetchError, address]);

  const handleCreateOrder = () => {
    setIsModalVisible(true);
  };

  const { writeContract, isPending: isCreatingOrder, isSuccess, isError } = useWriteContract();

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      const tokenToSell = tokenList.find(t => t.address === values.tokenToSell);
      const tokenToBuy = tokenList.find(t => t.address === values.tokenToBuy);
      
      if (!tokenToSell || !tokenToBuy) {
        message.error(t('orders.invalidToken'));
        return;
      }

      const amountToSell = BigInt(Math.floor(Number(values.amountToSell) * Math.pow(10, tokenToSell.decimals)));
      const amountToBuy = BigInt(Math.floor(Number(values.amountToBuy) * Math.pow(10, tokenToBuy.decimals)));
      console.log("marketContractAddress", MARKET_CONTRACT_ADDRESS_LOCAL)
      console.log("args", values.tokenToSell, values.tokenToBuy, amountToSell, amountToBuy)
      writeContract({
        address: MARKET_CONTRACT_ADDRESS_LOCAL,
        abi: marketAbi,
        functionName: 'createOrder',
        args: [
          values.tokenToSell,
          values.tokenToBuy,
          amountToSell,
          amountToBuy,
        ],
      });
    } catch (error) {
      console.error('创建订单失败:', error);
      message.error(t('orders.createError'));
    }
  };

  useEffect(() => {
    const shouldShowMessage = isSuccess || isError;
    if (shouldShowMessage) {
      if (isSuccess) {
        message.success(t('orders.createSuccess'));
        setIsModalVisible(false);
        form.resetFields();
        setSelectedTokenBalance('0');
      }
      if (isError) {
        message.error(t('orders.createError'));
      }
      refetchAllOrders();
    }
  }, [isSuccess, isError, form, t, refetchAllOrders]);

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setSelectedTokenBalance('0');
    setBuyBalance('0');
    setSellToken(undefined);
    setBuyToken(undefined);
    setSellAmount('');
    setBuyAmount('');
  };

  const handleTokenSelect = (tokenAddress: string) => {
    if (!address) {
      setSelectedTokenAddress('');
      setSelectedTokenBalance('0');
      return;
    }
    setLoadingBalance(true);
    setSelectedTokenAddress(tokenAddress);
  };

  const { data: nativeBalance } = useBalance({
    address: address as `0x${string}`,
    query: {
      enabled: !!address && selectedTokenAddress === '0x0000000000000000000000000000000000000000',
    },
  });

  const { data: tokenBalance, isLoading: isBalanceLoading } = useReadContract({
    address: selectedTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: {
      enabled: !!selectedTokenAddress && !!address && selectedTokenAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  useEffect(() => {
   
    if (selectedTokenAddress === '0x0000000000000000000000000000000000000000' && nativeBalance) {
      setSelectedTokenBalance(nativeBalance.formatted);
      setLoadingBalance(false);
    } else if ( selectedTokenAddress) {
      const token = tokenList.find(t => t.address === selectedTokenAddress);
      if (token) {
        const formattedBalance = (Number(tokenBalance) / Math.pow(10, token.decimals)).toFixed(4);
        setSelectedTokenBalance(formattedBalance);
      }
      setLoadingBalance(false);
    }
  }, [tokenBalance, nativeBalance,isBalanceLoading, selectedTokenAddress]);

  const { writeContract: writeEscrowContract, isPending: isRespondingOrder, isSuccess: isRespondSuccess, isError: isRespondError } = useWriteContract();

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
      message.error(t('orders.respondError'));
    }
  };

  useEffect(() => {
    if (isRespondSuccess) {
      message.success(t('orders.respondSuccess'));
      if (ordersData) {
        setOrders(ordersData as Order[]);
      }
    }
    if (isRespondError) {
      message.error(t('orders.respondError'));
    }
  }, [isRespondSuccess, isRespondError, ordersData, t]);

  // 修改后的价格获取逻辑
  useEffect(() => {
    async function fetchPrices() {
      if (!isModalVisible) return;
      
      try {
        console.log('开始获取价格...');
        
        // 确保打印每个代币ID用于调试
        console.log('代币ID映射:', MAINNET_ID_MAP);
        
        const ids = [
          MAINNET_ID_MAP.ETH,
          MAINNET_ID_MAP.TUSDT,
          MAINNET_ID_MAP.TUNI,
          MAINNET_ID_MAP.TLINK,
          MAINNET_ID_MAP.TWETH,
        ].join(',');
        
        console.log(`API请求: /api/prices?tokens=${ids}`);
        console.log('请求的代币IDs:', {
          ETH: MAINNET_ID_MAP.ETH,
          TUSDT: MAINNET_ID_MAP.TUSDT,
          TUNI: MAINNET_ID_MAP.TUNI,
          TLINK: MAINNET_ID_MAP.TLINK,
          TWETH: MAINNET_ID_MAP.TWETH
        });
        
        const res = await fetch(`/api/prices?tokens=${ids}`);
        
        if (!res.ok) {
          throw new Error(`API请求失败: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('获取到价格数据:', data);
        setPrices(data);
      } catch (error) {
        console.error('获取价格失败:', error);
        // 使用模拟价格，确保每个代币都有价格
        const mockPrices = {
          ethereum: { usd: 3000 },
          tether: { usd: 1 },     // TUSDT
          uniswap: { usd: 5 },    // TUNI
          chainlink: { usd: 15 },  // TLINK
          weth: { usd: 3000 }      // TWETH
        };
        console.log('使用模拟价格:', mockPrices);
        setPrices(mockPrices);
      }
    }
    
    fetchPrices();
  }, [isModalVisible]);

  // 改进自动计算买入数量逻辑
  useEffect(() => {
    console.log('计算买入数量：', {
      sellToken: sellToken?.symbol, 
      buyToken: buyToken?.symbol, 
      sellAmount,
      prices: prices ? Object.keys(prices) : '无价格数据'
    });
    
    if (sellToken && buyToken && sellAmount && prices) {
      const sellSymbol = sellToken.symbol;
      const buySymbol = buyToken.symbol;
      
      const sellId = getMainnetId(sellSymbol);
      const buyId = getMainnetId(buySymbol);
      
      console.log(`查找价格: ${sellSymbol} -> ${sellId}`);
      console.log(`查找价格: ${buySymbol} -> ${buyId}`);
      
      const sellPrice = prices[sellId]?.usd;
      const buyPrice = prices[buyId]?.usd;
      
      console.log('价格数据:', { sellPrice, buyPrice });
      
      if (sellPrice && buyPrice) {
        const calcBuyAmount = ((Number(sellAmount) * sellPrice) / buyPrice).toFixed(6);
        console.log(`计算结果: ${sellAmount} ${sellSymbol} = ${calcBuyAmount} ${buySymbol}`);
        
        setBuyAmount(calcBuyAmount);
        setTimeout(() => {
          form.setFieldValue('amountToBuy', calcBuyAmount);
        }, 0);
      } else {
        console.warn('价格数据不完整，无法计算');
        setBuyAmount('');
        setTimeout(() => {
          form.setFieldValue('amountToBuy', '');
        }, 0);
      }
    }
  }, [sellToken, buyToken, sellAmount, prices, form]);

  // 改进买入代币余额获取逻辑
  useEffect(() => {
    if (!buyToken || !address) return;
    
    console.log(`获取买入代币余额: ${buyToken.symbol}(${buyToken.address})`);
    
    const getBuyBalance = async () => {
      try {
        if (buyToken.address === '0x0000000000000000000000000000000000000000') {
          // ETH余额
          setBuyBalance(nativeBalance?.formatted || '0');
          console.log(`ETH余额: ${nativeBalance?.formatted || '0'}`);
        } else {
          // 使用已有的tokenBalance数据，但要确保是当前选择的代币
          const provider = new ethers.JsonRpcProvider(
            process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'
          );
          const tokenContract = new ethers.Contract(buyToken.address, ERC20_ABI, provider);
          
          // 直接查询余额
          const balance = await tokenContract.balanceOf(address);
          console.log(`原始余额: ${balance}`);
          
          // 格式化余额
          const formattedBalance = formatUnits(balance, buyToken.decimals);
          console.log(`格式化余额: ${formattedBalance} ${buyToken.symbol}`);
          
          setBuyBalance(formattedBalance);
        }
      } catch (error) {
        console.error('获取买入代币余额失败:', error);
        setBuyBalance('0');
      }
    };
    
    getBuyBalance();
  }, [buyToken, address, nativeBalance]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 添加全局样式 */}
      <style jsx global>{globalStyles}</style>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div className="flex justify-between items-center mb-6">
              <Title level={4}>{t('orders.myOrders')}</Title>
              <Button type="primary" onClick={handleCreateOrder}>
                {t('orders.create')}
              </Button>
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

      <Modal
        title={t('orders.createOrder')}
        open={isModalVisible}
        onOk={handleModalOk}
        confirmLoading={isCreatingOrder}
        onCancel={handleModalCancel}
      >
        {sellToken && buyToken && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-gray-500 text-sm">{t('orders.exchangeRate')}:</span>
              </div>
              <div className="font-medium">
                {prices[getMainnetId(sellToken.symbol)]?.usd && prices[getMainnetId(buyToken.symbol)]?.usd ? (
                  <>
                    <span>1 {sellToken.symbol} = {((prices[getMainnetId(sellToken.symbol)].usd / prices[getMainnetId(buyToken.symbol)].usd)).toFixed(6)} {buyToken.symbol}</span>
                    <div className="text-xs text-gray-500">
                      (1 {sellToken.symbol} ≈ ${prices[getMainnetId(sellToken.symbol)].usd.toFixed(2)} USD)
                    </div>
                  </>
                ) : (
                  <span className="text-gray-400">加载价格中...</span>
                )}
              </div>
            </div>
          </div>
        )}
        
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="tokenToSell"
            label={t('orders.tokenToSell')}
            rules={[{ required: true, message: t('orders.tokenToSellRequired') }]}
          >
            <Select
              onChange={val => {
                const token = tokenList.find(t => t.address === val);
                setSellToken(token);
                handleTokenSelect(val);
              }}
              optionLabelProp="label"
              className="token-select"
            >
              {tokenList.map(token => (
                <Option 
                  key={token.address} 
                  value={token.address}
                  label={
                    <div className="token-option">
                      <Image 
                        src={token.icon} 
                        alt={token.symbol} 
                        width={20} 
                        height={20} 
                        preview={false}
                        className="token-icon"
                      />
                      <span style={{ marginLeft: '8px' }}>{token.symbol}</span>
                    </div>
                  }
                >
                  <div className="flex items-center gap-2">
                    <Image 
                      src={token.icon} 
                      alt={token.symbol} 
                      width={20} 
                      height={20} 
                      preview={false}
                    />
                    <span>{token.symbol}</span>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <div className="mb-4">
            <Statistic
              title={t('orders.balance')}
              value={selectedTokenBalance}
              loading={loadingBalance}
              precision={4}
              prefix={sellToken?.symbol}
            />
          </div>
          <Form.Item
            name="tokenToBuy"
            label={t('orders.tokenToBuy')}
            rules={[{ required: true, message: t('orders.tokenToBuyRequired') }]}
          >
            <Select
              onChange={val => {
                const token = tokenList.find(t => t.address === val);
                setBuyToken(token);
              }}
              optionLabelProp="label"
              className="token-select"
            >
              {tokenList.map(token => (
                <Option 
                  key={token.address} 
                  value={token.address}
                  label={
                    <div className="token-option">
                      <Image 
                        src={token.icon} 
                        alt={token.symbol} 
                        width={20} 
                        height={20} 
                        preview={false}
                        className="token-icon"
                      />
                      <span style={{ marginLeft: '8px' }}>{token.symbol}</span>
                    </div>
                  }
                >
                  <div className="flex items-center gap-2">
                    <Image 
                      src={token.icon} 
                      alt={token.symbol} 
                      width={20} 
                      height={20} 
                      preview={false}
                    />
                    <span>{token.symbol}</span>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <div className="mb-4">
            <Statistic
              title={t('orders.balance')}
              value={buyBalance}
              precision={4}
              prefix={buyToken?.symbol}
            />
          </div>
          <Form.Item
            name="amountToSell"
            label={t('orders.amountToSell')}
            rules={[
              { required: true, message: t('orders.amountToSellRequired') },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const numValue = Number(value);
                  const balance = Number(selectedTokenBalance);
                  if (numValue > balance) {
                    return Promise.reject(new Error(t('orders.insufficientBalance')));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Input 
              type="number" 
              min={0} 
              onChange={e => {
                // 只更新一次状态，避免多重渲染
                setSellAmount(e.target.value);
              }} 
            />
          </Form.Item>
          <Form.Item
            name="amountToBuy"
            label={t('orders.amountToBuy')}
          >
            <Input type="number" min={0} value={buyAmount} disabled />
          </Form.Item>
        </Form>
        
        {sellToken && buyToken && sellAmount && buyAmount && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <div className="text-xs text-gray-500 flex justify-between">
              <span>{t('orders.priceImpact')}:</span>
              <span className="text-green-500">~0.05%</span>
            </div>
            <div className="text-xs text-gray-500 flex justify-between mt-1">
              <span>{t('orders.minimumReceived')}:</span>
              <span>{(Number(buyAmount) * 0.995).toFixed(6)} {buyToken?.symbol}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}