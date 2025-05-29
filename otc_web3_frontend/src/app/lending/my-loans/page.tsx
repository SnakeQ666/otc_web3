"use client";

import { useState, useEffect } from "react";
import { Card, Table, Button, Tag, message, Spin } from "antd";
import { useReadContract, useWriteContract, useContractReads } from "wagmi";
import { LENDING_POOL_ABI } from "@/contractAbis/lendingPollAbi";
import { LENDING_POOL_ADDRESS_LOCAL } from "@/config/contracts";
import { token as tokenList } from '@/config/tokenList';
import { formatUnits } from "viem";
import { useAccount } from "wagmi";

interface Loan {
  loanId: bigint;
  borrower: string;
  collateralToken: string;
  borrowToken: string;
  collateralAmount: bigint;
  borrowAmount: bigint;
  interestRate: bigint;
  startTime: bigint;
  dueTime: bigint;
  isActive: boolean;
  isLiquidated: boolean;
}

interface LoanData {
  borrower: string;
  collateralToken: string;
  borrowToken: string;
  collateralAmount: bigint;
  borrowAmount: bigint;
  interestRate: bigint;
  startTime: bigint;
  dueTime: bigint;
  isActive: boolean;
  isLiquidated: boolean;
}

export default function MyLoansPage() {
  const { address } = useAccount();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  // Get user loans
  const { data: userLoans } = useReadContract({
    address: LENDING_POOL_ADDRESS_LOCAL,
    abi: LENDING_POOL_ABI,
    functionName: "getUserLoans",
    args: [address],
  }) as { data: bigint[] | undefined };

  const { data: loanDetails, isLoading: isLoadingLoanDetails ,refetch: refetchLoanDetails} = useContractReads({
    contracts: (userLoans as bigint[] ?? []).map((loanId: bigint) => ({
      address: LENDING_POOL_ADDRESS_LOCAL,
      abi: LENDING_POOL_ABI,
      functionName: 'loans',
      args: [loanId],
    })),
  });

  // Repay loan
  const { writeContract: repayLoan, isPending: isRepaying,isSuccess: isRepaySuccess } = useWriteContract();

  const handleRepay = async (loanId: string) => {
    try {
      repayLoan({
        address: LENDING_POOL_ADDRESS_LOCAL,
        abi: LENDING_POOL_ABI,
        functionName: "repayLoan",
        args: [BigInt(loanId)],
      });
    } catch (error) {
      console.error("Failed to repay loan:", error);
      message.error("Failed to repay loan");
    }
  };
  useEffect(() => {
    if (isRepaySuccess) {
      message.success('Repay loan success');
      refetchLoanDetails();
    }
  }, [isRepaySuccess]);

  // Get loan details
  useEffect(() => {
    if (loanDetails && userLoans && Array.isArray(loanDetails) && Array.isArray(userLoans)) {
      setLoans(
        loanDetails
          .map((loan: any, idx: number) => {
            const result = loan.result;
            if (!result) return null;
            return {
              loanId: userLoans[idx],
              borrower: result[0],
              collateralToken: result[1],
              borrowToken: result[2],
              collateralAmount: result[3],
              borrowAmount: result[4],
              interestRate: result[5],
              startTime: result[6],
              dueTime: result[7],
              isActive: result[8],
              isLiquidated: result[9],
            } as Loan;
          })
          .filter((loan): loan is Loan => loan !== null)
      );
      setLoading(false);
    }
  }, [loanDetails, userLoans]);

  // Format date
  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  // Get status tag
  const getStatusTag = (loan: Loan) => {
    if (loan.isLiquidated) return <Tag color="red">Liquidated</Tag>;
    if (!loan.isActive) return <Tag color="green">Repaid</Tag>;
    if (Date.now() > Number(loan.dueTime) * 1000) return <Tag color="orange">Overdue</Tag>;
    return <Tag color="blue">Active</Tag>;
  };

  const columns = [
    {
      title: "Loan ID",
      dataIndex: "loanId",
      key: "loanId",
    },
    {
      title: "Collateral Token",
      dataIndex: "collateralToken",
      key: "collateralToken",
      render: (address: string, record: Loan) => {
        const token = tokenList.find(t => t.address === address);
        if (!token) {
          return <span>Unknown Token</span>;
        }
        return (
          <div className="flex items-center">
            <img src={token.icon} alt={token.symbol} className="w-6 h-6 mr-2" />
            <span>{formatUnits(record.collateralAmount, token.decimals)} {token.symbol}</span>
          </div>
        );
      }
    },
    {
      title: "Borrow Token",
      dataIndex: "borrowToken",
      key: "borrowToken",
      render: (address: string, record: Loan) => {
        const token = tokenList.find(t => t.address === address);
        if (!token) {
          return <span>Unknown Token</span>;
        }
        return (
          <div className="flex items-center">
            <img src={token.icon} alt={token.symbol} className="w-6 h-6 mr-2" />
            <span>{formatUnits(record.borrowAmount, token.decimals)} {token.symbol}</span>
          </div>
        );
      }
    },
    {
      title: "Interest Rate",
      dataIndex: "interestRate",
      key: "interestRate",
      render: (rate: bigint) => `${Number(rate) / 100}%`
    },
    {
      title: "Start Time",
      dataIndex: "startTime",
      key: "startTime",
      render: (time: bigint) => formatDate(time)
    },
    {
      title: "Due Time",
      dataIndex: "dueTime",
      key: "dueTime",
      render: (time: bigint) => formatDate(time)
    },
    {
      title: "Status",
      key: "status",
      render: (_: any, record: Loan) => getStatusTag(record)
    },
    {
      title: "Action",
      key: "action",
      render: (_: any, record: Loan) => (
        record.isActive && !record.isLiquidated && (
          <Button
            type="primary"
            onClick={() => handleRepay(record.loanId.toString())}
            loading={isRepaying}
          >
            Repay
          </Button>
        )
      )
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <Card title="My Loans" className="mb-8">
        {loading ? (
          <div className="flex justify-center p-8">
            <Spin size="large" />
          </div>
        ) : (
          <Table
            dataSource={loans}
            columns={columns}
            rowKey="loanId"
            locale={{ emptyText: "No loan records" }}
          />
        )}
      </Card>
    </div>
  );
} 