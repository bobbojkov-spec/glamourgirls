import { NextResponse } from 'next/server';
import { fetchActressFromDb } from '@/lib/actress/fetchActress';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actressId = parseInt(id);

    if (isNaN(actressId) || actressId <= 0) {
      return NextResponse.json({ error: 'Invalid actress ID' }, { status: 400 });
    }

    // Fetch directly from database using shared function
    const actressData = await fetchActressFromDb(actressId);

    if (!actressData) {
      return NextResponse.json({ error: 'Actress not found' }, { status: 404 });
    }

    return NextResponse.json(actressData);
  } catch (error: any) {
    console.error('Database error:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    return NextResponse.json(
      { 
        error: 'Failed to fetch actress data',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
