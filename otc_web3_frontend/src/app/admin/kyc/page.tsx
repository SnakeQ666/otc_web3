'use client';

import { useEffect, useState } from 'react';
import { kycApi, KYCListItem } from '../../api/kyc';
import { 
  Card, 
  List, 
  Button, 
  Spin, 
  Typography,
  Tag,
  Space,
  Alert,
  Modal,
  Form,
  Input,
  Image,
  Tabs,
  message,
  Empty
} from 'antd';
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  CloseCircleOutlined,
  ReloadOutlined,
  UserOutlined,
  IdcardOutlined,
  CameraOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

export default function AdminKYCReviewPage() {
  const [kycList, setKycList] = useState<KYCListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedKYC, setSelectedKYC] = useState<KYCListItem | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchKYCList();
  }, []);

  const fetchKYCList = async () => {
    try {
      const response = await kycApi.getKYCList(activeTab);
      setKycList(response.data.items);
    } catch (err) {
      setError('获取列表失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (approved: boolean) => {
    if (!selectedKYC) return;

    try {
      const values = await form.validateFields();
      await kycApi.reviewKYC(selectedKYC.id, approved, values.message);
      message.success('审核操作成功');
      setReviewModalVisible(false);
      form.resetFields();
      setSelectedKYC(null);
      fetchKYCList();
    } catch (err) {
      message.error('审核失败，请重试');
    }
  };

  const getStatusConfig = (status: KYCListItem['status']) => {
    switch (status) {
      case 'pending':
        return {
          icon: <ClockCircleOutlined />,
          color: 'processing',
          text: '待审核'
        };
      case 'approved':
        return {
          icon: <CheckCircleOutlined />,
          color: 'success',
          text: '已通过'
        };
      case 'rejected':
        return {
          icon: <CloseCircleOutlined />,
          color: 'error',
          text: '已拒绝'
        };
      default:
        return {
          icon: <ClockCircleOutlined />,
          color: 'default',
          text: '未知状态'
        };
    }
  };

  const filteredKYCList = kycList?.filter(kyc => kyc.status === activeTab) || [];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert
          message="错误"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={fetchKYCList}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <Title level={2}>KYC 审核管理</Title>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={fetchKYCList}
          >
            刷新列表
          </Button>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="待审核" key="pending" />
          <TabPane tab="已通过" key="approved" />
          <TabPane tab="已拒绝" key="rejected" />
        </Tabs>

        <List
          className="mt-4"
          dataSource={filteredKYCList}
          renderItem={(kyc) => {
            const statusConfig = getStatusConfig(kyc.status);
            return (
              <List.Item
                actions={[
                  kyc.status === 'pending' && (
                    <Button
                      type="primary"
                      onClick={() => {
                        setSelectedKYC(kyc);
                        setReviewModalVisible(true);
                      }}
                    >
                      审核
                    </Button>
                  )
                ]}
              >
                <List.Item.Meta
                  avatar={<UserOutlined style={{ fontSize: 24 }} />}
                  title={
                    <Space>
                      <span>{kyc.realName}</span>
                      <Tag icon={statusConfig.icon} color={statusConfig.color}>
                        {statusConfig.text}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small">
                      <Text type="secondary">
                        {kyc.idType === 'idcard' ? '身份证' : '护照'}: {kyc.idNumber}
                      </Text>
                      <Text type="secondary" className="text-sm">
                        提交时间: {new Date(kyc.createdAt).toLocaleString()}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            );
          }}
          locale={{ emptyText: <Empty description="暂无数据" /> }}
        />
      </Card>

      <Modal
        title="KYC 审核"
        open={reviewModalVisible}
        onCancel={() => {
          setReviewModalVisible(false);
          form.resetFields();
          setSelectedKYC(null);
        }}
        footer={null}
        width={800}
      >
        {selectedKYC && (
          <div>
            <Tabs defaultActiveKey="info">
              <TabPane tab="基本信息" key="info" icon={<UserOutlined />}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <div>
                    <Text strong>姓名：</Text>
                    <Text>{selectedKYC.realName}</Text>
                  </div>
                  <div>
                    <Text strong>证件类型：</Text>
                    <Text>{selectedKYC.idType === 'idcard' ? '身份证' : '护照'}</Text>
                  </div>
                  <div>
                    <Text strong>证件号码：</Text>
                    <Text>{selectedKYC.idNumber}</Text>
                  </div>
                </Space>
              </TabPane>

              <TabPane tab="证件照片" key="photos" icon={<CameraOutlined />}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <div>
                    <Text strong>证件正面照片：</Text>
                    <Image
                      src={selectedKYC.frontImage || `${process.env.NEXT_PUBLIC_COS_DOMAIN}/kyc/${selectedKYC.id}/front.jpg`}
                      alt="正面照片"
                      width={300}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Text strong>证件背面照片：</Text>
                    <Image
                      src={selectedKYC.backImage || `${process.env.NEXT_PUBLIC_COS_DOMAIN}/kyc/${selectedKYC.id}/back.jpg`}
                      alt="背面照片"
                      width={300}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Text strong>手持证件照片：</Text>
                    <Image
                      src={selectedKYC.selfieImage || `${process.env.NEXT_PUBLIC_COS_DOMAIN}/kyc/${selectedKYC.id}/selfie.jpg`}
                      alt="手持照片"
                      width={300}
                      className="mt-2"
                    />
                  </div>
                </Space>
              </TabPane>
            </Tabs>

            <Form
              form={form}
              layout="vertical"
              className="mt-6"
            >
              <Form.Item
                name="message"
                label="审核意见"
              >
                <Input.TextArea
                  rows={4}
                  placeholder="请输入审核意见（选填）"
                />
              </Form.Item>

              <div className="flex justify-end space-x-4">
                <Button
                  onClick={() => {
                    setReviewModalVisible(false);
                    form.resetFields();
                    setSelectedKYC(null);
                  }}
                >
                  取消
                </Button>
                <Button
                  type="primary"
                  danger
                  onClick={() => handleReview(false)}
                >
                  拒绝
                </Button>
                <Button
                  type="primary"
                  onClick={() => handleReview(true)}
                >
                  通过
                </Button>
              </div>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}