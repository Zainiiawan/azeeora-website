import { api } from './axios';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'customer' | 'admin' | 'warehouse';
  isEmailVerified: boolean;
  [key: string]: unknown;
}

export interface AuthResponse {
  user: User;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  email?: string;
  requiresOtp?: boolean;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', {
      ...data,
      confirmPassword: data.confirmPassword ?? data.password,
    });
    return response.data.data ?? response.data;
  },

  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refreshToken');
    await api.post('/auth/logout', { refreshToken });
  },

  refreshTokens: async (): Promise<AuthResponse> => {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data.data;
  },

  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, password: string, confirmPassword: string): Promise<void> => {
    await api.post('/auth/reset-password', { token, password, confirmPassword });
  },

  verifyResetOtp: async (email: string, otp: string): Promise<{ token: string }> => {
    const response = await api.post('/auth/verify-password-reset-otp', { email, otp });
    return response.data.data;
  },

  verifyOtp: async (email: string, otp: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/verify-otp', { email, otp });
    return response.data.data;
  },

  resendOtp: async (email: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/resend-otp', { email });
    return response.data;
  },

  verifyEmail: async (token: string): Promise<User> => {
    const response = await api.get(`/auth/verify-email?token=${token}`);
    return response.data.data;
  },

  updateProfile: async (data: Partial<RegisterData>): Promise<User> => {
    const response = await api.put('/auth/profile', data);
    return response.data.data;
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<void> => {
    await api.post('/auth/change-password', data);
  },
};
