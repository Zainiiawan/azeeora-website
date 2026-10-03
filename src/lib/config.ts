export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'AYEZA COSMETICS',
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  getBaseUrl: () => {
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:3000';
    }
    return 'https://ayezacosmetics.store';
  }
};

export const isDev = process.env.NODE_ENV === 'development';
export const isProd = process.env.NODE_ENV === 'production';

export const getBaseUrl = config.getBaseUrl;