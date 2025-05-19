import { create } from 'zustand';
import axiosInstance from '@/utils/axios';
import { message } from 'antd';

interface AuthState {
  user: any | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  register: (formData: FormData) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  getCurrentUser: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,

  getCurrentUser: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        set({ user: null });
        return;
      }

      const response = await axiosInstance.get(`/auth/currentUser`);
      console.log(response.data)
      if (response.data.success) {
        set({ user: response.data.data });
      } else {
        set({ user: null });
        localStorage.removeItem('token');
        message.error('登录已过期，请重新登录');
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('获取当前用户信息失败:', error);
      set({ user: null });
      localStorage.removeItem('token');
    }
  },

  register: async (formData: FormData) => {
    console.log(formData)
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.post(`/auth/register`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { token, user } = response.data;
      set({ token, user, loading: false });
      
      // 存储 token 到 localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
      }
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || '注册失败，请重试', 
        loading: false 
      });
      throw error;
    }
  },

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.post(`/auth/login`, {
        email,
        password
      });

      const { token, user } = response.data;
      set({ token, user, loading: false });
      
      // 存储 token 到 localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
      }
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || '登录失败，请重试', 
        loading: false 
      });
      throw error;
    }
  },

  logout: () => {
    // 清除状态
    set({ user: null, token: null });
    
    // 清除localStorage中的token
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      
      // 清除所有可能存在的会话相关数据
      sessionStorage.clear();
      
      // 清除可能与认证相关的所有cookie
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
    }
    
    // 通知登出完成
    console.log('用户已成功登出');
  },

  clearError: () => set({ error: null })
}));

export default useAuthStore;