import { Suspense } from 'react';
import ConfirmationClient from './ConfirmationClient';

export default function ConfirmationPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmationClient />
    </Suspense>
  );
}

