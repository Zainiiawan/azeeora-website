import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import { authApi } from '@/lib/api/authApi';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'admin' | 'warehouse';
  isEmailVerified: boolean;
  avatar?: string;
  phone?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;
}

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const axiosError = error as AxiosError<{ message?: string; errors?: Array<{ message: string }> }>;
  const data = axiosError?.response?.data;
  if (data?.errors?.length) {
    return data.errors.map((e) => e.message).join('. ');
  }
  if (data?.message) return data.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const saveTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }
};

const clearTokens = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};

const getInitialAccessToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
};

const getInitialRefreshToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('refreshToken');
  }
  return null;
};

const initialState: AuthState = {
  user: null,
  accessToken: getInitialAccessToken(),
  refreshToken: getInitialRefreshToken(),
  isAuthenticated: false,
  isLoading: false,
  isHydrated: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      return await authApi.login(credentials);
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Login failed. Please try again.'));
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (
    data: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      confirmPassword: string;
      phone?: string;
      cnic: string;
      refCode?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await authApi.register(data);
      return response;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Registration failed. Please try again.'));
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout();
  } catch {
    // Always clear local session even if API logout fails
  }
});

export const refreshTokens = createAsyncThunk('auth/refreshTokens', async () => {
  const response = await authApi.refreshTokens();
  return response;
});

export const fetchCurrentUser = createAsyncThunk('auth/fetchCurrentUser', async () => {
  const response = await authApi.getCurrentUser();
  return response;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; accessToken: string; refreshToken: string }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      saveTokens(action.payload.accessToken, action.payload.refreshToken);
    },
    clearCredentials: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      clearTokens();
    },
    setHydrated: (state) => {
      state.isHydrated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isHydrated = true;
        if (!action.payload?.tokens) {
          state.error = 'Login failed. Please try again.';
          return;
        }
        state.user = action.payload.user;
        state.accessToken = action.payload.tokens.accessToken;
        state.refreshToken = action.payload.tokens.refreshToken;
        state.isAuthenticated = true;
        saveTokens(action.payload.tokens.accessToken, action.payload.tokens.refreshToken);
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = (action.payload as string) || action.error.message || 'Login failed';
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.tokens) {
          state.user = action.payload.user;
          state.accessToken = action.payload.tokens.accessToken;
          state.refreshToken = action.payload.tokens.refreshToken;
          state.isAuthenticated = true;
          saveTokens(action.payload.tokens.accessToken, action.payload.tokens.refreshToken);
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || action.error.message || 'Registration failed';
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        clearTokens();
      })
      .addCase(refreshTokens.fulfilled, (state, action) => {
        state.accessToken = action.payload.tokens!.accessToken;
        state.refreshToken = action.payload.tokens!.refreshToken;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        saveTokens(action.payload.tokens!.accessToken, action.payload.tokens!.refreshToken);
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        if (!action.payload) {
          state.user = null;
          state.isAuthenticated = false;
          state.accessToken = null;
          state.refreshToken = null;
          clearTokens();
          return;
        }
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.accessToken = null;
        state.refreshToken = null;
        clearTokens();
      });
  },
});

export const { clearError, setCredentials, clearCredentials, setHydrated } = authSlice.actions;
export default authSlice.reducer;
