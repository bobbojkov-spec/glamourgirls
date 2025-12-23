import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromSession, isRoleAllowed, type AdminRole } from '@/lib/adminAuth';

export async function requireAdmin(req: NextRequest, opts?: { role?: AdminRole }) {
  const admin = await getAdminFromSession(req);
  if (!admin) {
    return { admin: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (opts?.role && !isRoleAllowed(admin.role, opts.role)) {
    return { admin: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { admin, error: null };
}


