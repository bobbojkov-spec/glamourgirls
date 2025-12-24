import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/app/api/admin/_auth';
import * as collageStorage from '@/lib/collage-storage';

export async function POST(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Collage ID is required' },
        { status: 400 }
      );
    }

    const updated = await collageStorage.toggleCollageActive(id);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Collage not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      collage: updated,
      message: `Collage ${updated.active ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error: any) {
    console.error('Error toggling collage active status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to toggle collage status' },
      { status: 500 }
    );
  }
}

