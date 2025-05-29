'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import axiosInstance from '@/utils/axios';
import { Card, Table, Button, Tag, Space, Typography, Divider, Spin, Row, Col } from 'antd';
import dynamic from 'next/dynamic';
import Web3ErrorBoundary from '../components/Web3ErrorBoundary';
import { SwapOutlined, BankOutlined, HistoryOutlined, UnorderedListOutlined, PlusCircleOutlined, GiftOutlined } from "@ant-design/icons";

const { Title } = Typography;

// Dynamic import of Web3 related components, wrapped in Suspense and ErrorBoundary
const EscrowOrderList = dynamic(() => import('./components/EscrowOrderList'), {
  loading: () => <div className="p-6"><Spin /></div>,
  ssr: false
});

const BuyerEscrowList = dynamic(() => import('./components/BuyerEscrowList'), {
  loading: () => <div className="p-6"><Spin /></div>,
  ssr: false
});

interface KYCStatus {
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string;
}

interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  amount: number;
  status: string;
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Optimize loading order: load basic info first, delay loading Web3 related content
    
    // Get KYC status
  
  }, []);


  const menuItems = [
    {
      title: "OTC Trading",
      description: "Trade tokens directly with other users",
      icon: <SwapOutlined style={{ fontSize: "24px" }} />,
      path: "/orders",
    },
    {
      title: "Lending Market",
      description: "Borrow and lend tokens with collateral",
      icon: <BankOutlined style={{ fontSize: "24px" }} />,
      path: "/lending",
    },
    {
      title: "My Loans",
      description: "View and manage your loans",
      icon: <HistoryOutlined style={{ fontSize: "24px" }} />,
      path: "/lending/my-loans",
    },
    {
      title: "Order Hall",
      description: "View all available orders",
      icon: <UnorderedListOutlined style={{ fontSize: "24px" }} />,
      path: "/orderhall",
    },
    {
      title: "Create Order",
      description: "Create a new OTC order",
      icon: <PlusCircleOutlined style={{ fontSize: "24px" }} />,
      path: "/orders",
    },
    {
      title: "Claim",
      description: "Claim test tokens",
      icon: <GiftOutlined style={{ fontSize: "24px" }} />,
      path: "/tokens",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Dashboard</h1>
      <Row gutter={[24, 24]}>
        {menuItems.map((item, idx) => (
          <Col xs={24} sm={12} md={8} key={item.path}>
            <Card
              hoverable
              className="h-full transition-transform duration-200 hover:scale-105 shadow-md"
              onClick={() => router.push(item.path)}
              style={{ minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 text-blue-500">{item.icon}</div>
                <h2 className="text-lg font-semibold mb-2">{item.title}</h2>
                <p className="text-gray-600">{item.description}</p>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* KYC Status Card */}
      <Card className="mb-6">
        <Title level={4} className="high-priority">{t('dashboard.kycStatus')}</Title>
        {loading ? (
          <Spin />
        ) : kycStatus ? (
          <div>
            <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
              <div>
                {t('dashboard.status')}: <Tag color={
                kycStatus.status === 'approved' ? 'success' :
                kycStatus.status === 'rejected' ? 'error' :
                'warning'
              }>
                {kycStatus.status === 'approved' ? t('dashboard.approved') :
                 kycStatus.status === 'rejected' ? t('dashboard.rejected') :
                 t('dashboard.pending')}
              </Tag>
              </div>
              {kycStatus.rejectReason && (
                <div className="text-gray-600">{kycStatus.rejectReason}</div>
              )}
            </Space>
          </div>
        ) : (
          <div>{t('dashboard.noKYC')}</div>
        )}
      </Card>


      {/* Seller Escrow Order List - Wrapped in Web3ErrorBoundary */}
      <Card className="mb-6">
        <Title level={4}>{t('dashboard.escrow.sellerTitle')}</Title>
        <Web3ErrorBoundary 
          errorMessage="Failed to load seller escrow orders, please make sure your wallet is connected"
        >
          <Suspense fallback={<div className="p-6 text-center"><Spin tip="Loading Web3 data..." /></div>}>
            <EscrowOrderList />
          </Suspense>
        </Web3ErrorBoundary>
      </Card>

      {/* Buyer Escrow Order List - Wrapped in Web3ErrorBoundary */}
      <Card className="mb-6">
        <Title level={4}>{t('dashboard.escrow.buyerTitle')}</Title>
        <Web3ErrorBoundary
          errorMessage="Failed to load buyer escrow orders, please make sure your wallet is connected"
        >
          <Suspense fallback={<div className="p-6 text-center"><Spin tip="Loading Web3 data..." /></div>}>
            <BuyerEscrowList />
          </Suspense>
        </Web3ErrorBoundary>
      </Card>

    
    </div>
  );
}