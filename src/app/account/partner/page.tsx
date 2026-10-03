import { Suspense } from 'react';
import PartnerDashboard from './PartnerDashboard';

export const metadata = { title: 'Partner dashboard | Azeeora' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PartnerDashboard />
    </Suspense>
  );
}
