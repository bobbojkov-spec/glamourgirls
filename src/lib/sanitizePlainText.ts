// Minimal HTML -> plain-text sanitizer for admin-entered fields.
// We only need to handle simple tags that have shown up in DB (<i>, <b>, <em>, <strong>, <br>, etc).
// This is NOT a full HTML sanitizer; it’s intended to strip markup and keep readable text.

function decodeEntities(input: string): string {
  // Common HTML entities we expect from copy/paste
  return input
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x27;', "'")
    .replaceAll('&#x2F;', '/');
}

export function sanitizePlainText(input: unknown): string {
  if (input === null || input === undefined) return '';
  let s = String(input);
  if (!s) return '';

  // Normalize line breaks first
  s = s.replace(/\r\n/g, '\n');

  // Convert obvious break/paragraph tags to newlines before stripping tags
  s = s
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*p\s*>/gi, '\n\n')
    .replace(/<\s*p\s*[^>]*>/gi, '');

  // Strip remaining tags
  s = s.replace(/<[^>]*>/g, '');

  // Decode entities & normalize whitespace
  s = decodeEntities(s);
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  s = s.replace(/[ \t]{2,}/g, ' ');

  return s.trim();
}

export function hasHtmlLikeMarkup(input: unknown): boolean {
  if (input === null || input === undefined) return false;
  const s = String(input);
  // Look for tags like <i> or </b> etc.
  return /<\s*\/?\s*[a-z][^>]*>/i.test(s);
}







