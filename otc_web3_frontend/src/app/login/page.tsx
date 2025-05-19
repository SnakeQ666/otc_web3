'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuthStore from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error } = useAuthStore();
  const [form] = Form.useForm();

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      await login(values.email, values.password);
      message.success(t('login.success'));
      const user = useAuthStore.getState().user;
      console.log("user:",user)
      if (user?.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      message.error(error || t('login.failed'));
    }
  };

  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-8">{t('login.title')}</h1>
        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: t('login.emailRequired') },
              { type: 'email', message: t('login.emailValid') }
            ]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder={t('login.email')} 
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: t('login.passwordRequired') }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('login.password')}
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              className="w-full"
              size="large"
              loading={loading}
            >
              {t('login.title')}
            </Button>
          </Form.Item>

          <div className="text-center">
            <span className="text-gray-600">{t('login.noAccount')}</span>
            <Link href="/register" className="ml-2 text-blue-600 hover:text-blue-800">
              {t('login.registerNow')}
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}