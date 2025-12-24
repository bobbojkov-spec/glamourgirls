import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/app/api/admin/_auth';
import * as collageStorage from '@/lib/collage-storage';
import { createClient } from '@supabase/supabase-js';

// GET: List all collages, optionally filtered by era
export async function GET(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const era = searchParams.get('era');

    let collages;
    if (era && era !== 'all') {
      collages = await collageStorage.getCollagesByEra(era);
    } else {
      collages = await collageStorage.getAllCollages();
    }

    console.log(`[Collages API] Returning ${collages.length} collages${era ? ` for era ${era}` : ''}`);
    return NextResponse.json({ success: true, collages: collages || [] });
  } catch (error: any) {
    console.error('Error fetching collages:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch collages', collages: [] },
      { status: 500 }
    );
  }
}

// DELETE: Delete a collage
export async function DELETE(request: NextRequest) {
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

    // Get collage info before deleting
    const allCollages = await collageStorage.getAllCollages();
    const collage = allCollages.find(c => c.id === id);

    if (!collage) {
      return NextResponse.json(
        { success: false, error: 'Collage not found' },
        { status: 404 }
      );
    }

    // Delete from Supabase Storage
    // Extract storage path from the filepath (could be URL or path)
    let storagePath = collage.filepath;
    
    // If it's a full URL, extract the path part
    if (storagePath.includes('/storage/v1/object/public/')) {
      const urlParts = storagePath.split('/storage/v1/object/public/glamourgirls_images/');
      if (urlParts.length > 1) {
        storagePath = urlParts[1];
      }
    } else if (storagePath.startsWith('/')) {
      // Remove leading slash
      storagePath = storagePath.slice(1);
    }
    
    // Remove 'collages/' prefix if present (since we store as 'collages/filename.jpg')
    if (storagePath.startsWith('collages/')) {
      // Already correct format
    } else if (!storagePath.includes('/')) {
      // If just filename, add collages/ prefix
      storagePath = `collages/${storagePath}`;
    }
    
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { error } = await supabase.storage
          .from('glamourgirls_images')
          .remove([storagePath]);
        
        if (error) {
          console.warn(`Warning: Could not delete from Supabase Storage: ${storagePath}`, error.message);
        } else {
          console.log(`Deleted from Supabase Storage: ${storagePath}`);
        }
      }
    } catch (fileError: any) {
      console.warn(`Warning: Could not delete from Supabase Storage: ${storagePath}`, fileError.message);
    }

    // Delete from storage
    const deleted = await collageStorage.deleteCollage(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete collage metadata' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Collage deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting collage:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete collage' },
      { status: 500 }
    );
  }
}

