/**
 * Admin Image Type
 * 
 * Shared type for image management in admin panel.
 * Used by both frontend and backend APIs.
 * 
 * PRINCIPLES:
 * - Image identity = DB primary key (id). Never use array index as identity.
 * - Order is NOT identity. Order is only a sortable field.
 * - Delete, update, reorder must ALWAYS be id-based.
 */

export type AdminImage = {
  id: number;
  girlId: number;
  orderNum: number;
  originalWidth: number;
  originalHeight: number;
  originalFileBytes: number;
  originalMime?: string | null;
  originalFilename?: string | null;
  thumbnailUrl: string;
  galleryUrl: string;
  hqUrl?: string | null;
  storagePaths: string[]; // All storage object paths for cascade deletion
  // Derived display fields
  width: number; // Gallery image width (after processing)
  height: number; // Gallery image height (after processing)
};

/**
 * Request payload for reordering images
 * SERVER-AUTHORITATIVE: Frontend sends ONLY IDs in desired order
 * Backend assigns order_num sequentially (1, 2, 3, ...)
 */
export type ReorderImagesRequest = {
  girlId: number; // Girl ID for validation
  orderedImageIds: number[]; // Array of image IDs in desired order
};

/**
 * Response from upload endpoint
 */
export type UploadImageResponse = {
  success: boolean;
  images: AdminImage[];
  message?: string;
  errors?: string[];
};

