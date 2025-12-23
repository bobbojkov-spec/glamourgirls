/**
 * Shared type definitions for Actress data
 * Used by both API routes and pages to ensure type safety
 */

export interface ActressImage {
  id: number | string;
  url: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  size?: number;
  thumbnailId?: number;
}

export interface ActressTimelineItem {
  date: string;
  event: string;
}

export interface ActressLink {
  id: number;
  text: string;
  url: string;
  ord?: number;
}

export interface ActressBook {
  id: number;
  title: string;
  url: string;
  ord?: number;
}

export interface RelatedActress {
  id: number;
  name: string;
  slug: string;
  era: string;
}

export interface Actress {
  id: number;
  name: string;
  firstName?: string;
  middleNames?: string;
  lastName?: string;
  slug: string;
  era: string;
  birthName?: string;
  birthYear?: number | null;
  deathYear?: number | null;
  introText?: string;
  h1Title?: string | null;
  timeline?: ActressTimelineItem[];
  biographyParagraphs?: string[];
  images?: {
    gallery?: ActressImage[];
    hq?: ActressImage[];
    thumbnails?: ActressImage[];
  };
  photoCount?: number;
  hqPhotoCount?: number;
  relatedActresses?: RelatedActress[];
  sources?: string;
  links?: ActressLink[];
  books?: ActressBook[];
  isNew?: boolean;
  hasNewPhotos?: boolean;
  theirMan?: boolean;
}

