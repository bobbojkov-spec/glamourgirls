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

  // Debug: Log what we receive from server
  console.log('[GirlEditForm] Received girl prop:', {
    hasGirl: !!girl,
    hasTimeline: !!girl?.timeline,
    timelineType: typeof girl?.timeline,
    timelineIsArray: Array.isArray(girl?.timeline),
    timelineLength: Array.isArray(girl?.timeline) ? girl.timeline.length : 'N/A',
  });
  
  if (girl?.timeline) {
    console.log('[GirlEditForm] Timeline data:', JSON.stringify(girl.timeline, null, 2));
  }

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

