'use client';

import { useState } from 'react';
import { GalleryImage } from '@/components/gallery/GalleryGrid';
import Lightbox from '@/components/gallery/Lightbox';

interface HeroGalleryButtonProps {
  galleryImages: GalleryImage[];
  actressId: string;
  actressName: string;
  actressSlug: string;
}

export default function HeroGalleryButton({ galleryImages, actressId, actressName, actressSlug }: HeroGalleryButtonProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const openGalleryImage = (index: number) => {
    if (galleryImages.length > 0) {
      setSelectedIndex(index);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < galleryImages.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    } else if (selectedIndex !== null) {
      setSelectedIndex(0);
    }
  };

  const handlePrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    } else if (selectedIndex !== null) {
      setSelectedIndex(galleryImages.length - 1);
    }
  };

  const handleClose = () => {
    setSelectedIndex(null);
  };

  if (galleryImages.length === 0) {
    return null;
  }

  return (
    <>
      <button
        className="interactive-button w-full sm:w-auto sm:mt-8 inline-flex items-center justify-center rounded-lg py-2.5 sm:py-3 text-sm font-medium tracking-wide uppercase text-[var(--text-primary)] relative overflow-hidden group"
        style={{
          backgroundColor: '#fef9eb',
          border: '1px solid #6f5718',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
          fontFamily: 'DM Sans, sans-serif',
          paddingLeft: '22px', // 30% less than 32px (px-8)
          paddingRight: '22px', // 30% less than 32px (px-8)
        }}
        onClick={() => openGalleryImage(0)}
        onMouseEnter={(e) => {
          if (window.innerWidth >= 768) {
            e.currentTarget.style.backgroundColor = '#fff5e1';
            e.currentTarget.style.borderColor = '#8b6f2a';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#fef9eb';
          e.currentTarget.style.borderColor = '#6f5718';
        }}
      >
        <span className="relative z-10 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="group-hover:scale-110 transition-transform duration-300 flex-shrink-0"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span className="hidden sm:inline">View Photo Archive</span>
          <span className="sm:hidden">PHOTOS</span>
        </span>
        <div 
          className="absolute inset-0 bg-gradient-to-r from-[#1890ff]/20 via-[#1890ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
      </button>

      {selectedIndex !== null && galleryImages[selectedIndex] && (
        <Lightbox
          image={galleryImages[selectedIndex]}
          images={galleryImages}
          currentIndex={selectedIndex}
          actressId={actressId}
          actressName={actressName}
          actressSlug={actressSlug}
          onNext={handleNext}
          onPrev={handlePrev}
          onClose={handleClose}
        />
      )}
    </>
  );
}

