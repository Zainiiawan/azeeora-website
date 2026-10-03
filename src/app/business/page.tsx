import { Metadata } from 'next';
import BusinessClient from './BusinessClient';

export const metadata: Metadata = {
  title: 'Wholesale | Azeeora for Business',
  description: 'Wholesale prices on Azeeora skincare for salons, shops, pharmacies and distributors in Pakistan. Apply for a business account.',
};

export default function BusinessPage() {
  return <BusinessClient />;
}
