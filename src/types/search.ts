/**
 * Shared type definitions for Search results
 * Used by both API routes and pages to ensure type safety
 */

export interface SearchActressResult {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  slug: string;
  years?: string;
  decade?: string;
  photoCount?: number;
  hqPhotoCount?: number;
  isNew?: boolean;
  hasNewPhotos?: boolean;
  headshot?: string; // Optional headshot URL
  theirMan?: boolean; // Flag for "their men" category
}

