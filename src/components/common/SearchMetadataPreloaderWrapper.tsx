'use client';

import dynamic from 'next/dynamic';

// Wrapper component that handles dynamic import with ssr: false
// This can be safely imported in Server Components
const SearchMetadataPreloader = dynamic(
  () => import('./SearchMetadataPreloader'),
  { ssr: false }
);

export default function SearchMetadataPreloaderWrapper() {
  return <SearchMetadataPreloader />;
}

