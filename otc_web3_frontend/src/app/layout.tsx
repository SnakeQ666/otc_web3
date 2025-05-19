'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout, Button, message, Spin } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import useAuthStore from '@/store/authStore';
import './globals.css';
import I18nProvider from './i18n-provider';
// 直接导入Web3组件，取消懒加载
import { Web3Provider } from './components/Web3Provider';
import { ConnectWallet } from './components/ConnectWallet';

// 动态导入非核心组件
const LanguageSwitcher = dynamic(() => import('./components/LanguageSwitcher'), {
  ssr: false,
  loading: () => <div className="w-8 h-8"></div>
});

// 页面加载进度条组件
function PageLoadingBar({ isLoading }: { isLoading: boolean }) {
  return (
    <div 
      className={`fixed top-0 left-0 right-0 h-1 bg-blue-500 z-50 transition-all duration-300 ${
        isLoading ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ 
        width: isLoading ? '90%' : '100%',
        transition: 'width 1s ease-in-out, opacity 0.3s ease-in-out 0.3s'
      }}
    />
  );
}

const { Header, Content } = Layout;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const pathname = usePathname();
  const { user, getCurrentUser, logout } = useAuthStore();
  const [pageLoading, setPageLoading] = useState(true);

  // 添加页面加载进度条
  useEffect(() => {
    // 模拟页面加载完成
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // 检查是否有token并获取用户信息
    const token = localStorage.getItem('token');
    if (token) {
      getCurrentUser().catch((error: unknown) => {
        console.error('获取用户信息失败:', error);
        // 如果获取用户信息失败，清除token
        localStorage.removeItem('token');
      });
    } else if(pathname !== '/register' && pathname !== "/" && pathname !== '/login') {
      message.info(t('nav.login'));
      router.push('/login');
    }
  }, [getCurrentUser, pathname, router, t]); 

  const handleLogout = () => {
    try {
      // 先执行登出操作
      logout();
      
      // 显示消息
      message.success(t('nav.logout'));
      
      // 使用更强制性的导航方式：先用router.push，然后作为备份再用window.location
      router.push('/login');
      
      // 设置一个短暂延迟，如果router.push没有生效，则使用window.location强制跳转
      setTimeout(() => {
        // 检查当前路径是否已经是登录页面
        if (window.location.pathname !== '/login') {
          console.log('使用window.location强制跳转到登录页');
          window.location.href = '/login';
        }
      }, 100);
    } catch (error) {
      console.error('退出登录时发生错误:', error);
      // 出错时也强制跳转
      window.location.href = '/login';
    }
  };

  // 所有页面都使用Web3Provider
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return <Web3Provider>{children}</Web3Provider>;
  };

  return (
    <html lang="en">
      <head>
        <link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" as="style" />
        <link rel="preload" href="/fonts/iconfont.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        <I18nProvider>
          <PageLoadingBar isLoading={pageLoading} />
          <Wrapper>
            <Layout className="min-h-screen">
              <Header className="flex justify-between items-center px-6 bg-white">
                <div className="flex items-center">
                  <Link href="/" className="text-xl font-bold text-blue-600">
                    {t('nav.platform')}
                  </Link>
                </div>
                <div className="flex items-center gap-4">
                
                    <ConnectWallet />
                  
                  <LanguageSwitcher />
                  {user ? (
                    <>
                      <span className="mr-4">
                        <UserOutlined className="mr-2" />
                        {user.email}
                      </span>
                      <Button 
                        type="link" 
                        icon={<LogoutOutlined />}
                        onClick={handleLogout}
                      >
                        {t('nav.logout')}
                      </Button>
                    </>
                  ) : (
                    <Link href="/login">
                      <Button type="primary">{t('platform.login')}</Button>
                    </Link>
                  )}
                </div>
              </Header>
              <Content className="p-6">
                {pageLoading ? (
                  <div className="flex justify-center items-center min-h-[400px]">
                    <Spin size="large" />
                  </div>
                ) : (
                  children
                )}
              </Content>
            </Layout>
          </Wrapper>
        </I18nProvider>
      </body>
    </html>
  );
}


