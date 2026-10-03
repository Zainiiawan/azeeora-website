// ==========================================
// API Response Types
// ==========================================

export interface IApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: IValidationError[];
}

export interface IValidationError {
  field: string;
  message: string;
}

export interface IPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface IPaginatedResponse<T> {
  items: T[];
  pagination: IPagination;
}

export interface IApiError {
  statusCode: number;
  message: string;
  errors?: IValidationError[];
}
