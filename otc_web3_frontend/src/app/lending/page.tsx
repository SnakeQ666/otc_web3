"use client";

import { useState, useEffect } from "react";
import { Card, Button, Input, Select, message, Spin, Tag, Tooltip, Typography } from "antd";
import { useReadContract, useWriteContract, useAccount, useBalance } from "wagmi";
import { LENDING_POOL_ABI } from "@/contractAbis/lendingPollAbi";
import { LENDING_POOL_ADDRESS_LOCAL } from "@/config/contracts";
import { token as tokenListFromFile } from '@/config/tokenList';
import { formatUnits, parseUnits, Abi } from "viem";
import { testTokenAbi } from "@/contractAbis/testTokenAbi";
import { ERC20_ABI } from "@/contractAbis/erc20Abi";

const { Option } = Select;
const { Text } = Typography;

interface TokenInfo {
  name: string;
  symbol: string;
  address: `0x${string}` | string;
  decimals: number;
  icon: string;
}

const tokenList: TokenInfo[] = tokenListFromFile as TokenInfo[];

const COINGECKO_ID_MAP: Record<string, string> = {
  ETH: 'ethereum',
  TUSDT: 'tether',
  TUNI: 'uniswap',
  TLINK: 'chainlink',
  TWETH: 'weth',
};

function getTokenIdForPriceApi(symbol?: string): string {
  if (!symbol) return '';
  return COINGECKO_ID_MAP[symbol] || symbol.toLowerCase();
}

export default function LendingPage() {
  const [selectedCollateralToken, setSelectedCollateralToken] = useState<string>("");
  const [selectedBorrowToken, setSelectedBorrowToken] = useState<string>("");
  const [collateralAmount, setCollateralAmount] = useState<string>("");
  const [borrowAmount, setBorrowAmount] = useState<string>("");
  const [calculatedMaxBorrowAmount, setCalculatedMaxBorrowAmount] = useState<string>("0");
  const [duration, setDuration] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [collateralTokenPrice, setCollateralTokenPrice] = useState<number | null>(null);
  const [borrowTokenPrice, setBorrowTokenPrice] = useState<number | null>(null);
  const [pricesLoading, setPricesLoading] = useState<boolean>(false);

  const { address } = useAccount();

  const collateralTokenInfo = tokenList.find(t => t.address === selectedCollateralToken);
  const borrowTokenInfo = tokenList.find(t => t.address === selectedBorrowToken);

  const { data: nativeBalance } = useBalance({
    address: address,
  });

  const { data: collateralTokenBalanceData, isLoading: isCollateralBalanceLoading } = useReadContract({
    address: collateralTokenInfo?.address as `0x${string}`,
    abi: ERC20_ABI as Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const userCollateralBalance = selectedCollateralToken === '0x0000000000000000000000000000000000000000'
    ? (nativeBalance ? Number(nativeBalance.formatted) : 0)
    : (collateralTokenBalanceData && collateralTokenInfo ? Number(formatUnits(collateralTokenBalanceData as bigint, collateralTokenInfo.decimals)) : 0);
  
  const inputCollateralAmount = collateralAmount ? Number(collateralAmount) : 0;
  const isExceedCollateralBalance = inputCollateralAmount > userCollateralBalance;

  const { data: collateralTokenConfigDataRaw, isLoading: isCollateralTokenConfigLoading } = useReadContract({
    address: LENDING_POOL_ADDRESS_LOCAL,
    abi: LENDING_POOL_ABI as Abi,
    functionName: "tokenConfigs",
    args: [selectedCollateralToken || "0x0000000000000000000000000000000000000000"],
  });

  const collateralTokenConfigData = collateralTokenConfigDataRaw as readonly [boolean, bigint, bigint, bigint] | undefined;

  const isCollateralTokenConfigured = collateralTokenConfigData && collateralTokenConfigData[0] === true;
  const collateralRatioFromContract = isCollateralTokenConfigured ? Number(collateralTokenConfigData[1]) : 0;
  const annualInterestRateFromContract = isCollateralTokenConfigured ? Number(collateralTokenConfigData[2]) : 0;

  const { data: borrowTokenConfigDataResponse, isLoading: isBorrowTokenConfigLoading } = useReadContract({
    address: LENDING_POOL_ADDRESS_LOCAL,
    abi: LENDING_POOL_ABI as Abi,
    functionName: "tokenConfigs",
    args: [selectedBorrowToken || "0x0000000000000000000000000000000000000000"],
  });

  const borrowTokenConfigData = borrowTokenConfigDataResponse as readonly [boolean, bigint, bigint, bigint] | undefined;

  const isBorrowTokenConfigured = borrowTokenConfigData && borrowTokenConfigData[0] === true;
  const maxBorrowLimitFromContractForBorrowToken = isBorrowTokenConfigured && borrowTokenInfo
    ? BigInt(borrowTokenConfigData[3]) 
    : BigInt(0);

  useEffect(() => {
    const fetchPrices = async () => {
      if (!collateralTokenInfo && !borrowTokenInfo) {
        setCollateralTokenPrice(null);
        setBorrowTokenPrice(null);
        return;
      }
      setPricesLoading(true);
      const tokensToFetchSymbols: string[] = [];
      if (collateralTokenInfo) tokensToFetchSymbols.push(getTokenIdForPriceApi(collateralTokenInfo.symbol));
      if (borrowTokenInfo) tokensToFetchSymbols.push(getTokenIdForPriceApi(borrowTokenInfo.symbol));
      
      const uniqueTokens = [...new Set(tokensToFetchSymbols.filter(t => t))];
      if (uniqueTokens.length === 0) {
        setCollateralTokenPrice(null); setBorrowTokenPrice(null); setPricesLoading(false); return;
      }
      try {
        const res = await fetch(`/api/prices?tokens=${uniqueTokens.join(',')}`);
        if (!res.ok) throw new Error(`Failed to fetch prices: ${res.statusText}`);
        const data = await res.json();
        setCollateralTokenPrice(collateralTokenInfo ? data[getTokenIdForPriceApi(collateralTokenInfo.symbol)]?.usd || null : null);
        setBorrowTokenPrice(borrowTokenInfo ? data[getTokenIdForPriceApi(borrowTokenInfo.symbol)]?.usd || null : null);
      } catch (error) {
        console.error("Error fetching prices:", error);
        message.error("Failed to fetch token prices.");
        setCollateralTokenPrice(null); setBorrowTokenPrice(null);
      } finally {
        setPricesLoading(false);
      }
    };
    if ((selectedCollateralToken && collateralTokenInfo) || (selectedBorrowToken && borrowTokenInfo)) {
        fetchPrices();
    } else {
        setCollateralTokenPrice(null);
        setBorrowTokenPrice(null);
    }
  }, [selectedCollateralToken, selectedBorrowToken, collateralTokenInfo, borrowTokenInfo]);

  useEffect(() => {
    if (
      collateralTokenInfo &&
      borrowTokenInfo &&
      collateralAmount &&
      collateralTokenPrice !== null &&
      borrowTokenPrice !== null &&
      isCollateralTokenConfigured &&
      isBorrowTokenConfigured && 
      collateralRatioFromContract > 0 &&
      borrowTokenPrice > 0 
    ) {
      const numericCollateralAmount = parseFloat(collateralAmount);
      if (isNaN(numericCollateralAmount) || numericCollateralAmount <= 0) {
        setCalculatedMaxBorrowAmount("0");
        return;
      }

      const collateralValueUSD = numericCollateralAmount * collateralTokenPrice;
      const maxBorrowableValueUSD = collateralValueUSD * (collateralRatioFromContract / 10000);
      let theoreticalMaxBorrowTokens = maxBorrowableValueUSD / borrowTokenPrice;

      const contractMaxBorrowTokens = parseFloat(formatUnits(maxBorrowLimitFromContractForBorrowToken, borrowTokenInfo.decimals));
      
      const finalMaxBorrow = Math.min(theoreticalMaxBorrowTokens, contractMaxBorrowTokens);
      
      setCalculatedMaxBorrowAmount(finalMaxBorrow > 0 ? finalMaxBorrow.toFixed(borrowTokenInfo.decimals > 6 ? 6 : borrowTokenInfo.decimals) : "0");
    } else {
      setCalculatedMaxBorrowAmount("0");
    }
  }, [
    collateralAmount,
    collateralTokenPrice,
    borrowTokenPrice,
    collateralRatioFromContract,
    isCollateralTokenConfigured,
    isBorrowTokenConfigured,
    collateralTokenInfo,
    borrowTokenInfo,
    maxBorrowLimitFromContractForBorrowToken
  ]);

  const { writeContract: createLoan, isPending: isCreatingLoan, isSuccess: isCreateLoanSuccess } = useWriteContract();
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: collateralTokenInfo?.address as `0x${string}`,
    abi: ERC20_ABI as Abi,
    functionName: 'allowance',
    args: (address && LENDING_POOL_ADDRESS_LOCAL) ? [address, LENDING_POOL_ADDRESS_LOCAL] : undefined,
  });

  const currentAllowance = (allowanceData && typeof allowanceData === 'bigint') ? allowanceData : BigInt(0);
  const collateralAmountParsed = (collateralAmount && collateralTokenInfo) ? parseUnits(collateralAmount, collateralTokenInfo.decimals) : BigInt(0);
  const needApprove = collateralTokenInfo?.address !== '0x0000000000000000000000000000000000000000' && inputCollateralAmount > 0 && currentAllowance < collateralAmountParsed;

  const { writeContract: approveToken, isPending: isApproving, isSuccess: isApproveSuccess } = useWriteContract();
  
  const handleApprove = async () => {
    if (!collateralTokenInfo || collateralTokenInfo.address === '0x0000000000000000000000000000000000000000') return;
    setIsSubmitting(true);
    try {
      approveToken({
        address: collateralTokenInfo.address as `0x${string}`,
        abi: testTokenAbi as Abi,
        functionName: 'approve',
        args: [LENDING_POOL_ADDRESS_LOCAL, collateralAmountParsed],
      });
    } catch (e) {
      message.error('Approve failed');
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isApproveSuccess) {
      message.success('Approve success');
      refetchAllowance();
      setIsSubmitting(false);
    }
  }, [isApproveSuccess, refetchAllowance]);

  useEffect(() => {
    if (isCreateLoanSuccess) {
      message.success('Create loan success');
      setSelectedCollateralToken("");
      setSelectedBorrowToken("");
      setCollateralAmount("");
      setBorrowAmount("");
      setCalculatedMaxBorrowAmount("0");
      setIsSubmitting(false);
    }
  }, [isCreateLoanSuccess]);
  
  const handleCreateLoan = async () => {
    if (!selectedCollateralToken || !selectedBorrowToken || !collateralAmount || !borrowAmount) {
      message.error("Please fill in all loan information");
      return;
    }
    if (!collateralTokenInfo || !borrowTokenInfo) {
        message.error("Selected token information is missing.");
        return;
    }
    if (parseFloat(borrowAmount) <= 0) {
        message.error("Borrow amount must be greater than zero.");
        return;
    }
    if (parseFloat(borrowAmount) > parseFloat(calculatedMaxBorrowAmount)) {
        message.error("Borrow amount exceeds the maximum calculated allowed amount.");
        return;
    }
    if (isExceedCollateralBalance) {
        message.error("Collateral amount exceeds your balance.");
        return;
    }
    if (!isCollateralTokenConfigured || !isBorrowTokenConfigured) {
        message.error("One or both selected tokens are not configured for lending.");
        return;
    }

    setIsSubmitting(true);
    try {
      createLoan({
        address: LENDING_POOL_ADDRESS_LOCAL,
        abi: LENDING_POOL_ABI as Abi,
        functionName: "createLoan",
        args: [
          selectedCollateralToken,
          selectedBorrowToken,
          parseUnits(collateralAmount, collateralTokenInfo.decimals),
          parseUnits(borrowAmount, borrowTokenInfo.decimals),
          BigInt(duration * 24 * 60 * 60) 
        ],
      });
    } catch (error) {
      console.error("Failed to create loan:", error);
      message.error("Failed to create loan");
      setIsSubmitting(false);
    }
  };

  const getCollateralRatioDisplay = () => {
    if (!isCollateralTokenConfigured) return "N/A";
    return (collateralRatioFromContract / 100).toFixed(2) + "%";
  };

  const getAnnualInterestRateDisplay = () => {
    if (!isCollateralTokenConfigured && !isBorrowTokenConfigured) return "N/A";
    const rateToDisplay = isCollateralTokenConfigured ? annualInterestRateFromContract : (isBorrowTokenConfigured ? Number(borrowTokenConfigData![2]) : 0);
    return (rateToDisplay / 100).toFixed(2) + "%"; 
  };

  const estimatedInterest = () => {
    if (!borrowTokenInfo || !borrowAmount || parseFloat(borrowAmount) <= 0) return "0";
    const rateBasisPoints = isBorrowTokenConfigured ? Number(borrowTokenConfigData![2]) : annualInterestRateFromContract;
    if (rateBasisPoints <= 0) return "0";

    const dailyRate = (rateBasisPoints / 10000) / 365;
    const interest = parseFloat(borrowAmount) * dailyRate * duration;
    return interest.toFixed(borrowTokenInfo.decimals > 6 ? 6 : borrowTokenInfo.decimals);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card title="Lending Market" className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Collateral Token</h3>
              <Select
                className="w-full mb-2"
                placeholder="Select collateral token"
                value={selectedCollateralToken || undefined}
                onChange={setSelectedCollateralToken}
                allowClear
              >
                {tokenList.map((token) => (
                  <Option key={token.address} value={token.address as string}>
                    <div className="flex items-center">
                      <img src={token.icon} alt={token.symbol} className="w-6 h-6 mr-2" />
                      <span>{token.symbol} ({token.name})</span>
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
                status={isExceedCollateralBalance ? "error" : undefined}
                addonAfter={collateralTokenInfo?.symbol}
                disabled={!selectedCollateralToken}
              />
              <div className="text-sm text-gray-500 mt-1">
                Balance: {isCollateralBalanceLoading && selectedCollateralToken ? <Spin size="small" /> : `${userCollateralBalance.toFixed(4)} ${collateralTokenInfo?.symbol || ''}`}
              </div>
              {isExceedCollateralBalance && (
                <div className="text-xs text-red-500 mt-1">Amount exceeds your balance</div>
              )}
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Borrow Token</h3>
              <Select
                className="w-full mb-2"
                placeholder="Select borrow token"
                value={selectedBorrowToken || undefined}
                onChange={setSelectedBorrowToken}
                allowClear
                disabled={!selectedCollateralToken}
              >
                {tokenList.filter(t => t.address !== selectedCollateralToken).map((token) => (
                  <Option key={token.address} value={token.address as string}>
                    <div className="flex items-center">
                      <img src={token.icon} alt={token.symbol} className="w-6 h-6 mr-2" />
                      <span>{token.symbol} ({token.name})</span>
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
                addonAfter={borrowTokenInfo?.symbol}
                disabled={!selectedBorrowToken || pricesLoading || calculatedMaxBorrowAmount === "0"}
              />
              <div className="text-sm text-gray-500 mt-1">
                {pricesLoading ? <Spin size="small" /> : calculatedMaxBorrowAmount !== "0" && `Max: ${calculatedMaxBorrowAmount} ${borrowTokenInfo?.symbol || ''}`}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Loan Duration</h3>
              <Select
                className="w-full"
                value={duration}
                onChange={setDuration}
              >
                <Option value={7}>7 days</Option>
                <Option value={14}>14 days</Option>
                <Option value={30}>30 days</Option>
                <Option value={60}>60 days</Option>
                <Option value={90}>90 days</Option>
              </Select>
            </div>
          </div>

          <div>
            <Card type="inner" title="Loan Information">
              <div className="space-y-3">
                <div><Text type="secondary">Collateral Ratio:</Text> <Text strong>{getCollateralRatioDisplay()}</Text></div>
                <div><Text type="secondary">Annual Interest Rate:</Text> <Text strong>{getAnnualInterestRateDisplay()}</Text></div>
                {isBorrowTokenConfigured && borrowTokenInfo && (
                     <div><Text type="secondary">Contract Max Borrow ({borrowTokenInfo.symbol}):</Text> <Text strong>{formatUnits(maxBorrowLimitFromContractForBorrowToken, borrowTokenInfo.decimals)}</Text></div>
                )}
                <div><Text type="secondary">Estimated Interest:</Text> <Text strong>{estimatedInterest()} {borrowTokenInfo?.symbol || ''}</Text></div>
                <div className="mt-2 p-2 border rounded bg-gray-50">
                    <Text type="secondary">Calculated Max Borrowable ({borrowTokenInfo?.symbol || ''}): </Text> 
                    {pricesLoading ? <Spin size="small" /> : <Text strong className="text-blue-600">{calculatedMaxBorrowAmount}</Text>}
                </div>
              </div>
            </Card>

            <div className="mt-6">
              {needApprove ? (
                <Button 
                  type="primary" 
                  onClick={handleApprove} 
                  loading={isApproving || isSubmitting}
                  block
                  disabled={isApproving || isSubmitting || !collateralTokenInfo || inputCollateralAmount <= 0 || !isCollateralTokenConfigured}
                >
                  Approve {collateralTokenInfo?.symbol}
                </Button>
              ) : (
                <Button 
                  type="primary" 
                  onClick={handleCreateLoan} 
                  loading={isCreatingLoan || isSubmitting}
                  block 
                  disabled={isCreatingLoan || isSubmitting || !selectedCollateralToken || !selectedBorrowToken || !collateralAmount || !borrowAmount || parseFloat(borrowAmount) <=0 || parseFloat(borrowAmount) > parseFloat(calculatedMaxBorrowAmount) || isExceedCollateralBalance || !isCollateralTokenConfigured || !isBorrowTokenConfigured}
                >
                  Create Loan
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
} 