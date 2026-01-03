'use client';

import { useEffect, useMemo, useState } from 'react';

interface HeadshotImageProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  theirMan?: boolean;
  onLoad?: () => void;
  priority?: boolean;
  width?: number;
  height?: number;
  version?: string;
}

const appendHeadshotVersion = (src: string, version?: string) => {
  if (!version) return src;
  if (!src.includes('/api/actresses/') || !src.includes('/headshot')) return src;
  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}v=${encodeURIComponent(version)}`;
};

export default function HeadshotImage({
  src,
  alt,
  fallbackSrc,
  className,
  theirMan,
  onLoad,
  priority = false,
  width,
  height,
  version,
}: HeadshotImageProps) {
  const versionedSrc = useMemo(() => appendHeadshotVersion(src, version), [src, version]);
  const [imgSrc, setImgSrc] = useState(versionedSrc);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    setImgSrc(versionedSrc);
  }, [versionedSrc]);

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
