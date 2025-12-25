'use client';

import { useState } from 'react';

interface HeadshotImageProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  theirMan?: boolean;
  onLoad?: () => void;
}

export default function HeadshotImage({ src, alt, fallbackSrc, className, theirMan, onLoad }: HeadshotImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      // Use man placeholder for "their men", otherwise prefer provided fallback, then generic portrait.
      if (theirMan) {
        setImgSrc('/images/placeholder-man-portrait.png');
        return;
      }
      if (fallbackSrc) {
        setImgSrc(fallbackSrc);
        return;
      }
      setImgSrc('/images/placeholder-portrait.png');
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
      onLoad={onLoad}
      style={{ 
        maxWidth: '190px',
        maxHeight: '245px',
        width: 'auto',
        height: 'auto',
        objectFit: 'contain',
      }}
    />
  );
}
