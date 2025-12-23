'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GirlForm from './GirlForm';

interface GirlEditFormProps {
  girl: any;
}

export default function GirlEditForm({ girl }: GirlEditFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSuccess = () => {
    const next = searchParams.get('next');
    router.push(next || '/admin/girls');
  };

  return (
    <GirlForm
      initialData={girl}
      onSuccess={handleSuccess}
      backHref={(() => {
        const next = searchParams.get('next');
        return next || '/admin/girls';
      })()}
      isSubmitting={isSubmitting}
      setIsSubmitting={setIsSubmitting}
    />
  );
}

