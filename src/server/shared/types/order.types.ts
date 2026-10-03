// ==========================================
// Order Types
// ==========================================

export type OrderStatus =
  | 'pending'
  | 'pending_confirmation'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'return_requested'
  | 'returned';

export type PaymentStatus =
  | 'pending'
  | 'waiting_verification'
  | 'paid'
  | 'rejected'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export type PaymentMethod = 'cod' | 'jazzcash' | 'easypaisa';

export interface IPaymentProof {
  transactionId: string;
  paidAmount: number;
  screenshotUrl: string;
  screenshotPublicId?: string;
  note?: string;
  submittedAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface IOrderItem {
  product: string;
  variant?: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  total: number;
  sku: string;
}

export interface IOrderTracking {
  status: string;
  message: string;
  timestamp: string;
  location?: string;
}

export interface IShippingAddress {
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IOrder {
  _id: string;
  orderNumber: string;
  user: string;
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  billingAddress?: IShippingAddress;
  subtotal: number;
  shippingCost: number;
  discount: number;
  tax: number;
  total: number;
  couponCode?: string;
  couponDiscount?: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentProof?: IPaymentProof;
  paymentIntentId?: string;
  status: OrderStatus;
  trackingNumber?: string;
  trackingHistory: IOrderTracking[];
  estimatedDelivery?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const MANUAL_PAYMENT_ACCOUNTS = {
  jazzcash: {
    accountName: 'Muhammad Zain',
    number: '03060466911',
    methodLabel: 'JazzCash',
  },
  easypaisa: {
    accountName: 'Muhammad Zain',
    number: '03060466911',
    methodLabel: 'Easypaisa',
  },
} as const;
