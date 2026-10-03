import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AZEEORA COSMETICS',
    short_name: 'AZEEORA',
    description: 'Premium luxury cosmetics curated for the modern woman.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9f0f3',
    theme_color: '#f9f0f3',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
