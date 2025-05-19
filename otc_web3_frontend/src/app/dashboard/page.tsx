'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import axiosInstance from '@/utils/axios';
import { Card, Table, Button, Tag, Space, Typography, Divider, Spin } from 'antd';
import dynamic from 'next/dynamic';
import Web3ErrorBoundary from '../components/Web3ErrorBoundary';

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Optimize loading order: load basic info first, delay loading Web3 related content
    setLoading(true);
    
    // Get KYC status
    const fetchKYCStatus = async () => {
      try {
        const response = await axiosInstance.get('/kyc/status');
        setKycStatus(response?.data?.data);
      } catch (error) {
        console.error('Failed to get KYC status:', error);
      }
    };

    // Get transaction records
    const fetchTransactions = async () => {
      try {
        const response = await axiosInstance.get('/transactions');
        setTransactions(response.data);
      } catch (error) {
        console.error('Failed to get transaction records:', error);
      } finally {
        setLoading(false);
      }
    };

    // Parallel requests to speed up loading
    Promise.all([fetchKYCStatus(), fetchTransactions()]).catch(() => {
      setLoading(false);
    });
  }, []);

  const handleCreateOrder = () => {
    router.push('/orders');
  };

  const handleOrderHall = () => {
    router.push('/orderhall');
  };

  return (
    <div className="container mx-auto px-4 py-8">
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

      {/* Quick Action Buttons */}
      <Space className="mb-6" size="middle">
        <Button type="primary" onClick={handleOrderHall} style={{ backgroundColor: '#1890ff' }}>
          {t('dashboard.orderHall')}
        </Button>
        <Button type="primary" onClick={handleCreateOrder}>
          {t('dashboard.createOrder')}
        </Button>
        <Button type="primary" onClick={() => router.push('/tokens')} style={{ backgroundColor: '#52c41a' }}>
          Claim
        </Button>
      </Space>

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

      {/* Transaction Records List */}
      <Card>
        <Title level={4}>{t('dashboard.transactionRecords')}</Title>
        {loading ? (
          <div className="p-6 text-center"><Spin /></div>
        ) : (
          <Table
            dataSource={transactions}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: t('dashboard.noTransactions') }}
            columns={[
              {
                title: t('dashboard.transactionId'),
                dataIndex: 'id',
                key: 'id'
              },
              {
                title: t('dashboard.type'),
                dataIndex: 'type',
                key: 'type',
                render: (type) => (
                  <Tag color={type === 'buy' ? 'blue' : 'orange'}>
                    {type === 'buy' ? t('dashboard.buy') : t('dashboard.sell')}
                  </Tag>
                )
              },
              {
                title: t('dashboard.amount'),
                dataIndex: 'amount',
                key: 'amount'
              },
              {
                title: t('dashboard.status'),
                dataIndex: 'status',
                key: 'status'
              },
              {
                title: t('dashboard.time'),
                dataIndex: 'createdAt',
                key: 'createdAt',
                render: (createdAt) => new Date(createdAt).toLocaleString()
              }
            ]}
          />
        )}
      </Card>
    </div>
  );
}