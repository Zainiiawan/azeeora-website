import { api } from './axios';
import { Product } from './productApi';

export interface Campaign {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  discountPct: number;
  productIds: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  products?: Product[];
}

export type IncentiveMetric = 'referral_sales' | 'personal_sales' | 'new_referrals' | 'commission';
export interface Incentive {
  _id: string;
  title: string;
  description?: string;
  image?: string;
  metric: IncentiveMetric;
  target: number;
  reward: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  progress?: number;
  started?: boolean;
}

export interface Training {
  _id: string;
  title: string;
  category?: string;
  summary?: string;
  body?: string;
  videoUrl?: string;
  order?: number;
  isActive: boolean;
}

export interface PickupPoint {
  _id: string;
  name: string;
  city: string;
  address: string;
  phone?: string;
  hours?: string;
  isActive: boolean;
}

export interface QueueOrder {
  _id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  customerName: string;
  customerPhone: string;
  shippingAddress?: { street: string; city: string; state: string; postalCode: string; phone: string };
  pickupPoint?: { name: string; city: string; address: string };
  paymentMethod: string;
  paymentStatus: string;
  amountDue: number;
  items: { name: string; sku?: string; quantity: number; image?: string }[];
  fulfilment?: { packedAt?: string; packedBy?: string; dispatchedAt?: string };
  courierName?: string;
  trackingNumber?: string;
  notes?: string;
}

export interface StockRow {
  _id: string;
  name: string;
  sku?: string;
  image?: string;
  stock: number;
  lowStockThreshold: number;
  soldCount: number;
  isActive: boolean;
}

export interface StockMovement {
  _id: string;
  product: string;
  productName: string;
  delta: number;
  reason: string;
  note?: string;
  stockAfter: number;
  by: string;
  createdAt: string;
}

export const METRIC_LABEL: Record<IncentiveMetric, string> = {
  referral_sales: 'Sales from your referrals (Rs)',
  personal_sales: 'Your own orders (Rs)',
  new_referrals: 'New people you refer',
  commission: 'Commission earned (Rs)',
};

const d = <T>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

const crud = <T>(base: string) => ({
  list: () => d<T[]>(api.get(base)),
  create: (body: Partial<T>) => d<T>(api.post(base, body)),
  update: (id: string, body: Partial<T>) => d<T>(api.put(`${base}/${id}`, body)),
  remove: (id: string) => api.delete(`${base}/${id}`),
});

export const extrasApi = {
  activeCampaigns: () => d<Campaign[]>(api.get('/campaigns/active')),
  campaigns: crud<Campaign>('/campaigns'),
  incentives: { ...crud<Incentive>('/incentives'), mine: () => d<Incentive[]>(api.get('/incentives/mine')), leaders: (id: string) => d<{ _id: string; name: string; memberCode: string; progress: number; qualified: boolean }[]>(api.get(`/incentives/${id}/leaders`)) },
  trainings: { ...crud<Training>('/trainings'), mine: () => d<Training[]>(api.get('/trainings/mine')) },
  pickupPoints: { ...crud<PickupPoint>('/pickup-points'), all: () => d<PickupPoint[]>(api.get('/pickup-points/all')) },
  warehouse: {
    queue: (stage: string) => d<{ counts: { toPack: number }; orders: QueueOrder[] }>(api.get('/warehouse/queue', { params: { stage } })),
    pack: (id: string) => d(api.post(`/warehouse/orders/${id}/pack`, {})),
    dispatch: (id: string, body: { courierName: string; trackingNumber: string; trackingUrl?: string }) => d(api.post(`/warehouse/orders/${id}/dispatch`, body)),
    stock: () => d<StockRow[]>(api.get('/warehouse/stock')),
    adjust: (productId: string, body: { delta: number; reason: string; note?: string }) => d<StockMovement>(api.post(`/warehouse/stock/${productId}`, body)),
    movements: (product?: string) => d<StockMovement[]>(api.get('/warehouse/movements', { params: { product } })),
  },
  /** Download a CSV report with the signed-in admin's token. */
  downloadReport: async (kind: 'orders' | 'commissions' | 'members' | 'withdrawals', params?: Record<string, string>) => {
    const res = await api.get(`/reports/${kind}.csv`, { params, responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
