import jwt from 'jsonwebtoken';
import crypto from 'crypto';

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  type: string;
}

const accessSecret = () => process.env.JWT_ACCESS_SECRET || 'fallback_secret';
const refreshSecret = () => process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';

export const generateAccessToken = (payload: Omit<TokenPayload, 'type'>): string =>
  jwt.sign({ ...payload, type: 'access' }, accessSecret(), {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  } as jwt.SignOptions);

export const generateRefreshToken = (payload: Omit<TokenPayload, 'type'>): string =>
  jwt.sign({ ...payload, type: 'refresh' }, refreshSecret(), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  } as jwt.SignOptions);

export const verifyAccessToken = (token: string): TokenPayload => jwt.verify(token, accessSecret()) as TokenPayload;

export const verifyRefreshToken = (token: string): TokenPayload => jwt.verify(token, refreshSecret()) as TokenPayload;

export const generateRandomToken = (bytes = 32): string => crypto.randomBytes(bytes).toString('hex');

export const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

export const generateTokenPair = (payload: Omit<TokenPayload, 'type'>) => ({
  accessToken: generateAccessToken(payload),
  refreshToken: generateRefreshToken(payload),
});
