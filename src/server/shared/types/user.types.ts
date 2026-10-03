// ==========================================
// User Types
// ==========================================

export type UserRole = 'customer' | 'admin';

export interface IAddress {
  _id?: string;
  label: string;
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface IUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;
  googleId?: string;
  addresses: IAddress[];
  wishlist: string[];
  createdAt: string;
  updatedAt: string;
}

export interface IAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  isEmailVerified: boolean;
}

export interface ITokens {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthResponse {
  user: IAuthUser;
  tokens: ITokens;
}
