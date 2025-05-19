"use client";

import { useEffect, useState } from "react";
import { Card, Table, Button, Tag, message, Space, Spin } from "antd";
import { useReadContract, useWriteContract } from "wagmi";
import { escrowAbi } from "@/contractAbis/escrowAbi";
import { ESCROW_CONTRACT_ADDRESS_LOCAL } from "@/config/contracts";

// 你可以根据实际业务调整makerList来源
const makerList: string[] = [];

const ESCROW_STATUS = [
  "Created",
  "Locked",
  "Completed",
  "Refunded",
  "Disputed"
];

export default function EscrowDisputePage() {
  const [escrows, setEscrows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);

  // 这里只演示获取所有maker的escrow，实际可根据业务优化
  useEffect(() => {
    async function fetchAllEscrows() {
      setLoading(true);
      try {
        let allEscrows: any[] = [];
        for (const maker of makerList) {
          // 读取每个maker的escrow
          const res = await fetch(`/api/escrow?maker=${maker}`); // 你可以用后端接口聚合，或用wagmi多账户读取
          const data = await res.json();
          if (Array.isArray(data)) allEscrows = allEscrows.concat(data);
        }
        setEscrows(allEscrows);
      } catch (e) {
        message.error("Failed to fetch escrows");
      } finally {
        setLoading(false);
      }
    }
    fetchAllEscrows();
  }, [refreshFlag]);

  // 退款合约操作
  const refundResult = useWriteContract();

  const handleRefund = async (orderId: string) => {
    try {
      refundResult.writeContract({
        address: ESCROW_CONTRACT_ADDRESS_LOCAL,
        abi: escrowAbi,
        functionName: "refundEscrow",
        args: [orderId],
      });
    } catch (e) {
      message.error("Refund failed");
    }
  };

  useEffect(() => {
    if (refundResult.isSuccess) {
      message.success("Refund successful");
      setRefreshFlag(f => f + 1);
    } else if (refundResult.isError) {
      message.error(refundResult.error?.message || "Refund failed");
    }
  }, [refundResult.isSuccess, refundResult.isError]);

  const columns = [
    { title: "Order ID", dataIndex: "orderId", key: "orderId" },
    { title: "Maker", dataIndex: "maker", key: "maker" },
    { title: "Taker", dataIndex: "taker", key: "taker" },
    { title: "Status", dataIndex: "status", key: "status", render: (status: number) => <Tag color={status === 4 ? "red" : "default"}>{ESCROW_STATUS[status]}</Tag> },
    { title: "Created At", dataIndex: "createdAt", key: "createdAt", render: (t: any) => new Date(Number(t) * 1000).toLocaleString() },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => record.status === 4 ? (
        <Button type="primary" danger loading={refundResult.isPending} onClick={() => handleRefund(record.orderId)}>
          Refund
        </Button>
      ) : null
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <Card title="Escrow Dispute Management">
        {loading ? (
          <div className="flex justify-center p-8"><Spin size="large" /></div>
        ) : (
          <Table
            dataSource={escrows.filter(e => e.status === 4)}
            columns={columns}
            rowKey={r => `${r.orderId}_${r.maker}_${r.taker}`}
            locale={{ emptyText: "No disputed escrows" }}
          />
        )}
      </Card>
    </div>
  );
} 