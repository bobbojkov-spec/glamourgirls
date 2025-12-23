/**
 * Schema.org JSON-LD Structured Data Generator
 */

export interface PersonSchema {
  '@context': string;
  '@type': 'Person';
  name: string;
  alternateName?: string;
  birthDate?: string;
  birthPlace?: string;
  image?: string;
  description?: string;
  sameAs?: string[];
}

export interface ImageObjectSchema {
  '@context': string;
  '@type': 'ImageObject';
  contentUrl: string;
  url: string;
  caption?: string;
  description?: string;
  name?: string;
  creator?: {
    '@type': 'Person';
    name: string;
  };
}

export interface BreadcrumbListSchema {
  '@context': string;
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }>;
}

/**
 * Generate Person schema for actress page
 */
export function generatePersonSchema(data: {
  name: string;
  birthName?: string;
  birthDate?: string;
  birthPlace?: string;
  headshotUrl?: string;
  description?: string;
  url: string;
}): PersonSchema {
  const schema: PersonSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: data.name,
    image: data.headshotUrl,
    description: data.description,
    sameAs: [],
  };
  
  if (data.birthName) {
    schema.alternateName = data.birthName;
  }
  
  if (data.birthDate) {
    schema.birthDate = data.birthDate;
  }
  
  if (data.birthPlace) {
    schema.birthPlace = data.birthPlace;
  }
  
  return schema;
}

/**
 * Generate ImageObject schema for gallery images
 */
export function generateImageObjectSchema(data: {
  imageUrl: string;
  actressName: string;
  altText?: string;
  caption?: string;
}): ImageObjectSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    contentUrl: data.imageUrl,
    url: data.imageUrl,
    caption: data.caption || data.altText,
    description: data.altText || `${data.actressName} photo`,
    name: data.altText || `${data.actressName} photo`,
    creator: {
      '@type': 'Person',
      name: data.actressName,
    },
  };
}

/**
 * Generate BreadcrumbList schema
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>): BreadcrumbListSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Render schema as JSON-LD script tag
 */
export function renderSchemaScript(schema: any): string {
  return `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`;
}

