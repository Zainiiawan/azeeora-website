import { Metadata } from 'next';
import CatalogueClient from './CatalogueClient';

export const metadata: Metadata = {
  title: 'Catalogue | Azeeora',
  description: 'The current Azeeora catalogue: this season’s offers on skincare, with every product and price in one place.',
};

export default function CataloguePage() {
  return <CatalogueClient />;
}
