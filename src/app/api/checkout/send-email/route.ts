import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend - API key from environment variable
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, orderId, downloadCode, downloadLink, items, total } = body;

    if (!email || !orderId || !downloadCode || !downloadLink) {
      return NextResponse.json(
        { success: false, error: 'Missing required email data' },
        { status: 400 }
      );
    }

    // Only send email if API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.log('RESEND_API_KEY not configured, skipping email send');
      return NextResponse.json({
        success: false,
        error: 'Email service not configured',
        skipped: true,
      });
    }

    // Format items list for email
    const itemsList = items.map((item: any, index: number) => {
      const sizeInfo = item.width && item.height 
        ? `${item.width} × ${item.height} px` 
        : '';
      const fileSize = item.fileSizeMB ? `${item.fileSizeMB} MB` : '';
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${index + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${item.actressName}</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${sizeInfo}${fileSize ? ` • ${fileSize}` : ''}</td>
        </tr>
      `;
    }).join('');

    // Get base URL from environment variable or use default
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const fullDownloadLink = `${baseUrl}${downloadLink}`;

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your HQ Images Download</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #dacda1; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #8b7355; margin: 0;">Glamour Girls of the Silver Screen</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border: 1px solid #dacda1; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #8b7355; margin-top: 0;">Thank You for Your Purchase!</h2>
            
            <p>Your order has been confirmed. Here are your download details:</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Order ID:</strong> ${orderId}</p>
              <p style="margin: 5px 0;"><strong>Total:</strong> $${total.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Items:</strong> ${items.length} HQ ${items.length === 1 ? 'Image' : 'Images'}</p>
            </div>

            <div style="background-color: #fff8e1; padding: 20px; border-left: 4px solid #1890ff; margin: 20px 0;">
              <h3 style="color: #8b7355; margin-top: 0;">Your Download Code:</h3>
              <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #1890ff; text-align: center; margin: 10px 0;">
                ${downloadCode}
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${fullDownloadLink}" 
                 style="display: inline-block; background-color: #1890ff; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Download Your Images
              </a>
            </div>

            <div style="margin: 30px 0;">
              <h3 style="color: #8b7355;">Purchased Images:</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                  <tr style="background-color: #f5f5f5;">
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">#</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Actress</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Size</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsList}
                </tbody>
              </table>
            </div>

            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="color: #1976d2; margin-top: 0;">How to Download:</h4>
              <ol style="margin: 10px 0; padding-left: 20px;">
                <li>Click the "Download Your Images" button above, or visit: <a href="${fullDownloadLink}" style="color: #1976d2;">${fullDownloadLink}</a></li>
                <li>Enter your download code: <strong>${downloadCode}</strong></li>
                <li>Click "Download" for each image, or use "Download All" if available</li>
                <li>Your HQ images will automatically download to your device</li>
              </ol>
              <p style="margin-top: 10px; font-size: 12px; color: #666;">
                <strong>Note:</strong> This download code can be used once. After downloading all images, the code will expire.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px; margin: 0;">
              If you have any questions or need assistance, please contact our support team.
            </p>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend
    // Use Resend's default domain for testing (no verification needed)
    // Once domain is verified, you can use: 'Glamour Girls <web@glamourgirlsofthesilverscreen.com>'
    // For now, use Resend's default domain which works without verification
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Your HQ Images Download - Order ${orderId}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Resend email error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to send email' },
        { status: 500 }
      );
    }

    console.log('Email sent successfully:', data);
    return NextResponse.json({
      success: true,
      messageId: data?.id,
    });
  } catch (error: any) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}

