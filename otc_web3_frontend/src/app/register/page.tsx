'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  message, 
  Steps,
  Typography,
  Space,
  Upload,
  Select
} from 'antd';
import { 
  UserOutlined, 
  LockOutlined, 
  MailOutlined,
  IdcardOutlined,
  CameraOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import useAuthStore from '@/store/authStore';

const { Title, Text } = Typography;
const { Step } = Steps;

interface FormValues {
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  realName: string;
  idType: 'idcard' | 'passport';
  idNumber: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const { register, loading, error } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [allFormData, setAllFormData] = useState<Partial<FormValues>>({});
  const [fileList, setFileList] = useState<{
    frontImage: UploadFile[];
    backImage: UploadFile[];
    selfieImage: UploadFile[];
  }>({
    frontImage: [],
    backImage: [],
    selfieImage: [],
  });

  const steps = [
    {
      title: t('register.accountInfo'),
      icon: <UserOutlined />,
    },
    {
      title: t('register.kycInfo'),
      icon: <IdcardOutlined />,
    },
    {
      title: t('register.complete'),
      icon: <CheckCircleOutlined />,
    },
  ];

  const handleFileChange = (type: 'frontImage' | 'backImage' | 'selfieImage', info: any) => {
    console.log('File change:', type, info);
    setFileList(prev => ({
      ...prev,
      [type]: info.fileList.slice(-1), // 只保留最新的一个文件
    }));
  };

  const handleNext = async () => {
    try {
      // 验证当前步骤的表单数据
      const stepValues = await form.validateFields();
      console.log('当前步骤表单数据:', stepValues);
      
      // 合并当前步骤的数据到总数据中
      const newAllFormData = {
        ...allFormData,
        ...stepValues
      };
      setAllFormData(newAllFormData);
      console.log('累积的所有表单数据:', newAllFormData);
      
      // 如果是第一步，验证密码确认
      if (currentStep === 0) {
        if (stepValues.password !== stepValues.confirmPassword) {
          message.error('两次输入的密码不一致');
          return;
        }
      }
      
      // 如果是第二步，验证文件上传
      if (currentStep === 1) {
        if (!fileList.frontImage.length || !fileList.backImage.length || !fileList.selfieImage.length) {
          message.error('请上传所有必需的证件照片');
          return;
        }
      }
      
      setCurrentStep(prev => Math.min(steps.length - 1, prev + 1));
    } catch (errorInfo) {
      console.log('验证失败:', errorInfo);
    }
  };

  const handleSubmit = async () => {
    try {
      // 验证当前步骤的表单数据（如果有的话）
      const finalStepValues = await form.validateFields();
      console.log('最终步骤表单数据:', finalStepValues);
      
      // 合并所有数据
      const finalFormData = {
        ...allFormData,
        ...finalStepValues
      };
      console.log('最终合并的表单数据:', finalFormData);
      
      // 验证文件上传
      if (!fileList.frontImage.length || !fileList.backImage.length || !fileList.selfieImage.length) {
        message.error('请上传所有必需的证件照片');
        return;
      }

      const submitFormData = new FormData();
      
      // 添加注册信息
      Object.keys(finalFormData).forEach(key => {
        if (key !== 'confirmPassword' && finalFormData[key] !== undefined) {
          submitFormData.append(key, finalFormData[key]);
        }
      });

      // 添加 KYC 照片
      if (fileList.frontImage[0]?.originFileObj) {
        submitFormData.append('frontImage', fileList.frontImage[0].originFileObj);
      }
      if (fileList.backImage[0]?.originFileObj) {
        submitFormData.append('backImage', fileList.backImage[0].originFileObj);
      }
      if (fileList.selfieImage[0]?.originFileObj) {
        submitFormData.append('selfieImage', fileList.selfieImage[0].originFileObj);
      }

      // 打印 FormData 内容以便调试
      console.log('提交的表单数据:');
      for (let [key, value] of submitFormData.entries()) {
        console.log(key + ':', value);
      }

      await register(submitFormData);
      message.success(t('register.success'));
      router.push('/login');
    } catch (err: any) {
      console.error('注册错误:', err);
      message.error(err.response?.data?.error || t('register.failed'));
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <Form.Item
              name="email"
              label={t('register.email')}
              initialValue={allFormData.email}
              rules={[
                { required: true, message: t('register.emailRequired') },
                { type: 'email', message: t('register.emailValid') }
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder={t('register.email')} />
            </Form.Item>
            <Form.Item
              name="phone"
              label={t('register.phone')}
              initialValue={allFormData.phone}
              rules={[
                { required: true, message: t('register.phoneRequired') },
                { pattern: /^1[3-9]\d{9}$/, message: t('register.phoneValid') }
              ]}
            >
              <Input placeholder={t('register.phone')} />
            </Form.Item>
            <Form.Item
              name="password"
              label={t('register.password')}
              initialValue={allFormData.password}
              rules={[
                { required: true, message: t('register.passwordRequired') },
                { min: 6, message: t('register.passwordRequired') }
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder={t('register.password')} />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label={t('register.confirmPassword')}
              initialValue={allFormData.confirmPassword}
              dependencies={['password']}
              rules={[
                { required: true, message: t('register.confirmPasswordRequired') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t('register.passwordMismatch')));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder={t('register.confirmPassword')} />
            </Form.Item>
          </>
        );
      case 1:
        return (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Form.Item
              name="realName"
              label={t('register.realName')}
              initialValue={allFormData.realName}
              rules={[{ required: true, message: t('register.realNameRequired') }]}
            >
              <Input prefix={<UserOutlined />} placeholder={t('register.realName')} />
            </Form.Item>

            <Form.Item
              name="idType"
              label={t('register.idType')}
              initialValue={allFormData.idType}
              rules={[{ required: true, message: t('register.idType') }]}
            >
              <Select placeholder={t('register.idType')}>
                <Select.Option value="idcard">{t('register.idCard')}</Select.Option>
                <Select.Option value="passport">{t('register.passport')}</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="idNumber"
              label={t('register.idNumber')}
              initialValue={allFormData.idNumber}
              rules={[{ required: true, message: t('register.idNumberRequired') }]}
            >
              <Input placeholder={t('register.idNumber')} />
            </Form.Item>

            <Form.Item
              label={t('register.idFront')}
              required
            >
              <Upload
                listType="picture-card"
                maxCount={1}
                fileList={fileList.frontImage}
                onChange={(info) => handleFileChange('frontImage', info)}
                beforeUpload={() => false}
              >
                <div>
                  <CameraOutlined />
                  <div style={{ marginTop: 8 }}>{t('register.upload')}</div>
                </div>
              </Upload>
            </Form.Item>

            <Form.Item
              label={t('register.idBack')}
              required
            >
              <Upload
                listType="picture-card"
                maxCount={1}
                fileList={fileList.backImage}
                onChange={(info) => handleFileChange('backImage', info)}
                beforeUpload={() => false}
              >
                <div>
                  <CameraOutlined />
                  <div style={{ marginTop: 8 }}>{t('register.upload')}</div>
                </div>
              </Upload>
            </Form.Item>

            <Form.Item
              label={t('register.selfie')}
              required
            >
              <Upload
                listType="picture-card"
                maxCount={1}
                fileList={fileList.selfieImage}
                onChange={(info) => handleFileChange('selfieImage', info)}
                beforeUpload={() => false}
              >
                <div>
                  <CameraOutlined />
                  <div style={{ marginTop: 8 }}>{t('register.upload')}</div>
                </div>
              </Upload>
            </Form.Item>
          </Space>
        );
      case 2:
        return (
          <div style={{ textAlign: 'center' }}>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
            <Title level={4} style={{ marginTop: 16 }}>{t('register.title')}</Title>
            <Text type="secondary">
              {t('register.confirmInfo')}
            </Text>
            <div style={{ marginTop: 24, textAlign: 'left' }}>
              <p>{t('register.email')}: {allFormData.email}</p>
              <p>{t('register.phone')}: {allFormData.phone}</p>
              <p>{t('register.realName')}: {allFormData.realName}</p>
              <p>{t('register.idType')}: {allFormData.idType === 'idcard' ? t('register.idCard') : t('register.passport')}</p>
              <p>{t('register.idNumber')}: {allFormData.idNumber}</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 20px' }}>
      <Card>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 40 }}>
          {t('register.title')}
        </Title>

        <Steps current={currentStep} style={{ marginBottom: 40 }}>
          {steps.map(step => (
            <Step key={step.title} title={step.title} icon={step.icon} />
          ))}
        </Steps>

        <Form
          form={form}
          layout="vertical"
          style={{ maxWidth: 400, margin: '0 auto' }}
        >
          {renderStepContent()}

          <Form.Item style={{ marginTop: 40 }}>
            <Space style={{ width: '100%', justifyContent: 'center' }}>
              {currentStep > 0 && (
                <Button
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  disabled={loading}
                >
                  {t('register.prev')}
                </Button>
              )}
              {currentStep < steps.length - 1 ? (
                <Button type="primary" onClick={handleNext} disabled={loading}>
                  {t('register.next')}
                </Button>
              ) : (
                <Button type="primary" onClick={handleSubmit} loading={loading} disabled={loading}>
                  {t('register.submit')}
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}