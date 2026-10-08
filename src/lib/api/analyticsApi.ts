import { api } from './axios';

export interface DailyRevenue { day: string; orders: number; revenue: number; }
export interface CityBreakdown { city: string; orders: number; revenue: number; }

export interface AnalyticsSummary {
  revenue: number;
  paidOrders: number;
  customerCount: number;
  ordersByStatus: Record<string, number>;
  topProducts: Array<{
    _id: string; name: string; slug: string;
    soldCount: number; rating: number; reviewCount: number; basePrice: number;
  }>;
  lowStockCount: number;
  dailyRevenue: DailyRevenue[];
  cityBreakdown: CityBreakdown[];
}

export const analyticsApi = {
  getSummary: async (params?: { from?: string; to?: string }): Promise<AnalyticsSummary> => {
    const response = await api.get('/analytics/summary', { params });
    return response.data.data;
  },
};

// ---------------------------------------------------------------------------
export interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string;
  author?: string;
  categories: string[];
  tags: string[];
  isPublished: boolean;
  publishDate?: string;
  readingTime?: string;
  createdAt?: string;
}

export const blogApi = {
  list: async (params?: { limit?: number; category?: string }): Promise<BlogPost[]> => {
    const r = await api.get('/blog', { params });
    return r.data.data;
  },
  get: async (slug: string): Promise<BlogPost> => {
    const r = await api.get(`/blog/${slug}`);
    return r.data.data;
  },
  adminAll: async (): Promise<BlogPost[]> => {
    const r = await api.get('/blog/admin/all');
    return r.data.data;
  },
  create: async (body: Partial<BlogPost>): Promise<BlogPost> => {
    const r = await api.post('/blog', body);
    return r.data.data;
  },
  update: async (id: string, body: Partial<BlogPost>): Promise<BlogPost> => {
    const r = await api.put(`/blog/${id}`, body);
    return r.data.data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/blog/${id}`);
  },
};
