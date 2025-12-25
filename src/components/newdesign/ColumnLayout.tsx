'use client';

import { useEffect, useMemo, useState } from 'react';
import ActressFinder from './ActressFinder';
import FeaturedActressesGrid from './FeaturedActressesGrid';
import DecadesShowcase from './DecadesShowcase';
import PhotoArchiveTeaser from './PhotoArchiveTeaser';
import LatestAdditions from './LatestAdditions';
import TheirMen from './LatestFilms';

type LayoutMode = 'desktop' | 'tablet' | 'mobile';

interface ActressData {
  id: string;
  name: string;
  slug?: string;
  decade: string;
  imageUrl: string;
  era?: string;
}

interface ColumnLayoutProps {
  featuredData: ActressData[];
  decadesData: ActressData[];
  photoArchive: string[];
  latestData: ActressData[];
}

// This page uses explicit column stacks. Do NOT auto-flow sections.
export default function ColumnLayout({
  featuredData,
  decadesData,
  photoArchive,
  latestData,
}: ColumnLayoutProps) {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('desktop');

  useEffect(() => {
    const determineMode = () => {
      const width = window.innerWidth;
      if (width < 768) {
        console.log('Layout mode:', 'mobile');
        setLayoutMode('mobile');
      } else if (width < 1000) {
        console.log('Layout mode:', 'tablet');
        setLayoutMode('tablet');
      } else {
        console.log('Layout mode:', 'desktop');
        setLayoutMode('desktop');
      }
    };

    determineMode();
    window.addEventListener('resize', determineMode);
    return () => window.removeEventListener('resize', determineMode);
  }, []);

  const featuredItems = useMemo(() => selectFeaturedItems(layoutMode, featuredData), [layoutMode, featuredData]);
  const decadesItems = useMemo(() => selectDecadeItems(layoutMode, decadesData), [layoutMode, decadesData]);
  const archiveItems = useMemo(() => selectArchiveItems(layoutMode, photoArchive), [layoutMode, photoArchive]);
  const latestItems = useMemo(() => selectFeaturedItems(layoutMode, latestData), [layoutMode, latestData]);

  const featuredColumns = layoutMode === 'desktop' ? 2 : 3;
  const decadesColumns = layoutMode === 'tablet' ? 4 : 2;

  const featuredSection =
    featuredItems.length > 0 ? (
      <FeaturedActressesGrid
        actresses={featuredItems}
        columns={featuredColumns}
        eyebrow="Spotlight"
      />
    ) : null;

  const decadesSection =
    decadesItems.length > 0 ? (
      <DecadesShowcase actresses={decadesItems} columns={decadesColumns} />
    ) : null;

  const archiveSection =
    archiveItems.length > 0 ? (
      <PhotoArchiveTeaser
        photos={archiveItems}
        layout="card"
        eyebrow="Photo archive"
        description="Rare studio portraits and restored publicity stills preserved for collectors."
        buttonLabel="Browse photo archive"
      />
    ) : null;

  const latestSection =
    latestItems.length > 0 ? (
      <LatestAdditions
        actresses={latestItems.map((item) => ({ ...item, era: item.era || item.decade }))}
        variant="grid"
        layout="card"
        columns={featuredColumns}
      />
    ) : null;

  const theirMenSection = <TheirMen />;

  if (layoutMode === 'mobile') {
    return (
      <div className="columns-mobile">
        <div className="content-column">
          <ActressFinder />
          {featuredSection}
          {decadesSection}
          {archiveSection}
          {theirMenSection}
          {latestSection}
        </div>
      </div>
    );
  }

  if (layoutMode === 'tablet') {
    return (
      <div className="columns-tablet">
        <div className="content-column">
          <ActressFinder />
          {decadesSection}
          {featuredSection}
        </div>
        <div className="content-column">
          {archiveSection}
          {theirMenSection}
          {latestSection}
        </div>
      </div>
    );
  }

  return (
    <div className="columns-desktop">
      <div className="content-column">
        <ActressFinder />
        {decadesSection}
      </div>
      <div className="content-column">
        {featuredSection}
        {latestSection}
      </div>
      <div className="content-column">
        {archiveSection}
        {theirMenSection}
      </div>
    </div>
  );
}

function selectFeaturedItems(mode: LayoutMode, data: ActressData[]) {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }
  if (mode === 'desktop') {
    if (data.length >= 6) return data.slice(0, 6);
    if (data.length >= 4) return data.slice(0, 4);
    if (data.length >= 2) return data.slice(0, 2);
    return [];
  }
  if (data.length >= 6) return data.slice(0, 6);
  if (data.length >= 3) return data.slice(0, 3);
  return [];
}

function selectDecadeItems(mode: LayoutMode, data: ActressData[]) {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }
  if (mode === 'tablet') {
    return data.length >= 4 ? data.slice(0, 4) : [];
  }
  if (data.length >= 4) return data.slice(0, 4);
  if (data.length >= 2) return data.slice(0, 2);
  return [];
}

function selectArchiveItems(mode: LayoutMode, photos: string[]) {
  if (!Array.isArray(photos) || photos.length === 0) {
    return [];
  }
  if (mode === 'desktop') {
    if (photos.length >= 6) return photos.slice(0, 6);
    if (photos.length >= 3) return photos.slice(0, 3);
    return [];
  }
  return photos.length >= 3 ? photos.slice(0, 3) : [];
}
