'use client';

interface Order {
  orderId: string;
  email: string;
  paymentMethod: string;
  imageCount: number;
  total: number;
  createdAt: string;
  used: boolean;
  downloads?: Array<{
    imageId: string;
    downloadedAt: string;
  }>;
  items: Array<{
    imageId: string;
    actressName: string;
    imageUrl: string;
    width?: number;
    height?: number;
    fileSizeMB?: number;
  }>;
}

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
}

export default function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Generate thumbnail URL from imageUrl
  const getThumbnailUrl = (imageUrl: string) => {
    if (!imageUrl) return '';
    // If it's already a thumbnail API URL, use it
    if (imageUrl.includes('/api/images/thumbnail')) {
      return imageUrl;
    }
    // Otherwise, generate thumbnail URL
    return `/api/images/thumbnail?path=${encodeURIComponent(imageUrl)}&width=200&height=200`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h2 className="font-protest" style={{ fontSize: '14px' }}>Order Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Order Summary */}
            <div className="mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-mono">{order.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span>{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span>{order.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="capitalize">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    order.used
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {order.used ? 'Download Code Used' : 'Active'}
                </span>
              </div>
              {order.downloads && order.downloads.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Downloads:</span>
                  <span>{order.downloads.length} of {order.items.length} images</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">Total:</span>
                <span className="font-bold text-lg text-[#1890ff]">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>

            {/* Images Grid */}
            <div className="mb-6">
              <h3 className="font-protest mb-4" style={{ fontSize: '14px' }}>Purchased Images ({order.items.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {order.items.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="aspect-square relative bg-gray-100 rounded mb-2">
                      {item.imageUrl ? (
                        <img
                          src={getThumbnailUrl(item.imageUrl)}
                          alt={item.actressName}
                          className="w-full h-full object-cover rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          No preview
                        </div>
                      )}
                    </div>
                    <div className="text-xs">
                      <b className="font-medium truncate block" title={item.actressName}>
                        {item.actressName}
                      </b>
                      {(item.width || item.height || item.fileSizeMB) && (
                        <p className="text-gray-500 mt-1">
                          {item.width && item.height && `${item.width} × ${item.height} px`}
                          {item.width && item.height && item.fileSizeMB && ' • '}
                          {item.fileSizeMB && `${item.fileSizeMB} MB`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

