// Hybrid order store: uses file-based storage for persistence
// Also maintains in-memory cache for fast access

import * as fileStore from './orderFileStore';

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

// In-memory cache (for fast access)
const orderCache = new Map<string, Order>();
let cacheLoaded = false;

// Load cache from file
async function loadCache() {
  if (cacheLoaded) return;
  try {
    const orders = await fileStore.getAllOrders();
    orderCache.clear();
    for (const order of orders) {
      orderCache.set(order.orderId, order);
      orderCache.set(order.downloadCode, order);
      orderCache.set(order.downloadCode.toUpperCase(), order);
    }
    cacheLoaded = true;
    console.log('Order cache loaded:', orders.length, 'orders');
  } catch (error) {
    console.error('Error loading order cache:', error);
  }
}

export async function saveOrder(order: Order) {
  // Save to file (best-effort)
  // NOTE: On serverless platforms (e.g. Vercel) the filesystem can be read-only,
  // which would otherwise crash demo checkout with EROFS/EPERM.
  try {
    await fileStore.saveOrder(order);
  } catch (error) {
    console.error('[OrderStore] Failed to persist order to filesystem (continuing in-memory):', error);
  }
  
  // Update cache
  orderCache.set(order.orderId, order);
  orderCache.set(order.downloadCode, order);
  orderCache.set(order.downloadCode.toUpperCase(), order);
  // Mark cache loaded so we don't wipe in-memory orders by trying to reload from a read-only filesystem.
  cacheLoaded = true;
  
  console.log('Order saved:', order.orderId, 'Download code:', order.downloadCode);
}

export async function getOrderById(orderId: string): Promise<Order | undefined> {
  await loadCache();
  const order = orderCache.get(orderId);
  if (order) return order;
  
  // Fallback to file if not in cache
  return await fileStore.getOrderById(orderId);
}

export async function getOrderByCode(code: string, refreshCache = false): Promise<Order | undefined> {
  if (refreshCache) {
    // Force reload from file to get fresh data
    cacheLoaded = false;
    await loadCache();
  } else {
    await loadCache();
  }
  
  const upperCode = code.toUpperCase();
  
  // Try cache first
  let order = orderCache.get(upperCode);
  if (order) return order;
  
  // Try case-insensitive search in cache
  for (const [key, value] of orderCache.entries()) {
    if (key.toUpperCase() === upperCode || value.downloadCode.toUpperCase() === upperCode) {
      return value;
    }
  }
  
  // Fallback to file
  const fileOrder = await fileStore.getOrderByCode(code);
  if (fileOrder) {
    // Update cache with fresh data
    orderCache.set(fileOrder.orderId, fileOrder);
    orderCache.set(fileOrder.downloadCode, fileOrder);
    orderCache.set(fileOrder.downloadCode.toUpperCase(), fileOrder);
  }
  return fileOrder;
}

export async function markOrderAsUsed(code: string) {
  const order = await getOrderByCode(code);
  if (order) {
    order.used = true;
    await saveOrder(order);
    console.log('Order marked as used:', code);
  }
}

export async function getAllOrders(): Promise<Order[]> {
  await loadCache();
  const orders: Order[] = [];
  const seen = new Set<string>();
  
  for (const [key, order] of orderCache.entries()) {
    if (!seen.has(order.orderId)) {
      orders.push(order);
      seen.add(order.orderId);
    }
  }
  
  return orders.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// Export logDownload for use in download API
// Returns true if code was marked as used (all images downloaded), false otherwise
export async function logDownload(orderId: string, imageId: string): Promise<boolean> {
  const { logDownload: fileLogDownload } = await import('./orderFileStore');
  const wasMarkedAsUsed = await fileLogDownload(orderId, imageId);
  
  // Refresh cache if order was updated
  if (wasMarkedAsUsed) {
    const order = await fileStore.getOrderById(orderId);
    if (order) {
      orderCache.set(order.orderId, order);
      orderCache.set(order.downloadCode, order);
      orderCache.set(order.downloadCode.toUpperCase(), order);
    }
  }
  
  return wasMarkedAsUsed;
}

