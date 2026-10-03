import { upload as blobUpload } from '@vercel/blob/client';
import { api } from './axios';
import { config } from '@/lib/config';

const safeName = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '') || 'file';

/** Upload straight from the browser to Vercel Blob (no size cap from the API). */
async function directUpload(file: File): Promise<UploadedFile> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const blob = await blobUpload(`azeeora-cosmetics/${safeName(file.name)}`, file, {
    access: 'public',
    handleUploadUrl: `${config.apiUrl}/media/blob`,
    contentType: file.type,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return { url: blob.url, publicId: `blob:${blob.pathname}`, alt: file.name };
}

export interface UploadedFile {
  url: string;
  publicId: string;
  alt?: string;
}

export interface SmtpStatus {
  ok: boolean;
  message: string;
  host?: string;
  port?: number;
  user?: string;
}

export const mediaApi = {
  upload: async (files: File[]): Promise<UploadedFile[]> => {
    try {
      const out: UploadedFile[] = [];
      for (const file of files) out.push(await directUpload(file));
      return out;
    } catch (err) {
      // direct uploads unavailable (e.g. Cloudinary-only setup): go through the API
      if (process.env.NODE_ENV !== 'production') console.warn('Direct upload failed, using API upload', err);
    }
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    const response = await api.post('/media/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  uploadPublic: async (files: File[]): Promise<UploadedFile[]> => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    const response = await api.post('/media/upload/public', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  getSmtpStatus: async (): Promise<SmtpStatus> => {
    const response = await api.get('/media/smtp-status');
    return response.data.data;
  },
};
