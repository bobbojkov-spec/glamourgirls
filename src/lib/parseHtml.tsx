import React from 'react';

/**
 * Decodes HTML entities (&#146;, &amp;, &quot;, etc.) to their actual characters
 * Also removes spaces before apostrophes in contractions
 */
function decodeHtmlEntities(text: string): string {
  // Map of HTML entities to their correct character representations
  // Note: &#146; (146) is not a valid Unicode character, it's often used incorrectly for apostrophe
  // We map it to a straight apostrophe
  const entityMap: Record<string, string> = {
    // Named entities
    '&apos;': "'",
    '&quot;': '"',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&nbsp;': ' ',
    // Numeric entities - map to correct characters
    '&#39;': "'",      // Straight apostrophe
    '&#145;': "'",     // Left single quotation mark -> apostrophe
    '&#146;': "'",     // Often misused for apostrophe -> apostrophe
    '&#147;': '"',     // Left double quotation mark
    '&#148;': '"',     // Right double quotation mark
    '&#8216;': "'",    // Left single quotation mark -> apostrophe
    '&#8217;': "'",    // Right single quotation mark -> apostrophe
    '&#8220;': '"',    // Left double quotation mark
    '&#8221;': '"',    // Right double quotation mark
  };

  let decoded = text;
  
  // First, remove spaces before apostrophe entities (handles contractions like "she &#146;s")
  // Match space + apostrophe entity and replace with just apostrophe
  // Handle both decimal and hex entities
  decoded = decoded.replace(/\s+&#(146|145|39|8217|8216|x92|x91|x27|x2019|x2018);/gi, "'");
  decoded = decoded.replace(/\s+&apos;/g, "'");
  
  // Replace entities from the map (both named and numeric)
  // Process in order: escape special regex characters, then replace
  Object.entries(entityMap).forEach(([entity, char]) => {
    const escapedEntity = entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    decoded = decoded.replace(new RegExp(escapedEntity, 'g'), char);
  });
  
  // Handle hex entities (&#x92; = &#146;)
  const hexEntityMap: Record<string, string> = {
    '&#x92;': "'",   // Same as &#146;
    '&#x91;': "'",   // Same as &#145;
    '&#x27;': "'",   // Same as &#39;
    '&#x2019;': "'", // Same as &#8217;
    '&#x2018;': "'", // Same as &#8216;
    '&#x93;': '"',   // Same as &#147;
    '&#x94;': '"',   // Same as &#148;
    '&#x201C;': '"', // Same as &#8220;
    '&#x201D;': '"', // Same as &#8221;
  };
  
  Object.entries(hexEntityMap).forEach(([entity, char]) => {
    const escapedEntity = entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    decoded = decoded.replace(new RegExp(escapedEntity, 'gi'), char);
  });
  
  // Handle any remaining numeric entities that weren't in our map
  // Convert them using String.fromCharCode, but only if they're valid
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    const code = parseInt(dec, 10);
    // Only convert if it's a valid character code
    if (code >= 0 && code <= 0x10FFFF) {
      return String.fromCharCode(code);
    }
    return match; // Return original if invalid
  });
  
  // Handle any remaining hex entities
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    const code = parseInt(hex, 16);
    // Only convert if it's a valid character code
    if (code >= 0 && code <= 0x10FFFF) {
      return String.fromCharCode(code);
    }
    return match; // Return original if invalid
  });

  // Final pass: remove any remaining space before apostrophes
  decoded = decoded.replace(/\s+'/g, "'");
  
  // Normalize curly quotes and apostrophes to straight apostrophes
  // This handles cases where the database might have Unicode quote characters
  decoded = decoded.replace(/[''']/g, "'"); // Left/right single quotation marks -> straight apostrophe
  decoded = decoded.replace(/["""]/g, '"'); // Left/right double quotation marks -> straight double quote

  return decoded;
}

/**
 * Parses simple HTML tags (<i>, <b>, <em>, <strong>) from database text
 * and converts them to React elements
 * Also decodes HTML entities like &#146; to actual characters
 */
export function parseHtml(text: string): React.ReactNode {
  if (!text) return text;

  // First decode HTML entities
  const decodedText = decodeHtmlEntities(text);

  // Split by HTML tags
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  let key = 0;

  // Match HTML tags: <i>, </i>, <b>, </b>, <em>, </em>, <strong>, </strong>
  const tagRegex = /<(i|b|em|strong)>(.*?)<\/\1>/gi;
  let match;

  while ((match = tagRegex.exec(decodedText)) !== null) {
    // Add text before the tag
    if (match.index > currentIndex) {
      parts.push(decodedText.substring(currentIndex, match.index));
    }

    // Add the styled content
    const tagName = match[1].toLowerCase();
    const content = match[2];
    
    if (tagName === 'i' || tagName === 'em') {
      parts.push(<em key={key++}>{content}</em>);
    } else if (tagName === 'b' || tagName === 'strong') {
      parts.push(<strong key={key++}>{content}</strong>);
    } else {
      parts.push(content);
    }

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < decodedText.length) {
    parts.push(decodedText.substring(currentIndex));
  }

  // If no tags were found, return decoded text
  if (parts.length === 0) {
    return decodedText;
  }

  return <>{parts}</>;
}

