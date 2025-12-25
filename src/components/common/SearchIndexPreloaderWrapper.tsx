'use client';

import dynamic from 'next/dynamic';

// Wrapper component that handles dynamic import with ssr: false
// This can be safely imported in Server Components
const SearchIndexPreloader = dynamic(
  () => import('./SearchIndexPreloader'),
  { ssr: false }
);

export default function SearchIndexPreloaderWrapper() {
  return <SearchIndexPreloader />;
}

