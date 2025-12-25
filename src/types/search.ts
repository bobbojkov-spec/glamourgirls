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
  headshot?: string; // Optional headshot URL (for backward compatibility)
  previewImageUrl: string; // Preview image URL - always populated (gallery image or placeholder)
  theirMan?: boolean; // Flag for "their men" category
  isFeatured?: boolean; // Featured on homepage
  featuredOrder?: number | null; // Display order (1-4) if featured
}

