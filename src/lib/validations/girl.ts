import { z } from 'zod';

// Helper function to generate slug from name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Girl creation/update schema
export const girlSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  birthdate: z.string().optional(),
  birthplace: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  biography: z.string().optional(),
  alternativeNames: z.string().optional(), // JSON string
  categories: z.string().optional(), // JSON string
  socialLinks: z.string().optional(), // JSON string
  
  // SEO fields
  seoTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  canonicalUrl: z.string().optional(),
  slug: z.string().min(1, 'Slug is required'),
  h1Title: z.string().optional(),
  h2Title: z.string().optional(),
  
  featuredImageId: z.string().optional(),
});

export type GirlFormData = z.infer<typeof girlSchema>;

