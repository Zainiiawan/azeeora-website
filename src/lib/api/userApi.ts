import { api } from './axios';

export interface UserProfile {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'admin';
  isEmailVerified: boolean;
  isActive?: boolean;
  avatar?: string;
  phone?: string;
  totalSpent?: number;
  isVip?: boolean;
  createdAt?: string;
}

export interface UserPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const userApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<{ users: UserProfile[]; pagination: UserPagination }> => {
    const response = await api.get('/users', { params });
    return response.data.data;
  },

  updateRole: async (userId: string, role: 'admin' | 'customer' | 'warehouse'): Promise<UserProfile> => {
    const response = await api.patch(`/users/${userId}/role`, { role });
    return response.data.data;
  },

  setActive: async (userId: string, isActive: boolean): Promise<UserProfile> => {
    const response = await api.patch(`/users/${userId}/activate`, { isActive });
    return response.data.data;
  },

  deleteUser: async (userId: string): Promise<{ _id: string }> => {
    const response = await api.delete(`/users/${userId}`);
    return response.data.data;
  },
};
