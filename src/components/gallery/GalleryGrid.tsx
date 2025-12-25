'use client';

import { useState } from 'react';
import GalleryItem from './GalleryItem';
import Lightbox from './Lightbox';

export interface GalleryImage {
  id: string;
  thumbnailUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  price?: number;
  hasHQ: boolean;
  hqWidth?: number;
  hqHeight?: number;
  hqUrl?: string;
  fileSizeMB?: number;
}

interface GalleryGridProps {
  images: GalleryImage[];
  actressId: string;
  actressName: string;
  theirMan?: boolean;
}

export default function GalleryGrid({ images, actressId, actressName, theirMan }: GalleryGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleImageClick = (image: GalleryImage) => {
    const index = images.findIndex(img => img.id === image.id);
    setSelectedIndex(index >= 0 ? index : null);
  };

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < images.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    } else if (selectedIndex !== null) {
      // Loop to first image
      setSelectedIndex(0);
    }
  };

  const handlePrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    } else if (selectedIndex !== null) {
      // Loop to last image
      setSelectedIndex(images.length - 1);
    }
  };

  const handleClose = () => {
    setSelectedIndex(null);
  };

  return (
    <>
      {/* Grid */}
      <div className="gallery-grid">
        {images.map((image) => (
          <GalleryItem
            key={image.id}
            image={image}
            onClick={() => handleImageClick(image)}
            theirMan={theirMan}
          />
        ))}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && images[selectedIndex] && (
        <Lightbox
          image={images[selectedIndex]}
          images={images}
          currentIndex={selectedIndex}
          actressId={actressId}
          actressName={actressName}
          onNext={handleNext}
          onPrev={handlePrev}
          onClose={handleClose}
        />
      )}
    </>
  );
}


