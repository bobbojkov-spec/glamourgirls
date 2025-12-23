'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PhotoFrame from '../ui/PhotoFrame';
import HeadshotImage from './HeadshotImage';

interface ActressInfoCardProps {
  id: string;
  name: string;
  photoUrl: string;
  photoCount?: number;
  slug?: string;
}

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  driftX: number;
  driftY: number;
}

export default function ActressInfoCard({ 
  id, 
  name, 
  photoUrl,
  photoCount = 0,
  slug
}: ActressInfoCardProps) {
  const isHeadshot = photoUrl.includes('/headshot');
  const firstGalleryImage = !isHeadshot ? photoUrl : undefined;
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [imageLoaded, setImageLoaded] = useState(!isHeadshot); // Non-headshots load immediately

  // Generate sparkles for headshot frames
  useEffect(() => {
    if (!isHeadshot) return;

    const count = 8;
    const newSparkles: Sparkle[] = [];
    for (let i = 0; i < count; i++) {
      // Position sparkles around the frame border and slightly over the image
      const edge = Math.random();
      let x, y;
      
      if (edge < 0.3) {
        // Around frame edges (outside)
        const side = Math.random();
        if (side < 0.25) {
          // Top edge
          x = Math.random() * 100;
          y = -5 - Math.random() * 5; // -5% to -10%
        } else if (side < 0.5) {
          // Right edge
          x = 100 + Math.random() * 5; // 100% to 105%
          y = Math.random() * 100;
        } else if (side < 0.75) {
          // Bottom edge
          x = Math.random() * 100;
          y = 100 + Math.random() * 5; // 100% to 105%
        } else {
          // Left edge
          x = -5 - Math.random() * 5; // -5% to -10%
          y = Math.random() * 100;
        }
      } else {
        // Some sparkles over the image (30% of them)
        x = 20 + Math.random() * 60; // 20% to 80% (inside image area)
        y = 20 + Math.random() * 60;
      }
      
      newSparkles.push({
        id: i,
        x,
        y,
        size: Math.random() * 2.5 + 1.5, // 1.5-4px
        delay: Math.random() * 3,
        duration: Math.random() * 3 + 2, // 2-5s
        driftX: (Math.random() - 0.5) * 20,
        driftY: (Math.random() - 0.5) * 20,
      });
    }
    setSparkles(newSparkles);
  }, [isHeadshot]);

  // Don't render anything until headshot is loaded
  if (isHeadshot && !imageLoaded) {
    return (
      <div className="actress-info-card text-center" style={{ visibility: 'hidden', height: 0 }}>
        <HeadshotImage
          src={photoUrl}
          alt={name}
          fallbackSrc={firstGalleryImage}
          className="block"
          onLoad={() => setImageLoaded(true)}
        />
      </div>
    );
  }

  return (
    <div className="actress-info-card text-center">
      {/* Portrait photo with frame */}
      {isHeadshot ? (
        <div className="photo-frame photo-frame-thick photo-frame-portrait mx-auto photo-frame-with-sparkles" style={{ width: 'fit-content', position: 'relative' }}>
          <HeadshotImage
            src={photoUrl}
            alt={name}
            fallbackSrc={firstGalleryImage}
            className="block"
            onLoad={() => setImageLoaded(true)}
          />
          {/* Sparkle overlay */}
          {sparkles.length > 0 && (
            <div className="photo-frame-sparkle-overlay">
              {sparkles.map((sparkle) => (
                <div
                  key={sparkle.id}
                  className="photo-frame-sparkle"
                  style={{
                    left: `${sparkle.x}%`,
                    top: `${sparkle.y}%`,
                    width: `${sparkle.size}px`,
                    height: `${sparkle.size}px`,
                    animationDelay: `${sparkle.delay}s`,
                    animationDuration: `${sparkle.duration}s`,
                    '--drift-x': `${sparkle.driftX}px`,
                    '--drift-y': `${sparkle.driftY}px`,
                  } as React.CSSProperties & { '--drift-x': string; '--drift-y': string }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <PhotoFrame
          src={photoUrl}
          alt={name}
          width={250}
          height={320}
          polaroid
          thick
          className="mx-auto"
        />
      )}

      {/* Photo gallery link */}
      {photoCount > 0 && (
        <Link 
          href={slug ? `/actress/${id}/${slug}/gallery` : `/actress/${id}/gallery`}
          className="inline-flex items-center gap-2 mt-4 text-sm hover:text-[#8b0000] transition-colors"
        >
          <span className="text-lg">📁</span>
          <span>photo gallery</span>
        </Link>
      )}
    </div>
  );
}


