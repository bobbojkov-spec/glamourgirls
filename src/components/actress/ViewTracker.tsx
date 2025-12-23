'use client';

import { useEffect } from 'react';

interface ViewTrackerProps {
  actressId: string;
}

export default function ViewTracker({ actressId }: ViewTrackerProps) {
  useEffect(() => {
    // Track view when component mounts
    fetch(`/api/actresses/${actressId}/track-view`, {
      method: 'POST',
    }).catch(error => {
      // Silently fail - don't interrupt user experience
      console.error('Failed to track view:', error);
    });
  }, [actressId]);

  return null; // This component doesn't render anything
}

