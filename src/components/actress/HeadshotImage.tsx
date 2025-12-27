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
    <div
      className="relative w-full h-full"
      style={{
        backgroundColor: '#f6e5c0', // Beige background to prevent white flash
        minHeight: '100%',
        minWidth: '100%',
      }}
    >
      <img
        src={imgSrc}
        alt={alt}
        className={className}
        onError={handleError}
        onLoad={onLoad}
        style={{ 
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </div>
  );
}
