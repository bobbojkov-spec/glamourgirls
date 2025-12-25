'use client';

import { useState } from 'react';

interface ImageWithPlaceholderProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  onError?: () => void;
}

export default function ImageWithPlaceholder({
  src,
  alt,
  className = '',
  aspectRatio,
  width,
  height,
  loading = 'lazy',
  onError,
}: ImageWithPlaceholderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    backgroundColor: '#f3f4f6',
    ...(aspectRatio && { aspectRatio }),
    ...(width && { width: `${width}px` }),
    ...(height && { height: `${height}px` }),
    overflow: 'hidden',
  };

  return (
    <div style={containerStyle} className={className}>
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        </div>
      )}
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <span className="text-gray-400 text-xs">Failed to load</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
          style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.2s' }}
        />
      )}
    </div>
  );
}

