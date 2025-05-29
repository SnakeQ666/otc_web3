"use client";

import { useEffect, useState } from "react";
import { Card, Table, Button, Tag, message, Space, Spin, Tooltip } from "antd";
import { useReadContract, useWriteContract } from "wagmi";
import { escrowAbi } from "@/contractAbis/escrowAbi";
import { ESCROW_CONTRACT_ADDRESS_LOCAL } from "@/config/contracts";
import { token as tokenList } from '@/config/tokenList';

const ESCROW_STATUS = [
  "Created",
  "Locked",
  "Completed",
  "Refunded",
  "Disputed"
];

// Status colors mapping
const getStatusColor = (status: number) => {
  const statusColors: string[] = [
    'blue',    // Created
    'orange',  // Locked
    'green',   // Completed
    'red',     // Refunded
    'purple'   // Disputed
  ];
  return statusColors[status] || 'default';
};

export default function EscrowDisputePage() {
  const [escrows, setEscrows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);

  // Use wagmi's useReadContract to fetch all escrows directly from contract
  const { data: allEscrows, isLoading, isError, refetch } = useReadContract({
    address: ESCROW_CONTRACT_ADDRESS_LOCAL,
    abi: escrowAbi,
    functionName: 'getAllEscrows',
  });

  // Update escrows state when contract data is loaded or refreshFlag changes
  useEffect(() => {
    console.log("allEscrows", allEscrows)
    if (allEscrows && Array.isArray(allEscrows)) {
      setEscrows(allEscrows);
    }
  }, [allEscrows, refreshFlag]);

  // Monitor errors
  useEffect(() => {
    if (isError) {
      message.error("Failed to load escrow data. Please verify you're using an admin account.");
    }
  }, [isError]);

  // Refund contract operation
  const refundResult = useWriteContract();

  const handleRefund = async (orderId: string) => {
    console.log("orderId", orderId)
    try {
      refundResult.writeContract({
        address: ESCROW_CONTRACT_ADDRESS_LOCAL,
        abi: escrowAbi,
        functionName: "refundEscrow",
        args: [orderId],
      });
    } catch (e) {
      message.error("Refund operation failed");
    }
  };

  useEffect(() => {
    if (refundResult.isSuccess) {
      message.success("Refund successful");
      refetch(); // Refresh data after successful operation
    } else if (refundResult.isError) {
      message.error(refundResult.error?.message || "Refund operation failed");
    }
  }, [refundResult.isSuccess, refundResult.isError]);

  // Helper function to find token by address
  const getToken = (address: string) => {
    return tokenList.find(t => t.address === address);
  };

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp || Number(timestamp) === 0) return '-';
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function for address formatting
  const formatAddress = (address: string) => {
    if (!address || address === '0x0000000000000000000000000000000000000000') return '-';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const columns = [
    { 
      title: "Order ID", 
      dataIndex: "orderId", 
      key: "orderId",
      render: (id: bigint) => `#${id.toString()}`
    },
    { 
      title: "Maker", 
      dataIndex: "maker", 
      key: "maker",
      render: (address: string) => (
        <Tooltip title={address}>
          {formatAddress(address)}
        </Tooltip>
      )
    },
    { 
      title: "Taker", 
      dataIndex: "taker", 
      key: "taker",
      render: (address: string) => (
        <Tooltip title={address}>
          {formatAddress(address)}
        </Tooltip>
      )
    },
    {
      title: "Sell Token",
      dataIndex: "tokenToSell",
      key: "tokenToSell",
      render: (address: string, record: any) => {
        const token = getToken(address);
        const amount = record.amountToSell ? Number(record.amountToSell) / 10**(token?.decimals || 18) : 0;
        return (
          <div className="flex items-center">
            {token && token.icon && 
              <img src={token.icon} alt={token.symbol} 
                   style={{width: 20, height: 20, marginRight: 8}} />
            }
            <span>{amount.toFixed(6)} {token?.symbol || address.slice(0, 6)}</span>
          </div>
        );
      }
    },
    {
      title: "Buy Token",
      dataIndex: "tokenToBuy",
      key: "tokenToBuy",
      render: (address: string, record: any) => {
        const token = getToken(address);
        const amount = record.amountToBuy ? Number(record.amountToBuy) / 10**18 : 0;
        return (
          <div className="flex items-center">
            {token && token.icon && 
              <img src={token.icon} alt={token.symbol} 
                   style={{width: 20, height: 20, marginRight: 8}} />
            }
            <span>{amount.toFixed(6)} {token?.symbol || address.slice(0, 6)}</span>
          </div>
        );
      }
    },
    { 
      title: "Status", 
      dataIndex: "status", 
      key: "status", 
      render: (status: number) => (
        <Tag color={getStatusColor(status)}>{ESCROW_STATUS[status]}</Tag>
      )
    },
    { 
      title: "Created", 
      dataIndex: "createdAt", 
      key: "createdAt",
      render: (timestamp: any) => formatTimestamp(timestamp)
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => record.status === 4 ? (
        <Button type="primary" danger loading={refundResult.isPending} onClick={() => handleRefund(record.orderId.toString())}>
          Refund
        </Button>
      ) : null
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <Card title="Escrow Dispute Management">
        {isLoading ? (
          <div className="flex justify-center p-8"><Spin size="large" /></div>
        ) : (
          <Table
            dataSource={escrows}
            columns={columns}
            rowKey={r => `${r.orderId}_${r.maker}_${r.taker}`}
            locale={{ emptyText: "No disputed escrows found" }}
          />
        )}
      </Card>
    </div>
  );
} 