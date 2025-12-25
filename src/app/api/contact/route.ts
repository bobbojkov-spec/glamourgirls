import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Resend } from 'resend';

export const runtime = 'nodejs';

interface ContactFormData {
  name: string;
  email: string;
  message: string;
  turnstileToken?: string;
}

/**
 * POST /api/contact
 * Submit contact form with Turnstile verification
 */
export async function POST(request: NextRequest) {
  try {
    const body: ContactFormData = await request.json();
    const { name, email, message, turnstileToken } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Verify Turnstile token if provided
    if (turnstileToken) {
      const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
      
      if (turnstileSecret) {
        try {
          const verifyResponse = await fetch(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                secret: turnstileSecret,
                response: turnstileToken,
                remoteip: request.headers.get('x-forwarded-for') || 
                         request.headers.get('x-real-ip') || 
                         'unknown',
              }),
            }
          );

          const verifyData = await verifyResponse.json();
          
          if (!verifyData.success) {
            console.error('Turnstile verification failed:', verifyData);
            return NextResponse.json(
              { success: false, error: 'Human verification failed. Please try again.' },
              { status: 400 }
            );
          }
        } catch (verifyError) {
          console.error('Error verifying Turnstile token:', verifyError);
          // Continue without verification if Turnstile is misconfigured
          // In production, you might want to fail here
        }
      }
    }

    // Sanitize inputs (basic sanitization)
    const sanitizedName = name.trim().substring(0, 200);
    const sanitizedEmail = email.trim().substring(0, 200);
    const sanitizedMessage = message.trim().substring(0, 5000);

    // Store in database (create contact_messages table if it doesn't exist)
    try {
      // Check if table exists, create if not
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS contact_messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(200) NOT NULL,
          email VARCHAR(200) NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ip_address VARCHAR(45),
          user_agent TEXT
        )
      `);

      // Insert contact message
      const ipAddress = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       null;
      const userAgent = request.headers.get('user-agent') || null;

      await pool.execute(
        `INSERT INTO contact_messages (name, email, message, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?)`,
        [sanitizedName, sanitizedEmail, sanitizedMessage, ipAddress, userAgent]
      );

      console.log(`Contact form submitted: ${sanitizedEmail} - ${sanitizedName}`);

      // Send email notification
      // For testing: send to the sender's email
      // Later: send to admin email (set ADMIN_EMAIL env var)
      const adminEmail = process.env.ADMIN_EMAIL || sanitizedEmail; // Default to sender for testing
      const recipientEmail = process.env.NODE_ENV === 'production' && process.env.ADMIN_EMAIL 
        ? process.env.ADMIN_EMAIL 
        : sanitizedEmail; // In production with admin email, use admin. Otherwise use sender for testing

      if (process.env.RESEND_API_KEY) {
        try {
          const resend = new Resend(process.env.RESEND_API_KEY);
          const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
          
          const emailHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #dacda1; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="color: #8b7355; margin: 0;">Glamour Girls of the Silver Screen</h1>
                </div>
                
                <div style="background-color: #ffffff; padding: 30px; border: 1px solid #dacda1; border-top: none; border-radius: 0 0 8px 8px;">
                  <h2 style="color: #8b7355; margin-top: 0;">New Contact Form Submission</h2>
                  
                  <p><strong>From:</strong> ${sanitizedName} (${sanitizedEmail})</p>
                  
                  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Message:</strong></p>
                    <p style="margin: 10px 0 0 0; white-space: pre-wrap;">${sanitizedMessage}</p>
                  </div>
                  
                  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                  
                  <p style="color: #666; font-size: 12px; margin: 0;">
                    This message was submitted through the contact form on Glamour Girls of the Silver Screen.
                  </p>
                </div>
              </body>
            </html>
          `;

          await resend.emails.send({
            from: fromEmail,
            to: recipientEmail,
            replyTo: sanitizedEmail, // Allow replying directly to the sender
            subject: `New Contact Form Message from ${sanitizedName}`,
            html: emailHtml,
          });

          console.log(`Contact form email sent to ${recipientEmail}`);
        } catch (emailError: any) {
          console.error('Error sending contact form email:', emailError);
          // Don't fail the request if email fails - still save to DB
        }
      } else {
        console.log('RESEND_API_KEY not configured, skipping email send');
      }

      return NextResponse.json({
        success: true,
        message: 'Your message has been sent successfully. We will get back to you soon!',
      });
    } catch (dbError: any) {
      console.error('Database error saving contact message:', dbError);
      
      // If table creation fails, still return success (graceful degradation)
      // In production, you might want to log to an external service
      return NextResponse.json({
        success: true,
        message: 'Your message has been received. We will get back to you soon!',
      });
    }
  } catch (error: any) {
    console.error('Error processing contact form:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process your message. Please try again later.' },
      { status: 500 }
    );
  }
}



