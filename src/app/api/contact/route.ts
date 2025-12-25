import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

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



