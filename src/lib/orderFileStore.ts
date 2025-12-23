import fs from 'fs/promises';
import path from 'path';

export interface Order {
  orderId: string;
  email: string;
  paymentMethod: string;
  items: Array<{
    imageId: string;
    actressId: string;
    actressName: string;
    hqUrl: string;
    imageUrl: string;
    width?: number;
    height?: number;
    fileSizeMB?: number;
  }>;
  total: number;
  downloadCode: string;
  downloadLink: string;
  createdAt: string;
  used: boolean;
  downloads?: Array<{
    imageId: string;
    downloadedAt: string;
  }>;
}

const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json');
const DOWNLOADS_FILE = path.join(process.cwd(), 'data', 'downloads.json');

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Load orders from file
export async function loadOrders(): Promise<Order[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(ORDERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist yet, return empty array
      return [];
    }
    console.error('Error loading orders:', error);
    return [];
  }
}

// Save orders to file
export async function saveOrders(orders: Order[]): Promise<void> {
  try {
    await ensureDataDir();
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving orders:', error);
    throw error;
  }
}

// Save a single order
export async function saveOrder(order: Order): Promise<void> {
  const orders = await loadOrders();
  
  // Check if order already exists
  const existingIndex = orders.findIndex(o => o.orderId === order.orderId);
  
  if (existingIndex >= 0) {
    // Update existing order
    orders[existingIndex] = order;
  } else {
    // Add new order
    orders.push(order);
  }
  
  await saveOrders(orders);
}

// Get order by ID
export async function getOrderById(orderId: string): Promise<Order | undefined> {
  const orders = await loadOrders();
  return orders.find(o => o.orderId === orderId);
}

// Get order by download code
export async function getOrderByCode(code: string): Promise<Order | undefined> {
  const orders = await loadOrders();
  const upperCode = code.toUpperCase();
  return orders.find(o => o.downloadCode.toUpperCase() === upperCode);
}

// Check if all images in an order have been downloaded
export function areAllImagesDownloaded(order: Order): boolean {
  if (!order.downloads || order.downloads.length === 0) {
    return false;
  }
  
  const downloadedImageIds = new Set(order.downloads.map(d => d.imageId));
  const allImageIds = new Set(order.items.map(item => item.imageId));
  
  // Check if every image in the order has been downloaded
  return allImageIds.size > 0 && Array.from(allImageIds).every(id => downloadedImageIds.has(id));
}

// Mark order as used
export async function markOrderAsUsed(code: string): Promise<void> {
  const order = await getOrderByCode(code);
  if (order) {
    order.used = true;
    await saveOrder(order);
  }
}

// Log a download and check if all images are downloaded (mark as used if so)
export async function logDownload(orderId: string, imageId: string): Promise<boolean> {
  const order = await getOrderById(orderId);
  if (order) {
    if (!order.downloads) {
      order.downloads = [];
    }
    
    // Check if this image was already downloaded
    const existingDownload = order.downloads.find(d => d.imageId === imageId);
    if (!existingDownload) {
      order.downloads.push({
        imageId,
        downloadedAt: new Date().toISOString(),
      });
      await saveOrder(order);
    }
    
    // Check if all images have been downloaded - if so, mark code as used
    if (areAllImagesDownloaded(order)) {
      if (!order.used) {
        order.used = true;
        await saveOrder(order);
        console.log(`All images downloaded for order ${orderId}, marking code as used`);
        return true; // Code is now used
      }
    }
  }
  
  // Also log to separate downloads file for analytics
  try {
    await ensureDataDir();
    let downloads: any[] = [];
    try {
      const data = await fs.readFile(DOWNLOADS_FILE, 'utf-8');
      downloads = JSON.parse(data);
    } catch {
      // File doesn't exist, start with empty array
    }
    
    downloads.push({
      orderId,
      imageId,
      downloadedAt: new Date().toISOString(),
    });
    
    await fs.writeFile(DOWNLOADS_FILE, JSON.stringify(downloads, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error logging download:', error);
  }
  
  return false; // Code is still active (or order not found)
}

// Get all orders
export async function getAllOrders(): Promise<Order[]> {
  return loadOrders();
}

