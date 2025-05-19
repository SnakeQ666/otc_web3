'use client';

import { useEffect, useState } from 'react';
import { kycApi, KYCStatus } from '../api/kyc';
import { 
  Card, 
  Result, 
  Button, 
  Spin, 
  Typography,
  Tag,
  Space,
  Alert
} from 'antd';
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  CloseCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

export default function KYCStatusPage() {
  const [status, setStatus] = useState<KYCStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      const data = await kycApi.getKYCStatus();
      setStatus(data);
    } catch (err) {
      setError('获取状态失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert
          message="错误"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={fetchStatus}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  const getStatusConfig = (status: KYCStatus['status']) => {
    switch (status) {
      case 'pending':
        return {
          icon: <ClockCircleOutlined style={{ fontSize: 48, color: '#faad14' }} />,
          title: '审核中',
          subTitle: '您的 KYC 认证正在审核中，请耐心等待',
          tag: <Tag color="processing">审核中</Tag>,
        };
      case 'approved':
        return {
          icon: <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />,
          title: '已通过',
          subTitle: '恭喜您，KYC 认证已通过',
          tag: <Tag color="success">已通过</Tag>,
        };
      case 'rejected':
        return {
          icon: <CloseCircleOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />,
          title: '已拒绝',
          subTitle: '您的 KYC 认证未通过，请查看原因并重新提交',
          tag: <Tag color="error">已拒绝</Tag>,
        };
      default:
        return {
          icon: <ClockCircleOutlined style={{ fontSize: 48, color: '#faad14' }} />,
          title: '未知状态',
          subTitle: '无法获取当前状态，请刷新页面重试',
          tag: <Tag>未知状态</Tag>,
        };
    }
  };

  const statusConfig = getStatusConfig(status?.status || 'pending');

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <div className="text-center">
          {statusConfig.icon}
          <Title level={3} style={{ marginTop: 16 }}>
            {statusConfig.title}
          </Title>
          <Text type="secondary" className="block mb-6">
            {statusConfig.subTitle}
          </Text>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div className="flex justify-center">
              {statusConfig.tag}
            </div>

            {status?.message && (
              <Alert
                message="审核意见"
                description={status.message}
                type={status.status === 'rejected' ? 'error' : 'info'}
                showIcon
              />
            )}

            {status?.status === 'rejected' && (
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={() => window.location.href = '/kyc'}
              >
                重新提交认证
              </Button>
            )}
          </Space>
        </div>
      </Card>
    </div>
  );
} 