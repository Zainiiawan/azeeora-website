import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-PK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

export function optimizeCloudinaryUrl(url: string, width = 800, square = false): string {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  
  // Cloudinary URLs look like:
  // https://res.cloudinary.com/<cloud_name>/image/upload/v1234567890/folder/image.png
  // We want to insert transformations after 'upload/'
  const parts = url.split('/upload/');
  if (parts.length === 2) {
    // f_auto: automatic format (WebP/AVIF)
    // q_auto: automatic quality
    // w_<width>: limit width to save bandwidth
    // c_pad,b_rgb:f4efe8,ar_4:5: pad packshots onto the ivory card colour in a 4:5 frame
    const crop = square ? ',c_pad,b_rgb:f4efe8,ar_4:5' : '';
    return `${parts[0]}/upload/f_auto,q_auto,w_${width}${crop}/${parts[1]}`;
  }
  return url;
}

export function getCloudinarySrcSet(url: string, widths = [300, 400, 500, 600, 800, 1000, 1200], square = false): string {
  if (!url || !url.includes('res.cloudinary.com')) return '';
  return widths.map((w) => `${optimizeCloudinaryUrl(url, w, square)} ${w}w`).join(', ');
}
/** "WHITENING CREAM" -> "Whitening Cream" for display; leaves mixed-case names alone. */
export function displayName(name?: string): string {
  if (!name) return '';
  if (name !== name.toUpperCase()) return name;
  return name.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}
