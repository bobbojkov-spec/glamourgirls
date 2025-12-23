import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  return NextResponse.json(
    {
      error: 'Deprecated. Use /api/admin/auth/login-start and /api/admin/auth/login-verify.',
    },
    { status: 410 }
  );
}

