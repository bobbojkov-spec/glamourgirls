import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { saveOrder } from '@/lib/orderStore';

// Generate a unique download code
function generateDownloadCode(): string {
  // Generate a 12-character alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, paymentMethod, items, total } = body;

    // Validate input
    if (!email || !paymentMethod || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Generate order ID and download code
    const orderId = `ORD-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
    const downloadCode = generateDownloadCode();

    console.log('Processing payment for items:', items.length);
    
    // Fetch HQ image URLs and gallery images (for thumbnails) from database
    // Note: imageIds in cart are gallery image IDs (mytp=4), not HQ image IDs (mytp=5)
    const imageIds = items.map((item: any) => parseInt(item.imageId)).filter(id => !isNaN(id));
    console.log('Gallery Image IDs from cart:', imageIds);
    
    let hqImages: any[] = [];
    let galleryImages: any[] = [];
    let thumbnails: any[] = [];
    
    if (imageIds.length > 0) {
      try {
        // First, fetch the gallery images to get their IDs and actress IDs
        const galleryPlaceholders = imageIds.map(() => '?').join(',');
        const [galleryResults] = await pool.execute(
          `SELECT i.id, i.path, i.girlid, i.thumbid, g.nm as actressName
           FROM images i
           JOIN girls g ON i.girlid = g.id
           WHERE i.id IN (${galleryPlaceholders}) AND i.mytp = 4`,
          imageIds
        ) as any[];
        galleryImages = Array.isArray(galleryResults) ? galleryResults : [];
        console.log('Found gallery images:', galleryImages.length);
        
        // Fetch thumbnails for these gallery images
        const thumbnailIds = galleryImages.map((img: any) => img.thumbid).filter((id: any) => id);
        if (thumbnailIds.length > 0) {
          const thumbPlaceholders = thumbnailIds.map(() => '?').join(',');
          const [thumbResults] = await pool.execute(
            `SELECT id, path, thumbid FROM images WHERE id IN (${thumbPlaceholders}) AND mytp = 3`,
            thumbnailIds
          ) as any[];
          thumbnails = Array.isArray(thumbResults) ? thumbResults : [];
          console.log('Found thumbnails:', thumbnails.length);
        }

        // Now find HQ images by matching galleryId - 1 or galleryId + 1
        // Also fetch all HQ images for the actresses as fallback
        const actressIds = [...new Set(galleryImages.map((img: any) => img.girlid).filter(id => id))];
        if (actressIds.length > 0) {
          const actressPlaceholders = actressIds.map(() => '?').join(',');
          const [hqResults] = await pool.execute(
            `SELECT i.id, i.path, i.girlid, i.width, i.height, i.sz, g.nm as actressName
             FROM images i
             JOIN girls g ON i.girlid = g.id
             WHERE i.girlid IN (${actressPlaceholders}) AND i.mytp = 5
             ORDER BY i.id ASC`,
            actressIds
          ) as any[];
          hqImages = Array.isArray(hqResults) ? hqResults : [];
          console.log('Found HQ images for actresses:', hqImages.length);
        }
      } catch (dbError) {
        console.error('Database error fetching images:', dbError);
        // Continue without images - use fallback URLs
      }
    }

    // Map items with HQ URLs, thumbnails, dimensions, and file size
    const orderItems = await Promise.all(items.map(async (item: any) => {
      // Find the gallery image first (item.imageId is a gallery image ID)
      const galleryImage = galleryImages.find((img: any) => img.id === parseInt(item.imageId));
      
      // Find the corresponding HQ image using ID matching (galleryId - 1 or + 1)
      let hqImage = null;
      if (galleryImage) {
        const galleryId = parseInt(galleryImage.id);
        // Try galleryId - 1 first (most common pattern)
        hqImage = hqImages.find((hq: any) => parseInt(hq.id) === galleryId - 1 && hq.girlid === galleryImage.girlid);
        // If not found, try galleryId + 1
        if (!hqImage) {
          hqImage = hqImages.find((hq: any) => parseInt(hq.id) === galleryId + 1 && hq.girlid === galleryImage.girlid);
        }
        // If still not found, try any HQ image for this actress (fallback)
        if (!hqImage) {
          hqImage = hqImages.find((hq: any) => hq.girlid === galleryImage.girlid);
        }
      }
      
      const hqUrl = hqImage ? hqImage.path : (item.imageUrl || item.thumbnailUrl || '');
      
      // Get dimensions and file size
      let width = hqImage?.width || item.width || 0;
      let height = hqImage?.height || item.height || 0;
      let fileSizeMB = 0;
      
      // Get file size from database (sz column) or file system
      if (hqImage?.sz) {
        fileSizeMB = parseFloat((hqImage.sz / (1024 * 1024)).toFixed(2));
      } else if (hqUrl) {
        // Try to get from file system
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
          const cleanPath = hqUrl.startsWith('/') ? hqUrl.slice(1) : hqUrl;
          const fullPath = path.default.join(process.cwd(), 'public', cleanPath);
          const stats = await fs.stat(fullPath);
          fileSizeMB = parseFloat((stats.size / (1024 * 1024)).toFixed(2));
        } catch (e) {
          console.error('Error getting file size:', e);
        }
      }
      
      // Find gallery image for thumbnail - use the actual thumbnail from database (mytp = 3)
      let thumbnailUrl = '';
      if (galleryImage) {
        // Find the thumbnail that matches this gallery image's thumbid
        const thumbnail = thumbnails.find((thumb: any) => thumb.id === galleryImage.thumbid);
        if (thumbnail) {
          thumbnailUrl = thumbnail.path;
        } else {
          // Fallback: try to find thumbnail by path pattern (thumb{id})
          const thumbByPattern = thumbnails.find((thumb: any) => 
            thumb.path?.includes(`thumb${galleryImage.id}`)
          );
          if (thumbByPattern) {
            thumbnailUrl = thumbByPattern.path;
          } else {
            // Final fallback to gallery image path
            thumbnailUrl = galleryImage.path;
          }
        }
      } else if (hqImage) {
        // Fallback: if we have HQ but no gallery, try to find gallery image
        const fallbackGallery = galleryImages.find((img: any) => img.girlid === hqImage.girlid);
        if (fallbackGallery) {
          const thumb = thumbnails.find((t: any) => t.id === fallbackGallery.thumbid);
          thumbnailUrl = thumb?.path || fallbackGallery.path;
        }
      }
      
      return {
        imageId: item.imageId,
        actressId: item.actressId,
        actressName: item.actressName,
        hqUrl: hqUrl,
        imageUrl: thumbnailUrl || item.imageUrl || hqUrl, // Use actual thumbnail URL from database
        thumbnailUrl: thumbnailUrl || item.thumbnailUrl || '', // Store thumbnail separately
        width: width,
        height: height,
        fileSizeMB: fileSizeMB,
      };
    }));
    
    console.log('Order items prepared:', orderItems.length);

    // Create order record
    const order = {
      orderId,
      email,
      paymentMethod,
      items: orderItems,
      total,
      downloadCode,
      downloadLink: `/download/${downloadCode}`,
      createdAt: new Date().toISOString(),
      used: false,
    };

    // Store order using shared store.
    // IMPORTANT: In demo mode we must not fail payment due to persistence issues on serverless filesystems.
    // `saveOrder` is best-effort and falls back to in-memory if file writes fail.
    await saveOrder(order);

    // Send confirmation email (non-blocking - don't fail payment if email fails)
    try {
      // Use internal API call (server-to-server)
      const emailResponse = await fetch(`${request.nextUrl.origin}/api/checkout/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          orderId,
          downloadCode,
          downloadLink: order.downloadLink,
          items: orderItems,
          total,
        }),
      });

      if (emailResponse.ok) {
        console.log('Confirmation email sent successfully');
      } else {
        const emailError = await emailResponse.json();
        console.error('Failed to send email:', emailError);
        // Don't fail the payment if email fails
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the payment if email fails
    }

    // In a real implementation, you would:
    // 1. Create a Stripe Payment Intent
    // 2. Process the payment
    // 3. Save order to database
    // 4. Send confirmation email (done above)

    // For demo: simulate successful payment
    console.log('Demo Payment Processed:', {
      orderId,
      email,
      paymentMethod,
      total,
      downloadCode,
      itemCount: orderItems.length,
    });

    // Return full order data so confirmation page can display it immediately
    return NextResponse.json({
      success: true,
      orderId,
      downloadCode,
      downloadLink: order.downloadLink,
      order: {
        orderId: order.orderId,
        email: order.email,
        downloadCode: order.downloadCode,
        downloadLink: order.downloadLink,
        items: order.items.map((item: any) => ({
          imageId: item.imageId,
          actressId: item.actressId,
          actressName: item.actressName,
          hqUrl: item.hqUrl,
          imageUrl: item.imageUrl,
          thumbnailUrl: item.thumbnailUrl || item.imageUrl || '',
          width: item.width,
          height: item.height,
          fileSizeMB: item.fileSizeMB,
        })),
        total: order.total,
      },
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process payment', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}


