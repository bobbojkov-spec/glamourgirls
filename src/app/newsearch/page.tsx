import { Suspense } from 'react';
import NewSearchClient from './NewSearchClient';

export default function NewSearchPage() {
  return (
    <Suspense fallback={null}>
      <NewSearchClient />
    </Suspense>
  );
}
