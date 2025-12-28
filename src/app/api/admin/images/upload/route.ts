import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import sharp from 'sharp';
import pool, { getPool } from '@/lib/db';
import { requireAdminApi } from '@/app/api/admin/_auth';
import { createClient } from '@supabase/supabase-js';
import type { AdminImage, UploadImageResponse } from '@/types/admin-image';

export const runtime = 'nodejs';

// Helper function to check if a column exists in the images table
async function columnExists(pgPool: any, columnName: string): Promise<boolean> {
  try {
    const result = await pgPool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'images' AND column_name = $1`,
      [columnName]
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

// Helper function to upload to Supabase storage
async function uploadToSupabase(
  supabase: any,
  bucket: string,
  filePath: string,
  buffer: Buffer,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(cleanPath, buffer, {
      contentType,
      upsert: true, // Overwrite if exists
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  return cleanPath;
}

// Helper function to format image description: "2557 × 3308 px (24.2 MB)"
function formatImageDescription(width: number, height: number, fileSizeBytes: number): string {
  const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(1);
  return `${width} × ${height} px (${fileSizeMB} MB)`;
}

// Helper function to create watermark using SVG (Vercel-compatible)
function createWatermarkSVG(text: string, imageWidth: number, imageHeight: number): Buffer {
  // Calculate font size based on image width (target ~475px text width)
  // Approximate: font size ≈ text width / (text length * 0.6)
  const targetTextWidth = 475;
  const estimatedFontSize = Math.min(Math.max(targetTextWidth / (text.length * 0.6), 24), 48);
  
  const x = imageWidth / 2;
  const y = imageHeight - 15;
  
  // Create SVG with text watermark
  // Use system fonts that are available on most systems
  const svg = Buffer.from(`
    <svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dx="1" dy="1" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.55"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <text
        x="${x}"
        y="${y}"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${estimatedFontSize}"
        font-style="italic"
        text-anchor="middle"
        dominant-baseline="baseline"
        fill="rgba(255, 255, 255, 0.85)"
        stroke="rgba(0, 0, 0, 0.55)"
        stroke-width="1"
        filter="url(#shadow)"
      >${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>
    </svg>
  `);
  
  return svg;
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  
  // Check for debug mode
  const formData = await request.formData();
  const isDebugMode = formData.get('debug') === '1' || process.env.NODE_ENV === 'development';
  
  // Declare variables in outer scope so they're accessible in catch block
  let actressId: number = 0;
  let lockClient: any = null;
  let lockAcquired = false;
  let lockKey = 0;
  
  try {
    actressId = parseInt(formData.get('actressId') as string);
    const type = formData.get('type') as string;
    const files = formData.getAll('images') as File[];

    if (!actressId || isNaN(actressId)) {
      return NextResponse.json({ error: 'Invalid actress ID' }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const uploadedImages = [];
    const errors: string[] = [];
    
    // Use advisory lock to serialize image uploads for this actress (queue system)
    // CRITICAL: We MUST calculate MAX(order_num) INSIDE the lock to ensure sequential ordering
    // We use pg_try_advisory_lock with retries and timeout to avoid indefinite waiting
    const pgPool = getPool();
    lockKey = 2000000 + actressId; // Different range from girllinks locks
    
    lockClient = await pgPool.connect();
    lockAcquired = false;
    const LOCK_TIMEOUT_MS = 60000; // 60 seconds max wait time (increased to allow long uploads)
    const LOCK_RETRY_INTERVAL_MS = 250; // Check every 250ms (less frequent, reduces DB load)
    const maxRetries = Math.floor(LOCK_TIMEOUT_MS / LOCK_RETRY_INTERVAL_MS);
    
    try {
      // Try to acquire lock with timeout (non-blocking with retries)
      console.log(`[Upload] Attempting to acquire lock for actress ${actressId} (lock key: ${lockKey}) with ${LOCK_TIMEOUT_MS}ms timeout...`);
      let retries = 0;
      while (retries < maxRetries && !lockAcquired) {
        const lockResult = await lockClient.query(`SELECT pg_try_advisory_lock($1) as acquired`, [lockKey]);
        const acquired = lockResult.rows[0]?.acquired === true;
        
        if (acquired) {
          lockAcquired = true;
          console.log(`[Upload] ✓ Lock acquired for actress ${actressId} after ${retries * LOCK_RETRY_INTERVAL_MS}ms (${retries} retries), processing ${files.length} file(s)`);
        } else {
          retries += 1;
          if (retries < maxRetries) {
            // Log progress every 2 seconds (8 retries)
            if (retries % 8 === 0) {
              console.log(`[Upload] Waiting for lock for actress ${actressId}... (${retries * LOCK_RETRY_INTERVAL_MS}ms elapsed)`);
            }
            // Wait before retrying (don't spam the database)
            await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_INTERVAL_MS));
          }
        }
      }
      
      if (!lockAcquired) {
        lockClient.release();
        console.error(`[Upload] ✗ Failed to acquire lock for actress ${actressId} after ${LOCK_TIMEOUT_MS}ms (${retries} retries). Another upload may be in progress or a lock may be stuck.`);
        return NextResponse.json(
          { error: `Failed to acquire upload lock. Another upload may be in progress. Please wait ${Math.ceil(LOCK_TIMEOUT_MS / 1000)} seconds and try again. If the problem persists, there may be a stuck lock that needs manual intervention.` },
          { status: 503 } // 503 Service Unavailable - temporary condition
        );
      }
    } catch (lockError: any) {
      // If lock acquisition fails (connection error, etc), release the client and return error
      if (lockClient && typeof lockClient.release === 'function') {
        lockClient.release();
      }
      const errorMsg = lockError?.message || String(lockError || 'Unknown error');
      console.error(`[Upload] ✗ Error acquiring lock for actress ${actressId}:`, {
        error: errorMsg,
        code: lockError?.code,
        name: lockError?.name,
      });
      return NextResponse.json(
        { error: `Failed to acquire upload lock: ${errorMsg}` },
        { status: 500 }
      );
    }
    
    // Ensure lock is released after upload completes (or fails)
    // Declare releaseLock in outer scope so it's accessible in catch block
    let lockReleased = false;
    
    // Define releaseLock function (must be defined after lockAcquired is set)
    const releaseLock = async () => {
      if (!lockReleased && lockAcquired && lockClient) {
        try {
          await lockClient.query(`SELECT pg_advisory_unlock($1)`, [lockKey]);
          console.log(`[Upload] Released lock for actress ${actressId}`);
          lockReleased = true;
        } catch (unlockError: any) {
          console.error(`[Upload] Error releasing lock for actress ${actressId}:`, unlockError);
          // Even if unlock fails, mark as released and release the client
          lockReleased = true;
        } finally {
          if (lockClient && typeof lockClient.release === 'function') {
            lockClient.release();
          }
        }
      } else if (lockClient && !lockAcquired) {
        // If lock wasn't acquired, just release the client
        if (typeof lockClient.release === 'function') {
          lockClient.release();
        }
      }
    };

    // Check which columns exist (for backward compatibility)
    const hasOrderNum = await columnExists(pgPool, 'order_num');
    const hasOriginalFields = await columnExists(pgPool, 'original_width');
    const hasStoragePaths = await columnExists(pgPool, 'storage_paths');

    // ============================================
    // STEP 0: GET CURRENT MAX ORDER_NUM INSIDE THE LOCK (CRITICAL FOR SEQUENTIAL ORDERING)
    // ============================================
    // CRITICAL: order_num MUST always be set for new uploads to prevent NULL values
    // We calculate the next order_num by finding the maximum existing order_num (excluding NULL)
    // This calculation MUST happen INSIDE the lock so each request sees the correct max after previous requests commit
    // If no valid order_num exists, start at 1
    let nextOrderNum = 1;
    if (hasOrderNum) {
      try {
        // Use the lockClient (same connection that holds the lock) to ensure we see committed data
        // Explicitly filter out NULL values - only consider valid order_num > 0
        const maxOrderResult = await lockClient.query(
          `SELECT COALESCE(MAX(order_num), 0) as max_order 
           FROM images 
           WHERE girlid = $1 AND mytp = 4 AND order_num IS NOT NULL AND order_num > 0`,
          [actressId]
        );
        const maxOrder = parseInt((maxOrderResult.rows[0]?.max_order || 0).toString());
        if (isNaN(maxOrder) || maxOrder < 0) {
          nextOrderNum = 1;
        } else {
          nextOrderNum = maxOrder + 1;
        }
        console.log(`[Upload] Calculated next order_num INSIDE LOCK: ${nextOrderNum} (max existing: ${maxOrder})`);
      } catch (e: any) {
        console.warn('[Upload] Error getting max order_num, using count fallback:', e.message);
        // Fallback: use count (only if MAX query fails)
        try {
          const countResult = await lockClient.query(
            `SELECT COUNT(*) as count FROM images WHERE girlid = $1 AND mytp = 4`,
            [actressId]
          );
          const count = parseInt((countResult.rows[0]?.count || 0).toString());
          nextOrderNum = Math.max(1, count + 1); // Ensure at least 1
        } catch (countError: any) {
          console.error('[Upload] Count fallback also failed:', countError);
          // Use default of 1
          nextOrderNum = 1;
        }
      }
    } else {
      // If order_num column doesn't exist, this should not happen in production
      // but we still calculate a starting point in case the column gets added later
      try {
        const countResult = await lockClient.query(
          `SELECT COUNT(*) as count FROM images WHERE girlid = $1 AND mytp = 4`,
          [actressId]
        );
        const count = parseInt((countResult.rows[0]?.count || 0).toString());
        nextOrderNum = Math.max(1, count + 1);
        console.warn(`[Upload] WARNING: order_num column does not exist - calculated starting order: ${nextOrderNum}`);
      } catch (countError: any) {
        console.error('[Upload] Count query failed:', countError);
        nextOrderNum = 1;
      }
    }

    console.log(`[Upload] Starting upload of ${files.length} file(s) for actress ${actressId}, starting at order_num ${nextOrderNum}`);
    console.log(`[Upload] Files received:`, files.map(f => ({ name: f.name, size: f.size })));
    console.log(`[Upload] DEBUG: nextOrderNum initialized to: ${nextOrderNum}, will assign: ${nextOrderNum}, ${nextOrderNum + 1}, ${nextOrderNum + 2}...`);

    // ============================================
    // STEP 1: CREATE ONE SUPABASE CLIENT FOR ENTIRE REQUEST
    // ============================================
    // Create ONE Supabase client that lives for the entire request duration
    // This client is reused for all file uploads - DO NOT create/destroy per file
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json(
          { error: 'Supabase configuration missing. Cannot upload images.' },
          { status: 500 }
        );
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`[Upload] Created Supabase client for ${files.length} file(s)`);

    // ============================================
    // STEP 2: PROCESS FILES SEQUENTIALLY (MANDATORY PATTERN)
    // ============================================
    // Process files sequentially to ensure proper order_num assignment and avoid race conditions
    // Each file is processed completely independently with its own DB connection and transaction
    // BUT shares the same Supabase client (which is safe and more efficient)
    // CRITICAL: This loop MUST process ALL files before the response is sent
    let fileIndex = 0;
    let processedCount = 0;
    let successCount = 0;
    let failureCount = 0;
    
    for (const file of files) {
      fileIndex += 1;
      processedCount += 1;
      console.log(`[Upload] [${fileIndex}/${files.length}] ===== STARTING FILE: ${file.name} =====`);
      
      // Each file gets its own DB client connection
      const fileClient = await pgPool.connect();
      const storagePaths: string[] = []; // Track all storage paths for cascade deletion (isolated per file)
      let transactionActive = false;
      let clientReleased = false; // Track if client has been released
      
      // Assign order_num from memory (increment after use)
      // CRITICAL: Ensure orderNum is always a valid positive integer
      const orderNum = hasOrderNum ? Math.max(1, nextOrderNum) : 0;
      if (hasOrderNum && (orderNum <= 0 || !Number.isInteger(orderNum))) {
        throw new Error(`CRITICAL: Invalid orderNum calculated: ${orderNum}. This should never happen.`);
      }
      console.log(`[Upload] [${fileIndex}/${files.length}] Assigning order_num: ${orderNum} (nextOrderNum before increment: ${nextOrderNum})`);
      nextOrderNum += 1;
      console.log(`[Upload] [${fileIndex}/${files.length}] Incremented nextOrderNum to: ${nextOrderNum}`);
      
      try {
        // Begin transaction for this file
        await fileClient.query('BEGIN');
        transactionActive = true;
        console.log(`[Upload] [${fileIndex}/${files.length}] Transaction started for ${file.name}, order_num: ${orderNum}`);
        
        // ============================================
        // STEP 3: CAPTURE ORIGINAL METADATA BEFORE ANY PROCESSING
        // ============================================
        const bytes = await file.arrayBuffer();
        const originalBuffer = Buffer.from(bytes);
        const originalFileBytes = originalBuffer.length; // Capture BEFORE any resizing
        
        // Get original image metadata BEFORE any processing
        const originalImage = sharp(originalBuffer);
        const originalMetadata = await originalImage.metadata();
        const originalWidth = originalMetadata.width || 0;
        const originalHeight = originalMetadata.height || 0;
        const originalMime = file.type || originalMetadata.format ? `image/${originalMetadata.format}` : 'image/jpeg';
        const originalFilename = file.name;
        
        if (originalWidth === 0 || originalHeight === 0) {
          throw new Error(`Invalid image dimensions: ${originalWidth}x${originalHeight}`);
        }
        
        console.log(`[Upload] [${fileIndex}/${files.length}] Metadata: ${originalWidth}x${originalHeight}px, ${(originalFileBytes / 1024 / 1024).toFixed(2)}MB`);
        
        const longerSide = Math.max(originalWidth, originalHeight);
        const GALLERY_MAX_SIZE = 900; // Gallery images max 900px on longer side
        const HQ_THRESHOLD = 1500; // Images > 1500px get HQ version

        // Determine folder (use newpic for new uploads)
        const folderName = 'newpic'; // Default to newpic
        
        // Generate unique filename (timestamp + file index + random) - ensures uniqueness even for simultaneous uploads
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const fileExt = path.extname(file.name) || '.jpg';
        const baseFileName = `${timestamp}_${fileIndex}_${random}`;
      
      let galleryImageId: number;
      let galleryDbPath: string;
        let galleryWidth = originalWidth;
        let galleryHeight = originalHeight;
      let hqImageId: number | null = null;
        let hqStoragePath: string | null = null;
      let galleryBuffer: Buffer; // Declare outside if/else for thumbnail creation

        // ============================================
        // STEP 3: PROCESS IMAGE (HQ + Gallery or Gallery only)
        // ============================================
      // If longer side > 1500px, save original as HQ and create resized gallery image
      if (longerSide > HQ_THRESHOLD) {
        // Upload original as HQ (mytp = 5) to Supabase storage (images_raw bucket for HQ)
        const hqFileName = `${baseFileName}_hq${fileExt}`;
        const hqDbPath = `/${folderName}/${actressId}/${hqFileName}`;
          hqStoragePath = `${folderName}/${actressId}/${hqFileName}`;
        
          // Upload HQ to Supabase storage FIRST (before DB insert)
          await uploadToSupabase(supabase, 'images_raw', hqStoragePath, originalBuffer, originalMime);
          storagePaths.push(`images_raw:${hqStoragePath}`);
        
          // Get file size in bytes (already captured as originalFileBytes)
          const hqFileSize = originalFileBytes;
        
        // Generate description for HQ images if longer side > 1200px
          const hqDescription = longerSide > 1200 ? formatImageDescription(originalWidth, originalHeight, hqFileSize) : null;

        // Insert HQ image into database
        let hqRows: any;
        try {
            let sql: string;
            let params: any[];
            
            if (hasOriginalFields && hasStoragePaths) {
              // New format with all columns
              sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description, 
                original_width, original_height, original_file_bytes, original_mime, original_filename, storage_paths) 
               VALUES ($1, $2, $3, $4, 5, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`;
              params = [
                actressId, hqDbPath, originalWidth, originalHeight, originalMime, hqFileSize, hqDescription,
                originalWidth, originalHeight, originalFileBytes, originalMime, originalFilename,
                JSON.stringify([`images_raw:${hqStoragePath}`])
              ];
            } else {
              // Old format without new columns
              sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description) 
               VALUES ($1, $2, $3, $4, 5, $5, $6, $7) RETURNING id`;
              params = [actressId, hqDbPath, originalWidth, originalHeight, originalMime, hqFileSize, hqDescription];
            }
            
            const result = await fileClient.query(sql, params);
          hqRows = { rows: result.rows };
        } catch (insertError: any) {
          // If duplicate key error, rollback, reset sequence, and retry in new transaction
          if (insertError.code === '23505' || insertError.message?.includes('duplicate key') || insertError.message?.includes('unique constraint')) {
            console.warn(`Sequence conflict detected for images, rolling back and resetting sequence`);
              try {
            await fileClient.query('ROLLBACK');
                transactionActive = false;
              } catch (rollbackErr: any) {
                // Transaction might already be rolled back, but continue anyway
                console.warn('Rollback in retry (may be expected):', rollbackErr.message);
                transactionActive = false;
              }
            // Reset sequence outside transaction
              try {
            const maxIdResult = await fileClient.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM images`);
            const maxId = parseInt(maxIdResult.rows[0]?.max_id || '0');
            await fileClient.query(`SELECT setval('images_id_seq', $1, true)`, [maxId]);
            // Start new transaction and retry
            await fileClient.query('BEGIN');
                transactionActive = true;
              } catch (seqErr: any) {
                // If we can't reset sequence, mark transaction as inactive and throw original error
                transactionActive = false;
                throw insertError;
              }
              
              let sql: string;
              let params: any[];
              if (hasOriginalFields && hasStoragePaths) {
                sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description,
                  original_width, original_height, original_file_bytes, original_mime, original_filename, storage_paths) 
                 VALUES ($1, $2, $3, $4, 5, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`;
                params = [
                  actressId, hqDbPath, originalWidth, originalHeight, originalMime, hqFileSize, hqDescription,
                  originalWidth, originalHeight, originalFileBytes, originalMime, originalFilename,
                  JSON.stringify([`images_raw:${hqStoragePath}`])
                ];
              } else {
                sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description) 
                 VALUES ($1, $2, $3, $4, 5, $5, $6, $7) RETURNING id`;
                params = [actressId, hqDbPath, originalWidth, originalHeight, originalMime, hqFileSize, hqDescription];
              }
              
              const result = await fileClient.query(sql, params);
            hqRows = { rows: result.rows };
          } else {
            throw insertError;
          }
        }
        
        hqImageId = hqRows.rows[0]?.id;

        // Create resized gallery image (max 900px on longer side - lower quality to motivate HQ purchase)
          let galleryImage = originalImage
          .resize(GALLERY_MAX_SIZE, GALLERY_MAX_SIZE, {
            fit: 'inside',
            withoutEnlargement: true,
          });
        
        // Get dimensions after resize for watermark positioning
        const resizedForWatermark = await galleryImage.toBuffer();
        const resizedMeta = await sharp(resizedForWatermark).metadata();
        const resizedWidth = resizedMeta.width || GALLERY_MAX_SIZE;
        const resizedHeight = resizedMeta.height || GALLERY_MAX_SIZE;
        
        // Create watermark using SVG (Vercel-compatible)
        const watermarkText = 'www.GlamourGirlsOftheSilverScreen.com';
        const watermarkSVG = createWatermarkSVG(watermarkText, resizedWidth, resizedHeight);
        
        // Composite watermark onto gallery image
        galleryBuffer = await galleryImage
          .composite([{
            input: watermarkSVG,
            top: 0,
            left: 0,
          }])
          .jpeg({ quality: 85 })
          .toBuffer();

        const galleryFileName = `${baseFileName}${fileExt}`;
        galleryDbPath = `/${folderName}/${actressId}/${galleryFileName}`;
        const galleryStoragePath = `${folderName}/${actressId}/${galleryFileName}`;
        
        // Upload gallery image to Supabase storage (glamourgirls_images bucket)
        await uploadToSupabase(supabase, 'glamourgirls_images', galleryStoragePath, galleryBuffer, 'image/jpeg');
          storagePaths.push(`glamourgirls_images:${galleryStoragePath}`);

        // Get gallery image dimensions
        const galleryMeta = await sharp(galleryBuffer).metadata();
          galleryWidth = galleryMeta.width || originalWidth;
          galleryHeight = galleryMeta.height || originalHeight;

        // Get gallery file size
        const galleryFileSize = galleryBuffer.length;
        
        // Generate description for gallery images if original longer side > 1200px
        const galleryDescription = longerSide > 1200 ? formatImageDescription(galleryWidth, galleryHeight, galleryFileSize) : null;

          // Insert gallery image into database with order_num and original metadata
          // CRITICAL: order_num MUST always be set if the column exists - it's required for ordering
        let galleryRows: any;
        try {
            let sql: string;
            let params: any[];
            
            if (hasOrderNum && hasOriginalFields && hasStoragePaths) {
              // Full format with all columns including order_num
              sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description, order_num,
                original_width, original_height, original_file_bytes, original_mime, original_filename, storage_paths) 
               VALUES ($1, $2, $3, $4, 4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`;
              params = [
                actressId, galleryDbPath, galleryWidth, galleryHeight, 'image/jpeg', galleryFileSize, galleryDescription, orderNum,
                originalWidth, originalHeight, originalFileBytes, originalMime, originalFilename,
                JSON.stringify(storagePaths)
              ];
            } else if (hasOrderNum && hasOriginalFields) {
              // order_num + original fields, but no storage_paths
              sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description, order_num,
                original_width, original_height, original_file_bytes, original_mime, original_filename) 
               VALUES ($1, $2, $3, $4, 4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`;
              params = [
                actressId, galleryDbPath, galleryWidth, galleryHeight, 'image/jpeg', galleryFileSize, galleryDescription, orderNum,
                originalWidth, originalHeight, originalFileBytes, originalMime, originalFilename
              ];
            } else if (hasOrderNum && hasStoragePaths) {
              // order_num + storage_paths, but no original fields
              sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description, order_num, storage_paths) 
               VALUES ($1, $2, $3, $4, 4, $5, $6, $7, $8, $9) RETURNING id`;
              params = [
                actressId, galleryDbPath, galleryWidth, galleryHeight, 'image/jpeg', galleryFileSize, galleryDescription, orderNum,
                JSON.stringify(storagePaths)
              ];
            } else if (hasOrderNum) {
              // CRITICAL: order_num exists - MUST include it even if other columns don't exist
              // Safety check: orderNum must be valid before INSERT
              if (!orderNum || orderNum <= 0 || !Number.isInteger(orderNum)) {
                throw new Error(`CRITICAL: Cannot insert image with invalid order_num: ${orderNum}. This should never happen.`);
              }
              sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description, order_num) 
               VALUES ($1, $2, $3, $4, 4, $5, $6, $7, $8) RETURNING id`;
              params = [actressId, galleryDbPath, galleryWidth, galleryHeight, 'image/jpeg', galleryFileSize, galleryDescription, orderNum];
            } else {
              // Legacy: order_num column doesn't exist (should not happen in production)
              sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description) 
               VALUES ($1, $2, $3, $4, 4, $5, $6, $7) RETURNING id`;
              params = [actressId, galleryDbPath, galleryWidth, galleryHeight, 'image/jpeg', galleryFileSize, galleryDescription];
              console.warn(`[Upload] WARNING: order_num column does not exist - image will not have ordering`);
            }
            
            const result = await fileClient.query(sql, params);
          galleryRows = { rows: result.rows };
        } catch (insertError: any) {
          // If duplicate key error, rollback, reset sequence, and retry in new transaction
          if (insertError.code === '23505' || insertError.message?.includes('duplicate key') || insertError.message?.includes('unique constraint')) {
            console.warn(`Sequence conflict detected for images, rolling back and resetting sequence`);
              try {
            await fileClient.query('ROLLBACK');
                transactionActive = false;
              } catch (rollbackErr: any) {
                // Transaction might already be rolled back, but continue anyway
                console.warn('Rollback in retry (may be expected):', rollbackErr.message);
                transactionActive = false;
              }
            // Reset sequence outside transaction
              try {
            const maxIdResult = await fileClient.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM images`);
            const maxId = parseInt(maxIdResult.rows[0]?.max_id || '0');
            await fileClient.query(`SELECT setval('images_id_seq', $1, true)`, [maxId]);
            // Start new transaction and retry
            await fileClient.query('BEGIN');
                transactionActive = true;
              } catch (seqErr: any) {
                // If we can't reset sequence, mark transaction as inactive and throw original error
                transactionActive = false;
                throw insertError;
              }
              
              let sql: string;
              let params: any[];
              if (hasOrderNum && hasOriginalFields && hasStoragePaths) {
                sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description, order_num,
                  original_width, original_height, original_file_bytes, original_mime, original_filename, storage_paths) 
                 VALUES ($1, $2, $3, $4, 4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`;
                params = [
                  actressId, galleryDbPath, galleryWidth, galleryHeight, 'image/jpeg', galleryFileSize, galleryDescription, orderNum,
                  originalWidth, originalHeight, originalFileBytes, originalMime, originalFilename,
                  JSON.stringify(storagePaths)
                ];
              } else if (hasOrderNum && hasOriginalFields) {
                sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description, order_num,
                  original_width, original_height, original_file_bytes, original_mime, original_filename) 
                 VALUES ($1, $2, $3, $4, 4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`;
                params = [
                  actressId, galleryDbPath, galleryWidth, galleryHeight, 'image/jpeg', galleryFileSize, galleryDescription, orderNum,
                  originalWidth, originalHeight, originalFileBytes, originalMime, originalFilename
                ];
              } else if (hasOrderNum && hasStoragePaths) {
                sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description, order_num, storage_paths) 
                 VALUES ($1, $2, $3, $4, 4, $5, $6, $7, $8, $9) RETURNING id`;
                params = [
                  actressId, galleryDbPath, galleryWidth, galleryHeight, 'image/jpeg', galleryFileSize, galleryDescription, orderNum,
                  JSON.stringify(storagePaths)
                ];
              } else if (hasOrderNum) {
                sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description, order_num) 
                 VALUES ($1, $2, $3, $4, 4, $5, $6, $7, $8) RETURNING id`;
                params = [actressId, galleryDbPath, galleryWidth, galleryHeight, 'image/jpeg', galleryFileSize, galleryDescription, orderNum];
              } else {
                sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description) 
                 VALUES ($1, $2, $3, $4, 4, $5, $6, $7) RETURNING id`;
                params = [actressId, galleryDbPath, galleryWidth, galleryHeight, 'image/jpeg', galleryFileSize, galleryDescription];
              }
              
              const result = await fileClient.query(sql, params);
            galleryRows = { rows: result.rows };
          } else {
            throw insertError;
          }
        }

        galleryImageId = galleryRows.rows[0]?.id;
      } else {
        // Image is <= 1500px, resize to gallery size (900px max) and save as gallery image only
        // If image is already <= 900px, keep original size
          galleryBuffer = originalBuffer;
          let finalGalleryWidth = originalWidth;
          let finalGalleryHeight = originalHeight;
        
        if (longerSide > GALLERY_MAX_SIZE) {
          // Resize to 900px max on longer side
            let resizedImage = originalImage
            .resize(GALLERY_MAX_SIZE, GALLERY_MAX_SIZE, {
              fit: 'inside',
              withoutEnlargement: true,
            });
          
          // Get resized dimensions for watermark
          const tempBuffer = await resizedImage.toBuffer();
          const resizedMeta = await sharp(tempBuffer).metadata();
            finalGalleryWidth = resizedMeta.width || originalWidth;
            finalGalleryHeight = resizedMeta.height || originalHeight;
          
          // Create watermark using SVG (Vercel-compatible)
          const watermarkText = 'Glamour Girls of the Silver Screen';
          const watermarkSVG = createWatermarkSVG(watermarkText, finalGalleryWidth, finalGalleryHeight);
          
          // Composite watermark onto resized image
          galleryBuffer = Buffer.from(await resizedImage
            .composite([{
              input: watermarkSVG,
              top: 0,
              left: 0,
            }])
            .jpeg({ quality: 85 })
            .toBuffer());
        } else {
          // Image is already <= 900px, but still add watermark
          const watermarkText = 'Glamour Girls of the Silver Screen';
            const watermarkSVG = createWatermarkSVG(watermarkText, originalWidth, originalHeight);
          
          // Composite watermark onto original image
            galleryBuffer = Buffer.from(await originalImage
            .composite([{
              input: watermarkSVG,
              top: 0,
              left: 0,
            }])
            .jpeg({ quality: 85 })
            .toBuffer());
          
            finalGalleryWidth = originalWidth;
            finalGalleryHeight = originalHeight;
        }
        
        const galleryFileName = `${baseFileName}${fileExt}`;
        galleryDbPath = `/${folderName}/${actressId}/${galleryFileName}`;
        const galleryStoragePath = `${folderName}/${actressId}/${galleryFileName}`;
        
        // Upload gallery image to Supabase storage (glamourgirls_images bucket)
        await uploadToSupabase(supabase, 'glamourgirls_images', galleryStoragePath, galleryBuffer, 'image/jpeg');
          storagePaths.push(`glamourgirls_images:${galleryStoragePath}`);

        // Get gallery file size
        const galleryFileSize = galleryBuffer.length;
        
        // Generate description for gallery images if original longer side > 1200px
        const galleryDescription = longerSide > 1200 ? formatImageDescription(finalGalleryWidth, finalGalleryHeight, galleryFileSize) : null;

          // Insert gallery image into database with order_num and original metadata
          // CRITICAL: order_num MUST always be set if the column exists - it's required for ordering
        let galleryRows: any;
        try {
            let sql: string;
            let params: any[];
            
            if (hasOrderNum && hasOriginalFields && hasStoragePaths) {
              sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description, order_num,
                original_width, original_height, original_file_bytes, original_mime, original_filename, storage_paths) 
               VALUES ($1, $2, $3, $4, 4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`;
              params = [
                actressId, galleryDbPath, finalGalleryWidth, finalGalleryHeight, 'image/jpeg', galleryFileSize, galleryDescription, orderNum,
                originalWidth, originalHeight, originalFileBytes, originalMime, originalFilename,
                JSON.stringify(storagePaths)
              ];
            } else if (hasOrderNum && hasOriginalFields) {
              sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description, order_num,
                original_width, original_height, original_file_bytes, original_mime, original_filename) 
               VALUES ($1, $2, $3, $4, 4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`;
              params = [
                actressId, galleryDbPath, finalGalleryWidth, finalGalleryHeight, 'image/jpeg', galleryFileSize, galleryDescription, orderNum,
                originalWidth, originalHeight, originalFileBytes, originalMime, originalFilename
              ];
            } else if (hasOrderNum && hasStoragePaths) {
              sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description, order_num, storage_paths) 
               VALUES ($1, $2, $3, $4, 4, $5, $6, $7, $8, $9) RETURNING id`;
              params = [
                actressId, galleryDbPath, finalGalleryWidth, finalGalleryHeight, 'image/jpeg', galleryFileSize, galleryDescription, orderNum,
                JSON.stringify(storagePaths)
              ];
            } else if (hasOrderNum) {
              // CRITICAL: order_num exists - MUST include it even if other columns don't exist
              sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description, order_num) 
               VALUES ($1, $2, $3, $4, 4, $5, $6, $7, $8) RETURNING id`;
              params = [actressId, galleryDbPath, finalGalleryWidth, finalGalleryHeight, 'image/jpeg', galleryFileSize, galleryDescription, orderNum];
            } else {
              sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description) 
               VALUES ($1, $2, $3, $4, 4, $5, $6, $7) RETURNING id`;
              params = [actressId, galleryDbPath, finalGalleryWidth, finalGalleryHeight, 'image/jpeg', galleryFileSize, galleryDescription];
              console.warn(`[Upload] WARNING: order_num column does not exist - image will not have ordering`);
            }
            
            const result = await fileClient.query(sql, params);
          galleryRows = { rows: result.rows };
        } catch (insertError: any) {
          // If duplicate key error, rollback, reset sequence, and retry in new transaction
          if (insertError.code === '23505' || insertError.message?.includes('duplicate key') || insertError.message?.includes('unique constraint')) {
            console.warn(`Sequence conflict detected for images, rolling back and resetting sequence`);
              try {
            await fileClient.query('ROLLBACK');
                transactionActive = false;
              } catch (rollbackErr: any) {
                // Transaction might already be rolled back, but continue anyway
                console.warn('Rollback in retry (may be expected):', rollbackErr.message);
                transactionActive = false;
              }
            // Reset sequence outside transaction
              try {
            const maxIdResult = await fileClient.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM images`);
            const maxId = parseInt(maxIdResult.rows[0]?.max_id || '0');
            await fileClient.query(`SELECT setval('images_id_seq', $1, true)`, [maxId]);
            // Start new transaction and retry
            await fileClient.query('BEGIN');
                transactionActive = true;
              } catch (seqErr: any) {
                // If we can't reset sequence, mark transaction as inactive and throw original error
                transactionActive = false;
                throw insertError;
              }
              
              let sql: string;
              let params: any[];
              if (hasOrderNum && hasOriginalFields && hasStoragePaths) {
                sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description, order_num,
                  original_width, original_height, original_file_bytes, original_mime, original_filename, storage_paths) 
                 VALUES ($1, $2, $3, $4, 4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`;
                params = [
                  actressId, galleryDbPath, finalGalleryWidth, finalGalleryHeight, 'image/jpeg', galleryFileSize, galleryDescription, orderNum,
                  originalWidth, originalHeight, originalFileBytes, originalMime, originalFilename,
                  JSON.stringify(storagePaths)
                ];
              } else if (hasOrderNum && hasOriginalFields) {
                sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description, order_num,
                  original_width, original_height, original_file_bytes, original_mime, original_filename) 
                 VALUES ($1, $2, $3, $4, 4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`;
                params = [
                  actressId, galleryDbPath, finalGalleryWidth, finalGalleryHeight, 'image/jpeg', galleryFileSize, galleryDescription, orderNum,
                  originalWidth, originalHeight, originalFileBytes, originalMime, originalFilename
                ];
              } else if (hasOrderNum && hasStoragePaths) {
                sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description, order_num, storage_paths) 
                 VALUES ($1, $2, $3, $4, 4, $5, $6, $7, $8, $9) RETURNING id`;
                params = [
                  actressId, galleryDbPath, finalGalleryWidth, finalGalleryHeight, 'image/jpeg', galleryFileSize, galleryDescription, orderNum,
                  JSON.stringify(storagePaths)
                ];
              } else if (hasOrderNum) {
                sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description, order_num) 
                 VALUES ($1, $2, $3, $4, 4, $5, $6, $7, $8) RETURNING id`;
                params = [actressId, galleryDbPath, finalGalleryWidth, finalGalleryHeight, 'image/jpeg', galleryFileSize, galleryDescription, orderNum];
              } else {
                sql = `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description) 
                 VALUES ($1, $2, $3, $4, 4, $5, $6, $7) RETURNING id`;
                params = [actressId, galleryDbPath, finalGalleryWidth, finalGalleryHeight, 'image/jpeg', galleryFileSize, galleryDescription];
              }
              
              const result = await fileClient.query(sql, params);
            galleryRows = { rows: result.rows };
          } else {
            throw insertError;
          }
        }

        galleryImageId = galleryRows.rows[0]?.id;
      }

        // ============================================
        // STEP 4: CREATE THUMBNAIL
        // ============================================
      // Create thumbnail (mytp = 3) from gallery image buffer
      // Use the gallery buffer we already have in memory
      const thumbnailBuffer = await sharp(galleryBuffer)
        .resize(200, 250, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      const thumbFileName = `thumb${baseFileName}.jpg`;
      const thumbDbPath = `/${folderName}/${actressId}/${thumbFileName}`;
      const thumbStoragePath = `${folderName}/${actressId}/${thumbFileName}`;
      
      // Upload thumbnail to Supabase storage (glamourgirls_images bucket)
      await uploadToSupabase(supabase, 'glamourgirls_images', thumbStoragePath, thumbnailBuffer, 'image/jpeg');
        storagePaths.push(`glamourgirls_images:${thumbStoragePath}`);

      // Get thumbnail dimensions
      const thumbMeta = await sharp(thumbnailBuffer).metadata();

      // Get thumbnail file size
      const thumbFileSize = thumbnailBuffer.length;

        // Insert thumbnail into database
        let thumbRows: any;
        try {
          let sql: string;
          let params: any[];
          
          if (hasStoragePaths) {
            sql = `INSERT INTO images (girlid, path, width, height, mytp, thumbid, mimetype, sz, storage_paths) 
             VALUES ($1, $2, $3, $4, 3, $5, $6, $7, $8) RETURNING id`;
            params = [
              actressId, thumbDbPath, thumbMeta.width || 200, thumbMeta.height || 250, galleryImageId, 'image/jpeg', thumbFileSize,
              JSON.stringify([`glamourgirls_images:${thumbStoragePath}`])
            ];
          } else {
            sql = `INSERT INTO images (girlid, path, width, height, mytp, thumbid, mimetype, sz) 
             VALUES ($1, $2, $3, $4, 3, $5, $6, $7) RETURNING id`;
            params = [
              actressId, thumbDbPath, thumbMeta.width || 200, thumbMeta.height || 250, galleryImageId, 'image/jpeg', thumbFileSize
            ];
          }
          
          const result = await fileClient.query(sql, params);
          thumbRows = { rows: result.rows };
        } catch (insertError: any) {
          // If duplicate key error, rollback, reset sequence, and retry in new transaction
          if (insertError.code === '23505' || insertError.message?.includes('duplicate key') || insertError.message?.includes('unique constraint')) {
            console.warn(`Sequence conflict detected for images, rolling back and resetting sequence`);
            await fileClient.query('ROLLBACK');
            // Reset sequence outside transaction
            const maxIdResult = await fileClient.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM images`);
            const maxId = parseInt(maxIdResult.rows[0]?.max_id || '0');
            await fileClient.query(`SELECT setval('images_id_seq', $1, true)`, [maxId]);
            // Start new transaction and retry
            await fileClient.query('BEGIN');
            
            let sql: string;
            let params: any[];
            if (hasStoragePaths) {
              sql = `INSERT INTO images (girlid, path, width, height, mytp, thumbid, mimetype, sz, storage_paths) 
               VALUES ($1, $2, $3, $4, 3, $5, $6, $7, $8) RETURNING id`;
              params = [
                actressId, thumbDbPath, thumbMeta.width || 200, thumbMeta.height || 250, galleryImageId, 'image/jpeg', thumbFileSize,
                JSON.stringify([`glamourgirls_images:${thumbStoragePath}`])
              ];
            } else {
              sql = `INSERT INTO images (girlid, path, width, height, mytp, thumbid, mimetype, sz) 
               VALUES ($1, $2, $3, $4, 3, $5, $6, $7) RETURNING id`;
              params = [
                actressId, thumbDbPath, thumbMeta.width || 200, thumbMeta.height || 250, galleryImageId, 'image/jpeg', thumbFileSize
              ];
            }
            
            const result = await fileClient.query(sql, params);
            thumbRows = { rows: result.rows };
          } else {
            throw insertError;
          }
        }

        const thumbId = thumbRows.rows[0]?.id;

        // Update gallery image with thumbnail ID and final storage_paths
        if (hasStoragePaths) {
          await fileClient.query(
            `UPDATE images SET thumbid = $1, storage_paths = $2 WHERE id = $3`,
            [thumbId, JSON.stringify(storagePaths), galleryImageId]
          );
        } else {
        await fileClient.query(
          `UPDATE images SET thumbid = $1 WHERE id = $2`,
          [thumbId, galleryImageId]
        );
        }
        
        // Commit transaction - ALL async operations must be complete before this
        await fileClient.query('COMMIT');
        transactionActive = false;

        successCount += 1;
        console.log(`[Upload] [${fileIndex}/${files.length}] ✓ SUCCESS: Image ${galleryImageId}, Order: ${orderNum}, Storage paths: ${storagePaths.length}`);

        // Return AdminImage type
        const adminImage: AdminImage = {
          id: galleryImageId,
          girlId: actressId,
          orderNum: orderNum,
          originalWidth: originalWidth,
          originalHeight: originalHeight,
          originalFileBytes: originalFileBytes,
          originalMime: originalMime,
          originalFilename: originalFilename,
          thumbnailUrl: thumbDbPath,
          galleryUrl: galleryDbPath,
          hqUrl: hqStoragePath ? `/${hqStoragePath}` : null,
          storagePaths: storagePaths,
          width: galleryWidth,
          height: galleryHeight,
        };
        
        uploadedImages.push(adminImage);
        console.log(`[Upload] [${fileIndex}/${files.length}] ===== COMPLETED FILE: ${file.name} (SUCCESS) =====`);
      } catch (fileError: any) {
        // Rollback transaction if still active and client not released
        if (transactionActive && !clientReleased && fileClient) {
        try {
          await fileClient.query('ROLLBACK');
            transactionActive = false;
          } catch (rollbackError: any) {
            // Transaction might already be rolled back, ignore
            console.warn('Rollback error (may be expected):', rollbackError.message);
            transactionActive = false;
          }
        }
        
        // Cleanup: Delete any storage objects that were uploaded but DB insert failed
        // This prevents orphaned storage objects
        // NOTE: Use the shared Supabase client (created before loop) - do NOT create a new one
        if (storagePaths.length > 0) {
          try {
            // Cleanup storage objects using the shared Supabase client
            // All cleanup operations must be fully awaited before releasing DB client
            const cleanupPromises = storagePaths.map(async (sp) => {
              const [bucket, path] = sp.includes(':') ? sp.split(':') : ['glamourgirls_images', sp];
              try {
                const { error: deleteError } = await supabase.storage
                  .from(bucket)
                  .remove([path]);
                
                if (deleteError && !deleteError.message?.includes('not found')) {
                  console.warn(`[Upload] [${fileIndex}/${files.length}] Failed to cleanup storage ${bucket}/${path}: ${deleteError.message}`);
                } else {
                  console.log(`[Upload] [${fileIndex}/${files.length}] Cleaned up orphaned storage: ${bucket}/${path}`);
                }
              } catch (cleanupError: any) {
                console.warn(`[Upload] [${fileIndex}/${files.length}] Error cleaning up storage ${bucket}/${path}:`, cleanupError.message);
              }
            });
            
            // Wait for ALL cleanup operations to complete before continuing
            await Promise.all(cleanupPromises);
          } catch (cleanupError: any) {
            console.warn(`[Upload] [${fileIndex}/${files.length}] Error during storage cleanup:`, cleanupError.message);
          }
        }
        
        failureCount += 1;
        console.error(`[Upload] [${fileIndex}/${files.length}] ✗ ERROR processing file ${file.name}:`, fileError);
        const errorMsg = fileError?.message || 'Unknown error';
        // Check if it's a duplicate key error - this usually means a sequence conflict, not that the image exists
        if (errorMsg.includes('duplicate key') || errorMsg.includes('violates unique constraint')) {
          errors.push(`File "${file.name}": Database conflict occurred. Please try uploading again.`);
        } else {
          errors.push(`File "${file.name}": ${errorMsg}`);
        }
        console.log(`[Upload] [${fileIndex}/${files.length}] ===== COMPLETED FILE: ${file.name} (FAILED) =====`);
      } finally {
        // CRITICAL: Release DB client ONLY after ALL async operations complete
        // This includes: storage uploads, DB inserts, and cleanup operations
        // The client must NOT be released while any async work is still pending
        if (!clientReleased && fileClient) {
          try {
            // Rollback any active transaction before releasing
            // This must be fully awaited - no pending promises
            if (transactionActive) {
              try {
                await fileClient.query('ROLLBACK');
                console.log(`[Upload] [${fileIndex}/${files.length}] Transaction rolled back`);
              } catch (rollbackErr: any) {
                // Ignore rollback errors - transaction might already be closed or client is broken
                console.warn(`[Upload] [${fileIndex}/${files.length}] Rollback in finally (may be expected):`, rollbackErr.message);
              }
              transactionActive = false;
            }
            
            // Release the client - this must happen AFTER all async work is done
            // Do NOT release if there are any pending promises
            if (fileClient && typeof fileClient.release === 'function') {
        fileClient.release();
              console.log(`[Upload] [${fileIndex}/${files.length}] DB client released`);
            }
            clientReleased = true;
          } catch (releaseError: any) {
            // Ignore all release errors - client might already be released or in bad state
            // This is safe to ignore as the pool will handle cleanup
            clientReleased = true; // Mark as released even if error occurred
            const errorMsg = releaseError?.message || String(releaseError || '');
            if (!errorMsg.includes('already been released') && 
                !errorMsg.includes('Cannot release') &&
                !errorMsg.includes('released')) {
              // Only log if it's a truly unexpected error
              console.warn(`[Upload] [${fileIndex}/${files.length}] Client release warning:`, errorMsg);
            }
          }
        }
      }
    }
    
    // Supabase client is NOT manually released - it will be garbage collected when request ends
    // This is safe because Supabase clients are stateless and don't hold connections
    console.log(`[Upload] ===== LOOP COMPLETE =====`);
    console.log(`[Upload] Processed: ${processedCount}/${files.length}, Success: ${successCount}, Failed: ${failureCount}`);

    // ============================================
    // STEP 3: HARD SAFETY GUARDS (MANDATORY)
    // ============================================
    // CRITICAL: Verify that ALL files were processed
    if (processedCount !== files.length) {
      const errorMsg = `CRITICAL: Loop processed ${processedCount} files but received ${files.length} files. This indicates an early exit or loop failure.`;
      console.error(`[Upload] ${errorMsg}`);
      await releaseLock();
      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
          images: uploadedImages,
          errors: [...errors, errorMsg],
          details: `Expected to process ${files.length} files, but only ${processedCount} were processed.`,
        },
        { status: 500 }
      );
    }
    
    // CRITICAL: Verify that DB inserts match expected count
    if (uploadedImages.length + errors.length !== files.length) {
      const errorMsg = `CRITICAL: Upload mismatch - ${uploadedImages.length} succeeded + ${errors.length} failed = ${uploadedImages.length + errors.length}, but expected ${files.length} total.`;
      console.error(`[Upload] ${errorMsg}`);
      await releaseLock();
      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
          images: uploadedImages,
          errors: [...errors, errorMsg],
          details: `Expected ${files.length} total results (success + failure), but got ${uploadedImages.length + errors.length}.`,
        },
        { status: 500 }
      );
    }

    // ============================================
    // STEP 4: RETURN TYPED RESPONSE (AFTER ALL UPLOADS FINISH)
    // ============================================
    // CRITICAL: This response is sent ONLY after ALL files have been processed
    // All DB clients have been released, all Supabase operations are complete
    // The Supabase client will be garbage collected when the request ends (no manual cleanup needed)
    console.log(`[Upload] ✓ Request complete: ${uploadedImages.length} succeeded, ${errors.length} failed out of ${files.length} total file(s)`);

    const response: UploadImageResponse = {
      success: errors.length === 0 || uploadedImages.length > 0,
      images: uploadedImages,
    };

    if (errors.length > 0 && uploadedImages.length === 0) {
      // All files failed
      console.error(`[Upload] All ${files.length} file(s) failed to upload`);
      const errorResponse: any = {
        ...response,
        success: false,
        error: 'Failed to upload images',
        details: errors.join('; '),
      };
      
      // Add debug info if debug mode is enabled
      if (isDebugMode) {
        errorResponse.debug = {
          filesReceived: files.length,
          filesProcessed: processedCount,
          filesSucceeded: successCount,
          filesFailed: failureCount,
          insertedCount: uploadedImages.length,
          errors: errors,
        };
      }
      
      return NextResponse.json(errorResponse, { status: 500 });
    } else if (errors.length > 0) {
      // Some files succeeded, some failed
      console.warn(`[Upload] Partial success: ${uploadedImages.length} succeeded, ${errors.length} failed`);
      response.message = `Successfully uploaded ${uploadedImages.length} image(s), ${errors.length} failed`;
      response.errors = errors;
    } else {
      console.log(`[Upload] All ${uploadedImages.length} file(s) uploaded successfully`);
      response.message = `Successfully uploaded ${uploadedImages.length} image(s)`;
    }

    // Add debug info if debug mode is enabled
    if (isDebugMode) {
      (response as any).debug = {
        filesReceived: files.length,
        filesProcessed: processedCount,
        filesSucceeded: successCount,
        filesFailed: failureCount,
        insertedCount: uploadedImages.length,
        insertedIds: uploadedImages.map(img => img.id),
      };
    }

    // Release lock before returning success
    await releaseLock();
    
    return NextResponse.json(response);
  } catch (error) {
    const err = error as any;
    console.error('Error uploading images:', err);
    
    // Release lock on error if it was acquired
    // Use variables from outer scope (declared before try block)
    try {
      if (lockClient && lockAcquired && lockKey > 0) {
        try {
          await lockClient.query(`SELECT pg_advisory_unlock($1)`, [lockKey]);
          console.log(`[Upload] Released lock in catch block for actress ${actressId}`);
        } catch (unlockError: any) {
          console.error(`[Upload] Error releasing lock in catch block:`, unlockError);
        } finally {
          if (lockClient && typeof lockClient.release === 'function') {
            lockClient.release();
          }
        }
      } else if (lockClient) {
        // If lock wasn't acquired, just release the client
        if (typeof lockClient.release === 'function') {
          lockClient.release();
        }
      }
    } catch (releaseError) {
      // Ignore errors releasing lock on error path - lock may not have been acquired
      console.error('Error releasing lock in catch block:', releaseError);
    }
    
    return NextResponse.json(
      {
        error: 'Failed to upload images',
        details: err instanceof Error ? err.message : String(err || 'Unknown error'),
      },
      { status: 500 }
    );
  }
}

