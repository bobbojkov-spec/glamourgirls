'use client';

import { useState, useEffect } from 'react';
import HeadshotImage from '@/components/actress/HeadshotImage';

interface SparkleFrameProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
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

export default function SparkleFrame({ src, alt, fallbackSrc, className = '' }: SparkleFrameProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  // Generate sparkles - mostly outside the frame for glow effect
  useEffect(() => {
    const baseCount = 12;
    const hoverCount = 30;
    const count = isHovered ? hoverCount : baseCount;

    const newSparkles: Sparkle[] = [];
    for (let i = 0; i < count; i++) {
      // Position sparkles mostly outside the frame (80% outside, 20% inside)
      // Overlay extends 30px beyond frame, so we calculate relative to extended area
      const isOutside = Math.random() > 0.2;
      let x, y;
      
      if (isOutside) {
        // Position outside frame boundaries - calculate relative to extended overlay
        // Frame is roughly 100% of base, overlay extends to ~120% (30px extension on each side)
        const edge = Math.random();
        if (edge < 0.25) {
          // Top edge - above frame
          x = 20 + Math.random() * 60; // 20% to 80% (frame area)
          y = -5 - Math.random() * 10; // -5% to -15% (above frame)
        } else if (edge < 0.5) {
          // Right edge - to the right of frame
          x = 85 + Math.random() * 15; // 85% to 100%+ (right of frame)
          y = 20 + Math.random() * 60; // 20% to 80% (frame area)
        } else if (edge < 0.75) {
          // Bottom edge - below frame
          x = 20 + Math.random() * 60; // 20% to 80% (frame area)
          y = 85 + Math.random() * 15; // 85% to 100%+ (below frame)
        } else {
          // Left edge - to the left of frame
          x = -5 - Math.random() * 10; // -5% to -15% (left of frame)
          y = 20 + Math.random() * 60; // 20% to 80% (frame area)
        }
      } else {
        // Some sparkles inside the frame (20% of them)
        x = 25 + Math.random() * 50; // 25% to 75% (inside frame)
        y = 25 + Math.random() * 50;
      }
      
      newSparkles.push({
        id: i,
        x,
        y,
        size: Math.random() * 3 + 1.5, // 1.5-4.5px
        delay: Math.random() * 3,
        duration: Math.random() * 3 + 2, // 2-5s
        driftX: (Math.random() - 0.5) * 25, // -12.5px to +12.5px drift
        driftY: (Math.random() - 0.5) * 25,
      });
    }
    setSparkles(newSparkles);
  }, [isHovered]);

  return (
    <div
      className={`sparkle-frame-wrapper ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image container - base layer */}
      <div className="sparkle-frame-image-container">
        <HeadshotImage
          src={src}
          alt={alt}
          fallbackSrc={fallbackSrc}
          className="sparkle-frame-image"
        />
      </div>

      {/* Frame - positioned on top, larger with gap */}
      <div className="sparkle-frame"></div>

      {/* Sparkle overlay */}
      <div className="sparkle-overlay">
        {sparkles.map((sparkle) => {
          return (
            <div
              key={sparkle.id}
              className="sparkle"
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
          );
        })}
      </div>

      <style jsx>{`
        .sparkle-frame-wrapper {
          display: inline-block;
          position: relative;
          padding: 20px;
        }

        /* Image container - base layer */
        .sparkle-frame-image-container {
          position: relative;
          border-radius: 22px;
          overflow: hidden;
          background: #f8f8f8;
          z-index: 1;
        }

        .sparkle-frame-image {
          display: block;
          width: 100%;
          height: auto;
          border-radius: 22px;
        }

        /* Frame - positioned on top, larger with 5-10px gap, tilted 10deg */
        .sparkle-frame {
          position: absolute;
          /* Frame extends 5-10px beyond image on each side (irregular) */
          top: -7px;
          left: -5px;
          right: -6px;
          bottom: -9px;
          /* White frame */
          background: white;
          border-radius: 30px;
          box-shadow: 
            0 2px 8px rgba(0, 0, 0, 0.08),
            0 4px 12px rgba(0, 0, 0, 0.06);
          /* Tilted 10 degrees, positioned on top */
          transform: rotate(10deg);
          z-index: 2;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          /* Allow slight overlap */
          pointer-events: none;
        }

        /* Create transparent gap using mask - cut out center rectangle */
        .sparkle-frame::before {
          content: '';
          position: absolute;
          /* Irregular gap: 5-10px on each side */
          top: 7px;
          left: 5px;
          right: 6px;
          bottom: 9px;
          background: black;
          border-radius: 22px;
          /* Use mask to cut out this area from parent */
          mask: linear-gradient(black, black);
          -webkit-mask: linear-gradient(black, black);
          mix-blend-mode: destination-out;
        }

        .sparkle-frame-wrapper:hover .sparkle-frame {
          box-shadow: 
            0 3px 10px rgba(0, 0, 0, 0.1),
            0 6px 16px rgba(0, 0, 0, 0.08);
          transform: rotate(9deg) scale(1.01);
        }

        /* Sparkle overlay - on top of everything */
        .sparkle-overlay {
          position: absolute;
          /* Extend overlay beyond frame to show sparkles outside */
          top: -30px;
          left: -30px;
          right: -30px;
          bottom: -30px;
          pointer-events: none;
          z-index: 10;
          overflow: visible;
        }

        .sparkle {
          position: absolute;
          background: white;
          border-radius: 50%;
          box-shadow: 
            0 0 4px rgba(255, 255, 255, 0.9),
            0 0 8px rgba(255, 255, 255, 0.7),
            0 0 12px rgba(255, 255, 255, 0.5);
          animation: sparkle-twinkle infinite;
          opacity: 0;
        }

        @keyframes sparkle-twinkle {
          0% {
            opacity: 0;
            transform: scale(0.3) translate(0, 0);
          }
          20% {
            opacity: 0.8;
            transform: scale(1) translate(var(--drift-x, 0), var(--drift-y, 0));
          }
          50% {
            opacity: 1;
            transform: scale(1.2) translate(calc(var(--drift-x, 0) * 1.5), calc(var(--drift-y, 0) * 1.5));
          }
          80% {
            opacity: 0.6;
            transform: scale(0.9) translate(calc(var(--drift-x, 0) * 2), calc(var(--drift-y, 0) * 2));
          }
          100% {
            opacity: 0;
            transform: scale(0.3) translate(calc(var(--drift-x, 0) * 2.5), calc(var(--drift-y, 0) * 2.5));
          }
        }

        /* Sparkle variations for different effects */
        .sparkle:nth-child(4n) {
          background: rgba(255, 255, 220, 0.95);
          box-shadow: 
            0 0 5px rgba(255, 255, 220, 1),
            0 0 10px rgba(255, 255, 220, 0.8),
            0 0 15px rgba(255, 255, 220, 0.6);
        }

        .sparkle:nth-child(4n+1) {
          background: rgba(255, 255, 255, 1);
          box-shadow: 
            0 0 3px rgba(255, 255, 255, 1),
            0 0 6px rgba(255, 255, 255, 0.9),
            0 0 9px rgba(255, 255, 255, 0.7);
        }

        .sparkle:nth-child(4n+2) {
          background: rgba(255, 250, 245, 0.95);
          box-shadow: 
            0 0 4px rgba(255, 250, 245, 1),
            0 0 8px rgba(255, 250, 245, 0.8);
        }

        .sparkle:nth-child(4n+3) {
          background: rgba(255, 255, 240, 0.9);
          box-shadow: 
            0 0 6px rgba(255, 255, 240, 0.9),
            0 0 12px rgba(255, 255, 240, 0.7);
        }
      `}</style>
    </div>
  );
}

