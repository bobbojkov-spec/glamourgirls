import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/app/api/admin/_auth';
import { rebuildRelatedActresses } from '@/scripts/rebuildRelatedActresses';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;

  try {
    const body = await request.json();
    const preview = body.preview === true;

    if (typeof preview !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { preview: boolean }' },
        { status: 400 }
      );
    }

    console.log(`🔍 Rebuilding related actresses (preview: ${preview})...`);

    // Use the shared pool from lib/db
    const pool = getPool();
    const result = await rebuildRelatedActresses({ preview, pool });

    if (preview) {
      return NextResponse.json({
        success: true,
        preview: true,
        processed: result.processed,
        totalRelations: result.totalRelations,
        relations: result.preview || [],
        message: `Preview complete: ${result.processed} actresses processed, ${result.totalRelations} relations found`,
      });
    } else {
      return NextResponse.json({
        success: true,
        preview: false,
        processed: result.processed,
        totalRelations: result.totalRelations,
        message: `Successfully saved ${result.totalRelations} relations for ${result.processed} actresses`,
      });
    }
  } catch (error: any) {
    console.error('Error rebuilding related actresses:', error);
    return NextResponse.json(
      {
        error: 'Failed to rebuild related actresses',
        message: error.message || 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

