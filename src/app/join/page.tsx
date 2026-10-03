import { Metadata } from 'next';
import { Suspense } from 'react';
import JoinClient from './JoinClient';

export const metadata: Metadata = {
  title: 'Join Azeeora | Become a Brand Partner',
  description:
    'Become an Azeeora Brand Partner. Free to join: earn commission on every order from people you refer and save on your own orders. Paid to your wallet, withdraw to bank, JazzCash or Easypaisa.',
};

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinClient />
    </Suspense>
  );
}
