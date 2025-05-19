'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Alert, Spin } from 'antd';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  errorMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  loading: boolean;
}

/**
 * Web3ErrorBoundary - 用于捕获Web3相关组件中的错误
 * 提供优雅的错误处理和重试机制
 */
class Web3ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    loading: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, loading: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Web3组件错误:', error);
    console.error('错误详情:', errorInfo);
  }

  private handleRetry = () => {
    this.setState({ loading: true, hasError: false });
    
    // 短暂延迟后重新加载页面，给Web3Provider足够的初始化时间
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  public render() {
    const { hasError, error, loading } = this.state;
    const { children, fallback, errorMessage } = this.props;

    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Spin size="large" />
          <p className="mt-4">正在重新连接钱包...</p>
        </div>
      );
    }
    
    if (hasError) {
      if (fallback) {
        return fallback;
      }
      
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Alert
            type="error"
            message="Web3连接错误"
            description={errorMessage || error?.message || '无法连接到区块链网络，请检查钱包连接'}
            showIcon
          />
          <Button 
            type="primary" 
            onClick={this.handleRetry}
            className="mt-4"
          >
            重试连接
          </Button>
        </div>
      );
    }

    return children;
  }
}

export default Web3ErrorBoundary; 