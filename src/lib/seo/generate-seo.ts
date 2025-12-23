/**
 * SEO Auto-Generation System
 * Generates SEO fields based on templates and actress data
 */

export interface SEOData {
  seoTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage?: string;
  canonicalUrl: string;
  h1Title: string;
  introText: string;
}

export interface ActressData {
  name: string;
  firstName?: string;
  lastName?: string;
  birthName?: string;
  era?: string;
  slug: string;
  id: number;
}

/**
 * Default SEO templates
 */
const SEO_TEMPLATES = {
  title: '{name} - The Private Life and Times of {name}. {name} Pictures. | {slug}',
  metaDescription: '{name} Pictures - Private Life and Times of {name}. {name} Photo Gallery. {name}{birthName}; Glamour Girls of the Silver Screen - The Private Lives and Times of Some of the Most Glamorous Actresses and Starlets of the Forties, Fifties and Sixties.',
  ogTitle: '{name} - Glamour Girls of the Silver Screen',
  ogDescription: 'Explore {name} photos, biography, and gallery. {name} Pictures from the Golden Age of Hollywood.',
  h1Title: '{firstName} {lastName}',
  introText: '{name} was one of the most glamorous actresses of the {era} era. This page features {name} photos, biography, and a comprehensive gallery of {name} pictures from the Golden Age of Hollywood.',
};

/**
 * Generate intro text (100-220 words)
 */
function generateIntroText(data: ActressData): string {
  const eraText = data.era ? `${data.era} era` : 'Golden Age of Hollywood';
  const birthNameText = data.birthName ? ` (born ${data.birthName})` : '';
  
  const templates = [
    `${data.name}${birthNameText} was one of the most glamorous actresses of the ${eraText}. Known for her captivating presence and timeless beauty, ${data.name} left an indelible mark on the silver screen. This comprehensive collection features ${data.name} photos, detailed biography, and an extensive gallery showcasing ${data.name} pictures from her most memorable roles.`,
    
    `Explore the life and career of ${data.name}${birthNameText}, a stunning actress from the ${eraText}. This page offers a detailed look at ${data.name}'s biography, featuring rare ${data.name} photos and an exclusive gallery of ${data.name} pictures. Discover the private life and times of ${data.name}, one of Hollywood's most celebrated stars.`,
    
    `${data.name}${birthNameText} captivated audiences during the ${eraText} with her elegance and charm. Browse through our extensive collection of ${data.name} photos, learn about ${data.name}'s life and career, and explore our gallery of ${data.name} pictures. This is your complete guide to ${data.name} and her contributions to the Golden Age of Hollywood.`,
  ];
  
  // Select template based on available data
  let intro = templates[0];
  if (data.birthName) {
    intro = templates[1];
  } else if (data.era) {
    intro = templates[2];
  }
  
  // Ensure length is between 100-220 words
  const words = intro.split(' ').length;
  if (words < 100) {
    intro += ` ${data.name} remains one of the most iconic figures from the Golden Age of Hollywood, with a legacy that continues to inspire fans and collectors of classic cinema memorabilia.`;
  } else if (words > 220) {
    const sentences = intro.split('.');
    intro = sentences.slice(0, Math.ceil(sentences.length * 0.8)).join('.') + '.';
  }
  
  return intro;
}

/**
 * Replace template placeholders
 */
function replaceTemplate(template: string, data: ActressData): string {
  return template
    .replace(/{name}/g, data.name)
    .replace(/{firstName}/g, data.firstName || data.name.split(' ')[0] || '')
    .replace(/{lastName}/g, data.lastName || data.name.split(' ').slice(1).join(' ') || '')
    .replace(/{birthName}/g, data.birthName ? ` (${data.birthName})` : '')
    .replace(/{era}/g, data.era || 'Golden Age')
    .replace(/{slug}/g, data.slug);
}

/**
 * Generate all SEO fields
 */
export function generateSEO(data: ActressData, baseUrl: string = 'https://www.glamourgirlsofthesilverscreen.com'): SEOData {
  const canonicalUrl = `${baseUrl}/actress/${data.id}/${data.slug}`;
  
  return {
    seoTitle: replaceTemplate(SEO_TEMPLATES.title, data),
    metaDescription: replaceTemplate(SEO_TEMPLATES.metaDescription, data),
    metaKeywords: `${data.name}, ${data.name} pictures, ${data.name} photos, ${data.name} gallery, glamour girls, ${data.era || 'Hollywood'} actresses, classic cinema`,
    ogTitle: replaceTemplate(SEO_TEMPLATES.ogTitle, data),
    ogDescription: replaceTemplate(SEO_TEMPLATES.ogDescription, data),
    ogImage: `${baseUrl}/api/actresses/${data.id}/headshot`,
    canonicalUrl,
    h1Title: replaceTemplate(SEO_TEMPLATES.h1Title, data) || data.name,
    introText: generateIntroText(data),
  };
}

/**
 * Generate ALT text for images
 */
export function generateAltText(imageName: string, actressName: string, index: number): string {
  // Try to extract descriptive info from filename
  const cleanName = imageName
    .replace(/\.(jpg|jpeg|png|gif)$/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\d+/g, '')
    .trim();
  
  if (cleanName && cleanName.length > 3) {
    return `${actressName} - ${cleanName}`;
  }
  
  return `${actressName} photo ${index + 1} - Glamour Girls of the Silver Screen`;
}

/**
 * Validate SEO data
 */
export interface SEOValidation {
  titleLength: { valid: boolean; length: number; message: string };
  metaDescLength: { valid: boolean; length: number; message: string };
  hasH1: boolean;
  hasIntro: boolean;
  hasAltText: boolean;
  slugQuality: { valid: boolean; message: string };
  hasOgImage: boolean;
  overall: 'green' | 'yellow' | 'red';
}

export function validateSEO(seo: SEOData, hasAltText: boolean = false): SEOValidation {
  const titleLength = seo.seoTitle?.length || 0;
  const metaDescLength = seo.metaDescription?.length || 0;
  
  const validation: SEOValidation = {
    titleLength: {
      valid: titleLength >= 30 && titleLength <= 60,
      length: titleLength,
      message: titleLength < 30 
        ? 'Title too short (min 30 chars)' 
        : titleLength > 60 
        ? 'Title too long (max 60 chars)' 
        : 'Title length OK',
    },
    metaDescLength: {
      valid: metaDescLength >= 120 && metaDescLength <= 160,
      length: metaDescLength,
      message: metaDescLength < 120 
        ? 'Description too short (min 120 chars)' 
        : metaDescLength > 160 
        ? 'Description too long (max 160 chars)' 
        : 'Description length OK',
    },
    hasH1: !!seo.h1Title,
    hasIntro: !!seo.introText && seo.introText.length >= 100,
    hasAltText,
    slugQuality: {
      valid: /^[a-z0-9-]+$/.test(seo.canonicalUrl.split('/').pop() || ''),
      message: 'Slug contains only lowercase letters, numbers, and hyphens',
    },
    hasOgImage: !!seo.ogImage,
    overall: 'green',
  };
  
  // Calculate overall status
  const issues = [
    !validation.titleLength.valid,
    !validation.metaDescLength.valid,
    !validation.hasH1,
    !validation.hasIntro,
    !validation.hasAltText,
    !validation.slugQuality.valid,
    !validation.hasOgImage,
  ].filter(Boolean).length;
  
  if (issues === 0) {
    validation.overall = 'green';
  } else if (issues <= 2) {
    validation.overall = 'yellow';
  } else {
    validation.overall = 'red';
  }
  
  return validation;
}

