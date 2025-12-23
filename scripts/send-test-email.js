// Quick script to send a test email for an existing order
const fs = require('fs');
const path = require('path');

const orderId = process.argv[2] || 'ORD-1765105580380-C73D01F8';

// Read orders file
const ordersFile = path.join(__dirname, '../data/orders.json');
const orders = JSON.parse(fs.readFileSync(ordersFile, 'utf-8'));

// Find the order
const order = orders.find(o => o.orderId === orderId);

if (!order) {
  console.error('Order not found:', orderId);
  process.exit(1);
}

console.log('Found order:', order.orderId);
console.log('Email:', order.email);
console.log('Download code:', order.downloadCode);
console.log('Items:', order.items.length);

// Call the API to send email
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

fetch(`${baseUrl}/api/checkout/send-email`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: order.email,
    orderId: order.orderId,
    downloadCode: order.downloadCode,
    downloadLink: order.downloadLink,
    items: order.items,
    total: order.total,
  }),
})
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('✅ Email sent successfully!');
      console.log('Message ID:', data.messageId);
    } else {
      console.error('❌ Failed to send email:', data.error);
      if (data.skipped) {
        console.log('\n⚠️  Email service not configured. Please add RESEND_API_KEY to .env.local');
      }
    }
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    console.log('\n⚠️  Make sure your Next.js server is running on', baseUrl);
  });

