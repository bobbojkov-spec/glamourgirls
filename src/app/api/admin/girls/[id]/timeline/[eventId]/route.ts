import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdminApi } from '@/app/api/admin/_auth';

/**
 * DELETE - Delete a single timeline event by its database ID
 * 
 * MANDATORY RULE: Only deletes by primary key (id)
 * Safety guard: Aborts if more than 1 row would be affected
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { error } = await requireAdminApi(request);
  if (error) return error;

  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    
    const { id, eventId } = await params;
    const girlId = parseInt(id);
    const timelineEventId = parseInt(eventId);

    if (isNaN(girlId) || isNaN(timelineEventId)) {
      await client.query('ROLLBACK');
      client.release();
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }

    // SAFETY GUARD: Verify the event exists and belongs to this girl
    const verifyResult = await client.query(
      `SELECT id, girlid FROM girlinfos WHERE id = $1`,
      [timelineEventId]
    );

    if (verifyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return NextResponse.json(
        { error: 'Timeline event not found' },
        { status: 404 }
      );
    }

    const event = verifyResult.rows[0];
    if (Number(event.girlid) !== girlId) {
      await client.query('ROLLBACK');
      client.release();
      return NextResponse.json(
        { error: 'Timeline event does not belong to this girl' },
        { status: 403 }
      );
    }

    // DELETE by primary key ONLY
    const deleteResult = await client.query(
      `DELETE FROM girlinfos WHERE id = $1`,
      [timelineEventId]
    );

    // SAFETY GUARD: Abort if more than 1 row was affected
    if (deleteResult.rowCount !== 1) {
      await client.query('ROLLBACK');
      client.release();
      console.error(`[Timeline Delete] CRITICAL: Expected 1 row deleted, but ${deleteResult.rowCount} rows were affected for event ID ${timelineEventId}`);
      return NextResponse.json(
        { 
          error: `Safety check failed: Expected 1 row deleted, but ${deleteResult.rowCount} rows were affected. Aborted to prevent data corruption.` 
        },
        { status: 500 }
      );
    }

    await client.query('COMMIT');
    client.release();

    console.log(`[Timeline Delete] Successfully deleted timeline event ID ${timelineEventId} for girl ${girlId}`);

    return NextResponse.json({ 
      success: true,
      message: 'Timeline event deleted successfully'
    });

  } catch (error: any) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error during rollback:', rollbackError);
    }
    client.release();
    
    console.error('Error deleting timeline event:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete timeline event' },
      { status: 500 }
    );
  }
}

