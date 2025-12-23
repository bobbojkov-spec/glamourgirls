// Simple auth helper - in production, use proper JWT verification

export function verifyAdminToken(token: string | null): boolean {
  if (!token) return false;
  
  try {
    // In production, verify JWT token here
    // For now, just check if token exists
    return token.length > 0;
  } catch {
    return false;
  }
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

