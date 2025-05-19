'use client';

import { useEffect, useState, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, Button, Typography, Space, Skeleton } from 'antd';
import useAuthStore from '@/store/authStore';

const { Title, Paragraph } = Typography;

// 动态导入非首屏组件
const PlatformFeatures = dynamic(() => import('./components/PlatformFeatures'), {
  loading: () => <Skeleton active paragraph={{ rows: 3 }} className="fixed-height-container" />,
  ssr: false
});

const PlatformStats = dynamic(() => import('./components/PlatformStats'), {
  loading: () => <Skeleton active paragraph={{ rows: 1 }} className="fixed-height-container" />,
  ssr: false
});

const TradingProcess = dynamic(() => import('./components/TradingProcess'), {
  loading: () => <Skeleton active paragraph={{ rows: 4 }} className="fixed-height-container" />,
  ssr: false
});

export default function Home() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // 如果用户已登录，自动跳转到交易大厅
    if (user) {
      router.push('/dashboard');
    }

    // 延迟加载次要内容
    const timer = setTimeout(() => {
      setLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [user, router]);

  const handleLogin = () => {
    router.push('/login');
  };

  const handleRegister = () => {
    router.push('/register');
  };

  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 平台介绍 - 首屏内容，优先渲染 */}
      <Card className="mb-8">
        <div className="text-center mb-8 high-priority">
          {/* LCP元素 - 给予最高优先级 */}
          <Title className="!will-change-auto">{t('platform.title')}</Title>
          <Paragraph className="text-lg text-gray-600">
            {t('platform.subtitle')}
          </Paragraph>
          <Space size="large" className="placeholder">
            <Button type="primary" size="large" onClick={handleLogin}>
              {t('platform.login')}
            </Button>
            <Button size="large" onClick={handleRegister}>
              {t('platform.register')}
            </Button>
          </Space>
        </div>
      </Card>

      {/* 懒加载非首屏内容，仅在首屏内容加载完成后加载 */}
      {loaded && (
        <div className="content-container">
          <Suspense fallback={<Skeleton active paragraph={{ rows: 3 }} />}>
            <PlatformFeatures />
          </Suspense>
          
          <Suspense fallback={<Skeleton active paragraph={{ rows: 1 }} />}>
            <PlatformStats />
          </Suspense>
          
          <Suspense fallback={<Skeleton active paragraph={{ rows: 4 }} />}>
            <TradingProcess />
          </Suspense>
        </div>
      )}
    </div>
  );
}
