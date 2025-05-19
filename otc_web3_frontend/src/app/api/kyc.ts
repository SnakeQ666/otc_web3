import axiosInstance from '@/utils/axios';

export interface KYCData {
  realName: string;
  idType: string;
  idNumber: string;
  frontImage: File;
  backImage: File;
  selfieImage: File;
}

export interface KYCStatus {
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
}

export interface KYCListItem {
  id: string;
  userId: string;
  realName: string;
  idType: string;
  idNumber: string;
  status: KYCStatus['status'];
  createdAt: string;
  updatedAt: string;
  frontImage?: string;
  backImage?: string;
  selfieImage?: string;
}

export const kycApi = {
  // 提交 KYC 申请
  submitKYC: async (data: FormData) => {
    const response = await axiosInstance.post(`/kyc/submit`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // 获取 KYC 状态
  getKYCStatus: async () => {
    const response = await axiosInstance.get(`/kyc/status`);
    return response.data;
  },

  // 管理员获取 KYC 列表
  getKYCList: async (status?: string) => {
    const response = await axiosInstance.get(`/kyc/list${status ? `?status=${status}` : ''}`);
    return response.data;
  },

  // 管理员审核 KYC
  reviewKYC: async (kycId: string, approved: boolean, message?: string) => {
    const response = await axiosInstance.put(`/kyc/${kycId}/review`, {
      status: approved ? 'approved' : 'rejected',
      rejectReason: message,
    });
    return response.data;
  },
};