// Direct test script that uses Resend directly (requires RESEND_API_KEY in environment)
require('dotenv').config({ path: '.env.local' });
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

const orderId = process.argv[2] || 'ORD-1765105580380-C73D01F8';

if (!process.env.RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY not found in .env.local');
  console.log('\nPlease:');
  console.log('1. Create .env.local file in the gg26 folder');
  console.log('2. Add: RESEND_API_KEY="re_your_api_key_here"');
  console.log('3. Get your API key from: https://resend.com/api-keys');
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

// Read orders file
const ordersFile = path.join(__dirname, '../data/orders.json');
const orders = JSON.parse(fs.readFileSync(ordersFile, 'utf-8'));

// Find the order
const order = orders.find(o => o.orderId === orderId);

if (!order) {
  console.error('Order not found:', orderId);
  process.exit(1);
}

console.log('📧 Sending test email...');
console.log('Order:', order.orderId);
console.log('To:', order.email);
console.log('Download Code:', order.downloadCode);
console.log('Items:', order.items.length);

// Format items list
const itemsList = order.items.map((item, index) => {
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

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const fullDownloadLink = `${baseUrl}${order.downloadLink}`;

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
          <p style="margin: 5px 0;"><strong>Order ID:</strong> ${order.orderId}</p>
          <p style="margin: 5px 0;"><strong>Total:</strong> $${order.total.toFixed(2)}</p>
          <p style="margin: 5px 0;"><strong>Items:</strong> ${order.items.length} HQ ${order.items.length === 1 ? 'Image' : 'Images'}</p>
        </div>

        <div style="background-color: #fff8e1; padding: 20px; border-left: 4px solid #1890ff; margin: 20px 0;">
          <h3 style="color: #8b7355; margin-top: 0;">Your Download Code:</h3>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #1890ff; text-align: center; margin: 10px 0;">
            ${order.downloadCode}
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
            <li>Enter your download code: <strong>${order.downloadCode}</strong></li>
            <li>Click "Download" for each image</li>
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

// Use Resend's default domain for testing (no verification needed)
const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

resend.emails.send({
  from: fromEmail,
  to: order.email,
  subject: `Your HQ Images Download - Order ${order.orderId}`,
  html: emailHtml,
})
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Error sending email:', error);
      process.exit(1);
    }
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', data?.id);
    console.log(`\n📬 Check your inbox: ${order.email}`);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

