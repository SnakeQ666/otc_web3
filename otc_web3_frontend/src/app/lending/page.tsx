"use client";

import { useState, useEffect } from "react";
import { Card, Table, Button, Input, Select, message, Spin, Tag, Tooltip } from "antd";
import { useReadContract, useWriteContract, useAccount, useBalance } from "wagmi";
import { LENDING_POOL_ABI } from "@/contractAbis/lendingPollAbi";
import { LENDING_POOL_ADDRESS_LOCAL } from "@/config/contracts";
import { token as tokenList } from '@/config/tokenList';
import { formatUnits, parseUnits } from "viem";
import { testTokenAbi } from "@/contractAbis/testTokenAbi";
import { ERC20_ABI } from "@/contractAbis/erc20Abi";
const { Option } = Select;

export default function LendingPage() {
  const [selectedCollateralToken, setSelectedCollateralToken] = useState<string>("");
  const [selectedBorrowToken, setSelectedBorrowToken] = useState<string>("");
  const [collateralAmount, setCollateralAmount] = useState<string>("");
  const [borrowAmount, setBorrowAmount] = useState<string>("");
  const [duration, setDuration] = useState<number>(30); // Default 30 days
  const [loading, setLoading] = useState(false);

  const { address } = useAccount();

  // 获取ETH原生代币余额
  const { data: nativeBalance } = useBalance({
    address: address as `0x${string}`,
    query: {
      enabled: !!address && (!selectedCollateralToken || selectedCollateralToken === '0x0000000000000000000000000000000000000000'),
    }
  });

  // 获取ERC20代币余额
  const { data: tokenBalance, isLoading: isBalanceLoading } = useReadContract({
    address: selectedCollateralToken as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: {
      enabled: !!selectedCollateralToken && !!address && selectedCollateralToken !== '0x0000000000000000000000000000000000000000',
    }
  });

  const collateralToken = tokenList.find(t => t.address === selectedCollateralToken);
  // 校验输入数量是否超出余额
  const userBalance = !selectedCollateralToken || selectedCollateralToken === '0x0000000000000000000000000000000000000000'
    ? (nativeBalance ? Number(nativeBalance.formatted) : 0)
    : (tokenBalance ? Number(formatUnits(tokenBalance as bigint, collateralToken?.decimals || 18)) : 0);
  
  console.log('当前余额信息:', {
    selectedCollateralToken,
    nativeBalance: nativeBalance?.formatted,
    tokenBalance,
    userBalance
  });

  const inputAmount = collateralAmount ? Number(collateralAmount) : 0;
  const isExceedBalance = inputAmount > userBalance;

  // Get token configs
  const { data: tokenConfigs, isLoading: isTokenConfigsLoading } = useReadContract({
    address: LENDING_POOL_ADDRESS_LOCAL,
    abi: LENDING_POOL_ABI,
    functionName: "tokenConfigs",
    args: [selectedCollateralToken || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!selectedCollateralToken || selectedCollateralToken === '0x0000000000000000000000000000000000000000',
    }
  });

  console.log('tokenConfigs:', {
    selectedCollateralToken,
    tokenConfigs,
    isConfigured: tokenConfigs?.[0]
  });

  // 检查代币是否已配置
  const isTokenConfigured = tokenConfigs && Array.isArray(tokenConfigs) && tokenConfigs[0] === true;

  // Create loan
  const { writeContract: createLoan, isPending: isCreatingLoan,isSuccess: isCreateLoanSuccess } = useWriteContract();

  // 获取授权额度
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: collateralToken?.address as `0x${string}` | undefined,
    abi: testTokenAbi,
    functionName: 'allowance',
    args: [address, LENDING_POOL_ADDRESS_LOCAL],
    enabled: !!collateralToken && !!address,
    watch: true,
  });
  const allowance = allowanceData ? Number(formatUnits(allowanceData, collateralToken?.decimals || 18)) : 0;
  const needApprove = inputAmount > 0 && allowance < inputAmount;

  // Approve操作
  const { writeContract: approveToken, isPending: isApproving ,isSuccess: isApproveSuccess} = useWriteContract();
  const handleApprove = async () => {
    console.log("collateralToken", collateralToken);
    if (!collateralToken) return;
    try {
      approveToken({
        address: collateralToken.address as `0x${string}`,
        abi:testTokenAbi,
        functionName: 'approve',
        args: [LENDING_POOL_ADDRESS_LOCAL, parseUnits('1000000000', collateralToken.decimals)], // 授权大额度
      });
    } catch (e) {
      message.error('Approve failed');
    }
  };
  useEffect(() => {
    if (isApproveSuccess) {
      message.success('Approve success');
      refetchAllowance()
    }
  }, [isApproveSuccess]);
  useEffect(() => {
    if (isCreateLoanSuccess) {
      message.success('Create loan success');
    }
  }, [isCreateLoanSuccess]);
  const handleCreateLoan = async () => {
    if (!selectedCollateralToken || !selectedBorrowToken || !collateralAmount || !borrowAmount) {
      message.error("Please fill in all loan information");
      return;
    }

    try {
      const borrowToken = tokenList.find(t => t.address === selectedBorrowToken);

      if (!collateralToken || !borrowToken) {
        message.error("Token configuration error");
        return;
      }
      console.log("collateralTokenDecimals",collateralToken.decimals)
      console.log("borrowTokenDecimals",borrowToken.decimals)
      console.log("allParams",selectedCollateralToken,selectedBorrowToken, parseUnits(collateralAmount, collateralToken.decimals),parseUnits(borrowAmount, borrowToken.decimals),BigInt(duration * 24 * 60 * 60))
      createLoan({
        address: LENDING_POOL_ADDRESS_LOCAL,
        abi: LENDING_POOL_ABI,
        functionName: "createLoan",
        args: [
          selectedCollateralToken,
          selectedBorrowToken,
          parseUnits(collateralAmount, collateralToken.decimals),
          parseUnits(borrowAmount, borrowToken.decimals),
          BigInt(duration * 24 * 60 * 60) // Convert to seconds
        ],
      });
    } catch (error) {
      console.log("Failed to create loan:", error);
      message.error("Failed to create loan");
    }
  };

  // 获取代币配置信息的展示值
  const getCollateralRatio = () => {
    if (!isTokenConfigured) return "Not Configured";
    try {
      // tokenConfigs[1] 是抵押率，单位是基点
      return (Number(tokenConfigs[1]) / 100).toFixed(2);
    } catch (error) {
      console.error('获取抵押率错误:', error);
      return "0.00";
    }
  };

  const getAnnualInterestRate = () => {
    if (!isTokenConfigured) return "Not Configured";
    try {
      // tokenConfigs[2] 是年化利率，单位是基点
      return (Number(tokenConfigs[2]) / 100).toFixed(2);
    } catch (error) {
      console.error('获取年化利率错误:', error);
      return "0.00";
    }
  };

  // 计算最大可借金额
  const calculateMaxBorrow = () => {
    if (!isTokenConfigured || !collateralAmount || !selectedCollateralToken) return "0";
    
    const collateralToken = tokenList.find(t => t.address === selectedCollateralToken);
    if (!collateralToken) return "0";

    try {
      const collateralValue = parseUnits(collateralAmount, collateralToken.decimals);
      // tokenConfigs[1] 是抵押率，需要除以10000转换为小数
      const maxBorrow = (collateralValue * BigInt(tokenConfigs[1])) / BigInt(10000);
      return formatUnits(maxBorrow, collateralToken.decimals);
    } catch (error) {
      console.error('计算最大可借金额错误:', error);
      return "0";
    }
  };

  // 计算预估利息
  const calculateEstimatedInterest = () => {
    if (!isTokenConfigured || !borrowAmount) return "0";
    try {
      // tokenConfigs[2] 是年化利率，单位是基点，需要除以10000转换为小数
      return (Number(borrowAmount) * Number(tokenConfigs[2]) / 10000 * duration / 365).toFixed(6);
    } catch (error) {
      console.error('计算预估利息错误:', error);
      return "0";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card title="Lending Market" className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Collateral Token Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Collateral Token</h3>
            <Select
              className="w-full mb-4"
              placeholder="Select collateral token"
              value={selectedCollateralToken}
              onChange={setSelectedCollateralToken}
            >
              {tokenList.map((token) => (
                <Option key={token.address} value={token.address}>
                  <div className="flex items-center">
                    <img src={token.icon} alt={token.symbol} className="w-6 h-6 mr-2" />
                    <span>{token.symbol}</span>
                  </div>
                </Option>
              ))}
            </Select>
            <Input
              placeholder="Enter collateral amount"
              value={collateralAmount}
              onChange={(e) => setCollateralAmount(e.target.value)}
              type="number"
              min="0"
              max={userBalance}
              status={isExceedBalance ? "error" : undefined}
            />
            <div className="text-sm text-gray-500 mt-1">
              Balance: {isBalanceLoading ? 'Loading...' : `${userBalance} ${collateralToken?.symbol || ''}`}
            </div>
            {isExceedBalance && (
              <div className="text-xs text-red-500 mt-1">Amount exceeds your balance</div>
            )}
          </div>

          {/* Borrow Token Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Borrow Token</h3>
            <Select
              className="w-full mb-4"
              placeholder="Select borrow token"
              value={selectedBorrowToken}
              onChange={setSelectedBorrowToken}
            >
              {tokenList.map((token) => (
                <Option key={token.address} value={token.address}>
                  <div className="flex items-center">
                    <img src={token.icon} alt={token.symbol} className="w-6 h-6 mr-2" />
                    <span>{token.symbol}</span>
                  </div>
                </Option>
              ))}
            </Select>
            <Input
              placeholder="Enter borrow amount"
              value={borrowAmount}
              onChange={(e) => setBorrowAmount(e.target.value)}
              type="number"
              min="0"
            />
          </div>
        </div>

        {/* Loan Duration */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Loan Duration</h3>
          <Select
            className="w-full"
            value={duration}
            onChange={setDuration}
          >
            <Option value={7}>7 days</Option>
            <Option value={30}>30 days</Option>
            <Option value={90}>90 days</Option>
            <Option value={180}>180 days</Option>
            <Option value={365}>365 days</Option>
          </Select>
        </div>

        {/* Loan Information */}
        {selectedCollateralToken && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Loan Information</h3>
            {!isTokenConfigured ? (
              <div className="text-center p-4">
                <p className="text-orange-600 text-sm">
                  This token is not configured in the lending pool yet, unable to perform lending operations
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Please contact administrator to configure token parameters
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p>Collateral Ratio: {getCollateralRatio()}%</p>
                  <p>Annual Interest Rate: {getAnnualInterestRate()}%</p>
                </div>
                <div>
                  <p>Maximum Borrow Amount: {calculateMaxBorrow()} {tokenList.find(t => t.address === selectedBorrowToken)?.symbol}</p>
                  <p>Estimated Interest: {calculateEstimatedInterest()} {tokenList.find(t => t.address === selectedBorrowToken)?.symbol}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Approve 或 Create Loan 按钮 */}
        <div className="mt-6">
          {needApprove ? (
            <Button
              type="primary"
              size="large"
              className="w-full"
              onClick={handleApprove}
              loading={isApproving}
              disabled={!collateralToken || !inputAmount || !isTokenConfigured}
            >
              Approve {collateralToken?.symbol}
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              className="w-full"
              onClick={handleCreateLoan}
              loading={isCreatingLoan}
              disabled={isExceedBalance || !collateralAmount || !selectedCollateralToken || !selectedBorrowToken || !borrowAmount || !isTokenConfigured}
            >
              {!isTokenConfigured ? "Token Not Configured" : "Create Loan"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
} 