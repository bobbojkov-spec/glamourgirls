// Allowlist sanitizer for small rich-text fields stored as HTML.
// Goal: preserve simple formatting while preventing arbitrary HTML/XSS.
//
// Allowed tags: <b>, <i>, <br> (we also normalize <strong>/<em> to <b>/<i>)
// Disallowed tags are stripped; attributes are removed.

export function sanitizeLimitedHtml(input: unknown): string {
  if (input === null || input === undefined) return '';
  let s = String(input);
  if (!s) return '';

  // Normalize newlines early
  s = s.replace(/\r\n/g, '\n');

  // Common entity
  s = s.replaceAll('&nbsp;', ' ');

  // Normalize strong/em to b/i
  s = s.replace(/<\s*strong\b[^>]*>/gi, '<b>').replace(/<\s*\/\s*strong\s*>/gi, '</b>');
  s = s.replace(/<\s*em\b[^>]*>/gi, '<i>').replace(/<\s*\/\s*em\s*>/gi, '</i>');

  // Convert common block tags to line breaks
  s = s
    .replace(/<\s*br\b[^>]*>/gi, '<br>')
    .replace(/<\s*\/\s*p\s*>/gi, '<br><br>')
    .replace(/<\s*p\b[^>]*>/gi, '')
    .replace(/<\s*\/\s*div\s*>/gi, '<br>')
    .replace(/<\s*div\b[^>]*>/gi, '')
    .replace(/<\s*\/\s*li\s*>/gi, '<br>')
    .replace(/<\s*li\b[^>]*>/gi, '- ')
    .replace(/<\s*\/\s*ul\s*>/gi, '<br>')
    .replace(/<\s*ul\b[^>]*>/gi, '')
    .replace(/<\s*\/\s*ol\s*>/gi, '<br>')
    .replace(/<\s*ol\b[^>]*>/gi, '');

  // Strip all tags except b/i/br (both open/close). This also drops attributes.
  // - Keep <br>
  // - Keep <b>, </b>, <i>, </i>
  // Everything else becomes empty.
  s = s.replace(/<(?!\s*\/?\s*(b|i)\b)(?!\s*br\b)[^>]*>/gi, '');

  // Remove attributes from allowed tags (defensive)
  s = s.replace(/<\s*(b|i)\b[^>]*>/gi, (_m, t) => `<${String(t).toLowerCase()}>`);
  s = s.replace(/<\s*\/\s*(b|i)\s*>/gi, (_m, t) => `</${String(t).toLowerCase()}>`);
  s = s.replace(/<\s*br\b[^>]*>/gi, '<br>');

  // Convert raw newlines to <br>
  s = s.replace(/\n/g, '<br>');

  // Tidy repeated breaks
  s = s.replace(/(<br>\s*){3,}/gi, '<br><br>');
  s = s.replace(/^\s*(<br>\s*)+/i, '');
  s = s.replace(/(\s*<br>\s*)+$/i, '');

  return s.trim();
}






