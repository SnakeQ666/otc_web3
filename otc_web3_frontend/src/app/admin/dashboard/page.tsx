'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import axiosInstance from '@/utils/axios';
import { Card, List, Button, Tag, Space, Typography, Alert, Radio, Table } from 'antd';

const { Title } = Typography;

interface KYCApplication {
  id: string;
  userId: string;
  name: string;
  idNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface Transaction {
  id: string;
  userId: string;
  type: 'buy' | 'sell';
  amount: number;
  status: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const [kycApplications, setKYCApplications] = useState<KYCApplication[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kycFilter, setKYCFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    // 获取待审核的KYC申请
    const fetchKYCApplications = async () => {
      try {
        const response = await axiosInstance.get('kyc/list');
        const rawData = response?.data?.data?.items;
        console.log('KYC应用列表数据:', rawData); // 添加日志
        setKYCApplications(Array.isArray(rawData) ? rawData : []);
      } catch (error) {
        console.error('获取KYC申请列表失败:', error);
      }
    };

    // 获取所有用户的交易记录
    const fetchTransactions = async () => {
      try {
        const response = await axiosInstance.get('/admin/transactions');
        const rawData = response?.data?.data;
        console.log('交易记录数据:', rawData); // 添加日志
        setTransactions(Array.isArray(rawData) ? rawData : []);
      } catch (error) {
        console.error('获取交易记录失败:', error);
      }
    };

    fetchKYCApplications();
    fetchTransactions();
  }, []);

  const handleKYCReview = (kycId: string, status: 'approved' | 'rejected') => {
    router.push(`/admin/kyc/${kycId}/review?status=${status}`);
  };

  const handleDepositReview = () => {
    router.push('/admin/deposit/review');
  };

  const handleWithdrawReview = () => {
    router.push('/admin/withdraw/review');
  };

  return (
    <div className="container mx-auto px-4 py-8">
       {/* 快捷操作按钮 */}
       <Space className="mb-6" size="middle">
        <Button type="primary" onClick={() => router.push('/admin/kyc')}>{t('dashboard.kycDetails')}</Button>
        <Button type="primary" onClick={() => router.push('/admin/escrow-dispute')} style={{ backgroundColor: '#722ed1' }}>
          Escrow Dispute Management
        </Button>
      </Space>

      {/* KYC申请列表 */}
      <Card className="mb-6">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4}>{t('dashboard.kycList')}</Title>
            <Radio.Group value={kycFilter} onChange={(e) => setKYCFilter(e.target.value)}>
              <Radio.Button value="all">{t('dashboard.all')}</Radio.Button>
              <Radio.Button value="pending">{t('dashboard.pending')}</Radio.Button>
              <Radio.Button value="approved">{t('dashboard.approved')}</Radio.Button>
              <Radio.Button value="rejected">{t('dashboard.rejected')}</Radio.Button>
            </Radio.Group>
          </div>
          <List
            dataSource={kycApplications.filter(app => kycFilter === 'all' || app.status === kycFilter)}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                actions={item.status === 'pending' ? [
                  <Button
                    key="review"
                    type="primary"
                    onClick={() => router.push('/admin/kyc')}
                  >
                    Review
                  </Button>
                ] : []}
              >
                <List.Item.Meta
                  title={<Space>
                    <span>{t('dashboard.user')}: {item.name}</span>
                    <Tag color={
                      item.status === 'approved' ? 'success' :
                      item.status === 'rejected' ? 'error' :
                      'warning'
                    }>
                      {item.status === 'approved' ? t('dashboard.approved') :
                       item.status === 'rejected' ? t('dashboard.rejected') :
                       t('dashboard.pending')}
                    </Tag>
                  </Space>}
                  description={
                    <Space direction="vertical">
                      <span>{t('dashboard.userId')}: {item.userId}</span>
                      <span>{t('dashboard.idNumber')}: {item.idNumber}</span>
                      <span>{t('dashboard.applicationTime')}: {new Date(item.createdAt).toLocaleString()}</span>
                    </Space>
                  }
                />
              </List.Item>
            )}
            pagination={{
              pageSize: 10,
              showTotal: (total) => t('dashboard.totalRecords', { total })
            }}
            locale={{ emptyText: t('dashboard.noKYC') }}
          />
        </Space>
      </Card>

     
     
    </div>
  );
}