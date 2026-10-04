import { Router, json, authenticate, requireEmailVerification, adminOnly, rateLimit, BadRequestError, UnauthorizedError, ForbiddenError, resolveUser, Ctx } from '../http';
import { put } from '@vercel/blob';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getCloudinary, hasRealCloudinary } from '../cloudinary';
import { IMAGE_FORMATS, VIDEO_FORMATS, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE } from '@/shared';
import { testSmtpConnection } from '../email';

export const media = new Router();

const uploadLimiter = rateLimit('upload', 60 * 60 * 1000, 50, 'Too many requests. Please try again later.');

async function readFiles(ctx: Ctx, max: number): Promise<File[]> {
  let form: FormData;
  try {
    form = await ctx.req.formData();
  } catch {
    throw new BadRequestError('No files uploaded');
  }
  const files = form.getAll('files').filter((f): f is File => typeof f === 'object' && 'arrayBuffer' in f);
  if (!files.length) throw new BadRequestError('No files uploaded');
  if (files.length > max) throw new BadRequestError(`You can upload at most ${max} files at once`);

  for (const file of files) {
    const isImage = (IMAGE_FORMATS as readonly string[]).includes(file.type);
    const isVideo = (VIDEO_FORMATS as readonly string[]).includes(file.type);
    if (!isImage && !isVideo) throw new BadRequestError('Invalid file type. Only images and videos are allowed.');
    if (file.size > (isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE)) throw new BadRequestError('File is too large');
  }
  return files;
}

// Vercel Blob (BLOB_READ_WRITE_TOKEN) is the default store; Cloudinary is used
// instead when its keys are set.
async function uploadToBlob(file: File) {
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '') || 'file';
  const blob = await put(`azeeora-cosmetics/${safeName}`, file, {
    access: 'public',
    addRandomSuffix: true,
    contentType: file.type,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
  return { url: blob.url, publicId: `blob:${blob.pathname}`, alt: file.name };
}

async function uploadFile(file: File, useModeration: boolean) {
  if (hasRealCloudinary()) return uploadToCloudinary(file, useModeration);
  if (process.env.BLOB_READ_WRITE_TOKEN) return uploadToBlob(file);
  throw new BadRequestError('File uploads are not configured. Set BLOB_READ_WRITE_TOKEN or CLOUDINARY_* env vars.');
}

async function uploadToCloudinary(file: File, useModeration: boolean) {
  const cloudinary = getCloudinary();
  const isVideo = (VIDEO_FORMATS as readonly string[]).includes(file.type);
  const options: Record<string, unknown> = { folder: 'azeeora-cosmetics', resource_type: isVideo ? 'video' : 'image' };
  if (useModeration) options.moderation = 'aws_rek';

  const buffer = Buffer.from(await file.arrayBuffer());
  const result: any = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, res) =>
      err || !res ? reject(err || new Error('Cloudinary upload failed')) : resolve(res)
    );
    stream.end(buffer);
  });

  const status = result.moderation?.[0]?.status ?? 'approved';
  if (status === 'rejected') {
    cloudinary.uploader.destroy(result.public_id).catch(() => {});
    throw new BadRequestError(
      'Your review could not be submitted because one or more attached files violate our community guidelines.'
    );
  }
  return { url: result.secure_url as string, publicId: result.public_id as string, alt: file.name };
}

media.post('/upload', authenticate, requireEmailVerification, uploadLimiter, async (ctx) => {
  const files = await readFiles(ctx, 8);
  const data = [];
  for (const file of files) data.push(await uploadFile(file, false));
  return json({ success: true, message: 'Upload successful', data }, 201);
});

// Direct browser -> Vercel Blob uploads. The file never passes through this
// function, so Vercel's ~4.5 MB request limit does not apply (videos up to
// MAX_VIDEO_SIZE). Only signed-in, verified users get an upload token.
media.post('/blob', async (ctx) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new BadRequestError('Direct uploads are not configured');
  const body = ctx.body as HandleUploadBody;
  const result = await handleUpload({
    body,
    request: ctx.req,
    onBeforeGenerateToken: async (pathname) => {
      const user = await resolveUser(ctx);
      if (!user) throw new UnauthorizedError('Authentication required. Please log in.');
      if (!user.isEmailVerified) throw new ForbiddenError('Please verify your email address to continue.');
      if (!pathname.startsWith('azeeora-cosmetics/')) throw new BadRequestError('Invalid upload path');
      return {
        allowedContentTypes: [...IMAGE_FORMATS, ...VIDEO_FORMATS],
        maximumSizeInBytes: MAX_VIDEO_SIZE,
        addRandomSuffix: true,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      };
    },
    onUploadCompleted: async () => {},
  });
  return json(result);
});

media.post('/upload/public', uploadLimiter, async (ctx) => {
  const files = await readFiles(ctx, 5);
  const data = [];
  for (const file of files) data.push(await uploadFile(file, true));
  return json({ success: true, message: 'Upload successful', data }, 201);
});

media.get('/smtp-status', adminOnly, async () => {
  const result = await testSmtpConnection();
  return json({ success: result.ok, message: result.message, data: result });
});
