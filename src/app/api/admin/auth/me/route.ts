import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/app/api/admin/_auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { admin, error } = await requireAdminApi(req);
  if (error) return error;
  return NextResponse.json({ ok: true, admin: { id: admin!.id, email: admin!.email, role: admin!.role } });
}






