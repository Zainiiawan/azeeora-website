import { Router, json, authenticate, requireEmailVerification, adminOnly, rateLimit, BadRequestError, Ctx } from '../http';
import { getCloudinary, hasRealCloudinary } from '../cloudinary';
import { IMAGE_FORMATS, VIDEO_FORMATS, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE } from '../shared';
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

async function uploadToCloudinary(file: File, useModeration: boolean) {
  if (!hasRealCloudinary()) {
    throw new BadRequestError('Image upload requires Cloudinary. Configure CLOUDINARY_* env vars.');
  }
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
  for (const file of files) data.push(await uploadToCloudinary(file, false));
  return json({ success: true, message: 'Upload successful', data }, 201);
});

media.post('/upload/public', uploadLimiter, async (ctx) => {
  const files = await readFiles(ctx, 5);
  const data = [];
  for (const file of files) data.push(await uploadToCloudinary(file, true));
  return json({ success: true, message: 'Upload successful', data }, 201);
});

media.get('/smtp-status', adminOnly, async () => {
  const result = await testSmtpConnection();
  return json({ success: result.ok, message: result.message, data: result });
});
