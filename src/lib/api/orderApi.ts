import { api } from './axios';

export type PaymentMethod = 'cod' | 'jazzcash' | 'easypaisa' | 'wallet';

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderItem {
  product: string;
  variant?: string;
  name: string;
  image?: string;
  price: number;
  originalPrice?: number;
  salePrice?: number;
  productDiscount?: number;
  quantity: number;
  total: number;
  lineTotal?: number;
  sku?: string;
}

export interface PaymentProof {
  transactionId: string;
  paidAmount: number;
  screenshotUrl: string;
  screenshotPublicId?: string;
  note?: string;
  submittedAt?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface OrderMemberInfo {
  buyerType?: 'customer' | 'partner' | 'business';
  discountPct?: number;
  memberDiscount?: number;
  bv?: number;
  sponsor?: string;
  sponsorCode?: string;
  commission?: number;
  commissionPct?: number;
  pointsRedeemed?: number;
  pointsEarned?: number;
  walletUsed?: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  orderType?: 'b2c' | 'partner' | 'b2b';
  member?: OrderMemberInfo;
  walletUsed?: number;
  pointsDiscount?: number;
  amountDue?: number;
  user: string | { _id: string; firstName: string; lastName: string; email: string; phone?: string };
  customerType?: 'registered' | 'guest';
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  subtotal: number;
  productDiscount?: number;
  shippingCost: number;
  discount: number;
  manualDiscount?: number;
  manualDiscountReason?: string;
  tax: number;
  total: number;
  couponCode?: string;
  couponDiscount?: number;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  paymentProof?: PaymentProof;
  status: string;
  trackingNumber?: string;
  courierName?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  dispatchedAt?: string;
  trackingHistory?: Array<{
    status: string;
    message: string;
    timestamp: string;
    location?: string;
  }>;
  notes?: string;
  auditLog?: Array<{
    timestamp: string;
    adminUser?: string;
    adminName?: string;
    actionPerformed: string;
    reason?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export const orderApi = {
  create: async (data: {
    shippingAddress: ShippingAddress;
    billingAddress?: ShippingAddress;
    paymentMethod: PaymentMethod;
    couponCode?: string;
    notes?: string;
  }): Promise<Order> => {
    const response = await api.post('/orders', data);
    return response.data.data;
  },

  getAll: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<{ orders: Order[]; pagination: OrderPagination }> => {
    const response = await api.get('/orders', { params });
    return response.data.data;
  },

  getAllAdmin: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
  }): Promise<{ orders: Order[]; pagination: OrderPagination }> => {
    const response = await api.get('/orders/admin/all', { params });
    return response.data.data;
  },

  getById: async (orderId: string): Promise<Order> => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data.data;
  },

  updateStatus: async (
    orderId: string,
    data: {
      status: string;
      message?: string;
      trackingNumber?: string;
      courierName?: string;
      trackingUrl?: string;
      estimatedDelivery?: string;
      dispatchedAt?: string;
      location?: string;
    }
  ): Promise<Order> => {
    const response = await api.patch(`/orders/${orderId}/status`, data);
    return response.data.data;
  },

  trackLookup: async (orderNumber: string, email: string): Promise<Order> => {
    const response = await api.get('/orders/track/lookup', {
      params: { orderNumber, email },
    });
    return response.data.data;
  },

  adminEditOrder: async (
    orderId: string,
    data: {
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      shippingAddress?: Partial<ShippingAddress>;
      items?: Array<{
        product: string;
        variant?: string;
        quantity: number;
      }>;
      shippingCost?: number;
      manualDiscount?: number;
      manualDiscountReason?: string;
    }
  ): Promise<Order> => {
    const response = await api.patch(`/orders/${orderId}/admin-edit`, data);
    return response.data.data;
  },

  deleteOrder: async (orderId: string): Promise<{ _id: string }> => {
    const response = await api.delete(`/orders/${orderId}`);
    return response.data.data;
  },
};
