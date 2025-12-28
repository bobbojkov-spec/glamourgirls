'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SimpleEditor from './SimpleEditor';
import type { AdminImage } from '@/types/admin-image';

interface AdminActressFormProps {
  actress: any;
  isNew: boolean;
}

export default function AdminActressForm({ actress: initialActress, isNew }: AdminActressFormProps) {
  const router = useRouter();
  const [actress, setActress] = useState(initialActress);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Update form when initialActress changes (after data loads)
  useEffect(() => {
    setActress(initialActress);
  }, [initialActress]);

  const handleChange = (field: string, value: any) => {
    setActress((prev: any) => ({ ...prev, [field]: value }));
  };


  const handleSave = async () => {
    setSaving(true);
    try {
      const url = isNew ? '/api/admin/actresses' : `/api/admin/actresses/${actress.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actress),
      });

      if (res.ok) {
        setSaveMessage('Saved successfully!');
        setTimeout(() => {
          setSaveMessage('');
        }, 3000);
      } else {
        const error = await res.json();
        setSaveMessage(`Error: ${error.error || 'Failed to save'}`);
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving');
    } finally {
      setSaving(false);
    }
  };

  const addTimelineEvent = () => {
    setActress((prev: any) => ({
      ...prev,
      timeline: [...(prev.timeline || []), { date: '', event: '', ord: (prev.timeline?.length || 0) + 1 }],
    }));
  };

  const updateTimelineEvent = (index: number, field: string, value: string) => {
    setActress((prev: any) => {
      const timeline = [...(prev.timeline || [])];
      timeline[index] = { ...timeline[index], [field]: value, ord: timeline[index].ord || index + 1 };
      return { ...prev, timeline };
    });
  };

  const deleteTimelineEvent = (index: number) => {
    if (confirm('Are you sure you want to delete this timeline event?')) {
      setActress((prev: any) => {
        const timeline = [...(prev.timeline || [])];
        timeline.splice(index, 1);
        // Reorder remaining events
        timeline.forEach((event: any, idx: number) => {
          event.ord = idx + 1;
        });
        return { ...prev, timeline };
      });
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/images/${imageId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Refresh images from server to get updated order
        const fetchRes = await fetch(`/api/admin/actresses/${actress.id}`);
        if (fetchRes.ok) {
          const updatedActress = await fetchRes.json();
          setActress((prev: any) => ({
            ...prev,
            images: updatedActress.images || [],
          }));
        }
        alert('Image deleted successfully');
        
        // Invalidate cache to refresh image counts in listing
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('admin-girls-cache-invalidate'));
        }
      } else {
        const error = await res.json();
        alert(`Failed to delete image: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Error deleting image');
    }
  };

  const handleReorderImages = async () => {
    if (!actress.images || actress.images.length === 0) return;
    
    try {
      // Normalize order before sending: ensure 1..N with no gaps
      const sortedImages = [...actress.images].sort((a: AdminImage, b: AdminImage) => {
        const orderA = a.orderNum ?? 999999;
        const orderB = b.orderNum ?? 999999;
        if (orderA !== orderB) return orderA - orderB;
        return a.id - b.id;
      });
      
      const imagesToReorder = sortedImages.map((img: AdminImage, index: number) => ({
        id: img.id,
        orderNum: index + 1, // Normalize to 1..N
      }));
      
      console.log('[AdminActressForm] Saving image order:', imagesToReorder);
      
      const res = await fetch('/api/admin/images/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: imagesToReorder }),
      });
      
      if (res.ok) {
        // Refresh images from server
        const fetchRes = await fetch(`/api/admin/actresses/${actress.id}`);
        if (fetchRes.ok) {
          const updatedActress = await fetchRes.json();
          setActress((prev: any) => ({
            ...prev,
            images: updatedActress.images || [],
          }));
        }
        alert('Image order saved successfully');
      } else {
        const error = await res.json();
        alert(`Failed to save order: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error reordering images:', error);
      alert('Error saving image order');
    }
  };

  const updateImageOrder = (imageId: number, newOrder: number) => {
    setActress((prev: any) => {
      const images = [...(prev.images || [])];
      const imageIndex = images.findIndex((img: any) => img.id === imageId);
      if (imageIndex === -1) return prev;
      
      images[imageIndex] = { ...images[imageIndex], orderNum: newOrder };
      
      // Normalize order: ensure 1..N with no gaps
      images.sort((a: any, b: any) => {
        const orderA = a.orderNum ?? 999999;
        const orderB = b.orderNum ?? 999999;
        if (orderA !== orderB) return orderA - orderB;
        return a.id - b.id;
      });
      
      // Renormalize to 1..N
      images.forEach((img: any, idx: number) => {
        img.orderNum = idx + 1;
      });
      
      return { ...prev, images };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!actress.id && isNew) {
      alert('Please save the actress entry first before uploading images.');
      return;
    }

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('images', file);
    });
    formData.append('actressId', actress.id.toString());
    formData.append('type', type);

    try {
      const res = await fetch('/api/admin/images/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Refresh images
        const fetchRes = await fetch(`/api/admin/actresses/${actress.id}`);
        if (fetchRes.ok) {
          const updatedActress = await fetchRes.json();
          setActress((prev: any) => ({
            ...prev,
            images: updatedActress.images || [],
          }));
        }
        alert('Images uploaded successfully');
        
        // Invalidate cache to refresh image counts in listing
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('admin-girls-cache-invalidate'));
        }
        // Reset file input
        e.target.value = '';
      } else {
        const error = await res.json();
        alert(`Failed to upload: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Error uploading images');
    }
  };

  const handleHeadshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!actress.id && isNew) {
      alert('Please save the actress entry first before uploading headshot.');
      return;
    }

    const formData = new FormData();
    formData.append('headshot', file);
    formData.append('actressId', actress.id.toString());

    try {
      const res = await fetch('/api/admin/headshot/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Headshot uploaded and processed successfully! Dimensions: ${data.width}x${data.height}px`);
        // Reset file input
        e.target.value = '';
      } else {
        const error = await res.json();
        alert(`Failed to upload headshot: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error uploading headshot:', error);
      alert('Error uploading headshot');
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Action Buttons */}
      <div className="flex gap-4 items-center border-b border-gray-300 pb-4">
        <button
          onClick={() => router.push('/admin')}
          className="vintage-condensed bg-gray-500 text-white px-4 py-2 tracking-wider"
        >
          BACK
        </button>
        {saveMessage && (
          <span className={`ml-4 font-medium ${saveMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {saveMessage}
          </span>
        )}
      </div>

      {/* Basic Information Section */}
      <div className="border-b border-gray-300 pb-6">
        <h2 className="font-protest mb-4" style={{ fontSize: '14px' }}>Basic Information</h2>
        
        {/* Checkboxes */}
        <div className="flex flex-wrap gap-6 mb-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={actress.isnew === 2 || actress.isnew === '2'}
            onChange={(e) => handleChange('isnew', e.target.checked ? 2 : 1)}
          />
          <span>New:</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={actress.published === 2 || actress.published === '2'}
            onChange={(e) => handleChange('published', e.target.checked ? 2 : 1)}
          />
          <span>Published:</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={actress.isnewpix === 2 || actress.isnewpix === '2'}
            onChange={(e) => handleChange('isnewpix', e.target.checked ? 2 : 1)}
          />
          <span>New Pix:</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={actress.theirman === 1 || actress.theirman === '1'}
            onChange={(e) => handleChange('theirman', e.target.checked ? 1 : 0)}
          />
          <span>Is Their man</span>
        </label>
        </div>

        {/* Layout Dropdown */}
        <div className="mb-6">
        <label className="block mb-1 font-medium">
          Layout (Era/Decade):
        </label>
        <p className="text-sm text-gray-600 mb-2">
          Select the era/decade this actress is associated with (affects color scheme on frontend)
        </p>
        <select
          value={actress.godini}
          onChange={(e) => handleChange('godini', parseInt(e.target.value))}
          className="border border-gray-300 px-3 py-2"
        >
          <option value={1}>20-30s</option>
          <option value={2}>40s</option>
          <option value={3}>50s</option>
          <option value={4}>60s</option>
        </select>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block mb-1">First Name:</label>
          <input
            type="text"
            value={actress.firstname || ''}
            onChange={(e) => handleChange('firstname', e.target.value)}
            className="w-full border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block mb-1">Middle Names:</label>
          <input
            type="text"
            value={actress.middlenames || ''}
            onChange={(e) => handleChange('middlenames', e.target.value)}
            className="w-full border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block mb-1">Family Name:</label>
          <input
            type="text"
            value={actress.familiq || ''}
            onChange={(e) => handleChange('familiq', e.target.value)}
            className="w-full border border-gray-300 px-3 py-2"
          />
        </div>
        </div>

        {/* Sources */}
        <div>
          <label className="block mb-1 font-medium">
            Sources:
          </label>
          <p className="text-sm text-gray-600 mb-2">
            Use the Bold (B) and Italic (I) buttons to format text. The preview shows how it will appear.
          </p>
          <SimpleEditor
            value={actress.sources || ''}
            onChange={(value) => handleChange('sources', value)}
            placeholder="Enter sources here..."
            rows={4}
          />
        </div>

        {/* Name Display Preview */}
        <div className="bg-white p-4 border border-gray-300 mt-6">
        <div className="text-center">
          {actress.firstname && (
            <div className="vintage-script text-2xl text-vintage-red">
              {actress.firstname}
            </div>
          )}
          {actress.familiq && (
            <div className="font-protest text-4xl text-vintage-brown mt-2">
              {actress.familiq.toUpperCase()}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Biography / Timeline Events Section */}
      <div className="border-b border-gray-300 pb-6">
        <h3 className="font-protest mb-2" style={{ fontSize: '14px' }}>Biography / Timeline Events:</h3>
        <p className="text-sm text-gray-600 mb-3">
          Add timeline events in chronological order. Use square brackets [text] to make text italic.
        </p>
        <div className="space-y-3">
          {(actress.timeline || []).map((event: any, index: number) => (
            <div key={event.id || index} className="border border-gray-300 p-3 bg-white">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 text-center pt-2">
                  <span className="text-sm font-medium text-gray-500">#{event.ord || index + 1}</span>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Date:</label>
                    <input
                      type="text"
                      value={event.date || ''}
                      onChange={(e) => updateTimelineEvent(index, 'date', e.target.value)}
                      className="w-full border border-gray-300 px-2 py-1 text-sm"
                      placeholder="e.g., 15 May 36"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">Event:</label>
                    <SimpleEditor
                      value={event.event || ''}
                      onChange={(value) => updateTimelineEvent(index, 'event', value)}
                      placeholder="Event description"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex-shrink-0 pt-6">
                  <button
                    onClick={() => deleteTimelineEvent(index)}
                    className="vintage-condensed bg-red-600 text-white px-3 py-1.5 text-xs tracking-wider hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addTimelineEvent}
          className="mt-3 vintage-condensed text-white px-4 py-2 text-sm tracking-wider hover:bg-[#a68521] font-bold"
          style={{ backgroundColor: '#1890ff' }}
        >
          + Add Event
        </button>
        
        {/* Save Button */}
        <div className="mt-6 flex gap-4 items-center">
          <button
            onClick={handleSave}
            disabled={saving}
            className="vintage-condensed px-6 py-3 tracking-wider font-bold text-base hover:opacity-90"
            style={{ 
              backgroundColor: '#f5f5f5',
              color: '#000000',
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: '#000000',
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'SAVING...' : 'SAVE'}
          </button>
        </div>
      </div>

      {/* Recommended Books */}
      <div className="border-b border-gray-300 pb-6">
        <h3 className="font-protest mb-3" style={{ fontSize: '14px' }}>Recommended Books:</h3>
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 px-2 py-1 text-left">Order</th>
              <th className="border border-gray-300 px-2 py-1 text-left">Text for the link</th>
              <th className="border border-gray-300 px-2 py-1 text-left">Link</th>
              <th className="border border-gray-300 px-2 py-1 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {(actress.books || []).map((book: any, index: number) => (
              <tr key={index}>
                <td className="border border-gray-300 px-2 py-1">{index + 1}</td>
                <td className="border border-gray-300 px-2 py-1">{book.text}</td>
                <td className="border border-gray-300 px-2 py-1">{book.link}</td>
                <td className="border border-gray-300 px-2 py-1">
                  <button 
                    className="bg-red-600 text-white w-6 h-6 flex items-center justify-center text-sm font-bold hover:bg-red-700 rounded border border-red-700"
                    title="Delete book"
                    style={{ minWidth: '24px', minHeight: '24px' }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="mt-2 vintage-condensed bg-vintage-brown text-white px-4 py-1 text-sm tracking-wider">
          Add
        </button>
      </div>

      {/* Links */}
      <div className="border-b border-gray-300 pb-6">
        <h3 className="font-protest mb-3" style={{ fontSize: '14px' }}>Links:</h3>
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 px-2 py-1 text-left">Order</th>
              <th className="border border-gray-300 px-2 py-1 text-left">Text for the link</th>
              <th className="border border-gray-300 px-2 py-1 text-left">Link</th>
              <th className="border border-gray-300 px-2 py-1 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {(actress.links || []).map((link: any, index: number) => (
              <tr key={index}>
                <td className="border border-gray-300 px-2 py-1">{index + 1}</td>
                <td className="border border-gray-300 px-2 py-1">{link.text}</td>
                <td className="border border-gray-300 px-2 py-1">{link.url}</td>
                <td className="border border-gray-300 px-2 py-1">
                  <button 
                    className="bg-red-600 text-white w-6 h-6 flex items-center justify-center text-sm font-bold hover:bg-red-700 rounded border border-red-700"
                    title="Delete link"
                    style={{ minWidth: '24px', minHeight: '24px' }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="mt-2 vintage-condensed bg-vintage-brown text-white px-4 py-1 text-sm tracking-wider">
          Add
        </button>
      </div>

      {/* Images */}
      <div className="border-b border-gray-300 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-protest" style={{ fontSize: '14px' }}>Images:</h3>
          {actress.images && actress.images.length > 0 && (
            <button
              onClick={handleReorderImages}
              className="vintage-condensed bg-blue-600 text-white px-3 py-1 text-xs tracking-wider hover:bg-blue-700"
            >
              Save Order
            </button>
          )}
        </div>
        {actress.images && actress.images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            {[...actress.images]
              .sort((a: AdminImage, b: AdminImage) => {
                const orderA = a.orderNum ?? 999999;
                const orderB = b.orderNum ?? 999999;
                if (orderA !== orderB) return orderA - orderB;
                return a.id - b.id;
              })
              .map((img: AdminImage, index: number) => {
                // Use gallery image path for sharp thumbnail generation
                const galleryPath = img.galleryUrl || '';
                const cleanPath = galleryPath.startsWith('/') ? galleryPath.slice(1) : galleryPath;
                
                // Use larger, higher quality thumbnails for admin (500x600px for better quality)
                const thumbnailUrl = galleryPath 
                  ? `/api/images/thumbnail?path=${encodeURIComponent(galleryPath)}&width=500&height=600`
                  : '';
                
                // Full size image URL for zoom
                const fullImageUrl = galleryPath 
                  ? (galleryPath.startsWith('http') ? galleryPath : `/api/images/thumbnail?path=${encodeURIComponent(galleryPath)}&width=1200&height=1600`)
                  : '';
                
                // Format file size
                const fileSizeMB = img.originalFileBytes 
                  ? (img.originalFileBytes / (1024 * 1024)).toFixed(1)
                  : null;
                
                return (
                  <div key={img.id} className="border border-gray-300 p-2 bg-white">
                    <div className="relative">
                      {thumbnailUrl ? (
                        <img 
                          src={thumbnailUrl} 
                          alt={`Image ${img.orderNum || index + 1}`}
                          className="w-full h-64 object-cover border border-gray-300 cursor-pointer hover:opacity-90 transition-opacity" 
                          onClick={() => {
                            if (fullImageUrl) {
                              window.open(fullImageUrl, '_blank');
                            }
                          }}
                          title="Click to view full size"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/placeholder.jpg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-64 bg-gray-200 flex items-center justify-center text-xs text-gray-400">
                          No image
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering image click
                          handleDeleteImage(img.id);
                        }}
                        className="absolute top-1 right-1 bg-red-600 text-white w-6 h-6 flex items-center justify-center text-sm font-bold hover:bg-red-700 rounded border border-red-700 z-10"
                        title="Delete image"
                        style={{ minWidth: '24px', minHeight: '24px' }}
                      >
                        ×
                      </button>
                    </div>
                    <div className="text-xs mt-2 space-y-1">
                      {/* Order Control */}
                      <div className="flex items-center gap-2 border-b border-gray-200 pb-1 mb-1">
                        <label className="text-gray-700 font-medium" style={{ fontSize: '11px' }}>Order:</label>
                        <select
                          value={img.orderNum || index + 1}
                          onChange={(e) => {
                            const newOrder = parseInt(e.target.value) || 1;
                            updateImageOrder(img.id, newOrder);
                          }}
                          className="px-2 py-1 border border-gray-400 text-center text-xs font-medium bg-white"
                          style={{ minWidth: '60px', fontSize: '11px' }}
                        >
                          {Array.from({ length: actress.images?.length || 1 }, (_, i) => i + 1).map((order) => (
                            <option key={order} value={order}>
                              {order}
                            </option>
                          ))}
                        </select>
                        <span className="text-gray-500" style={{ fontSize: '10px' }}>
                          (#{img.orderNum || index + 1})
                        </span>
                      </div>
                      {/* Original Metadata */}
                      {img.originalWidth && img.originalHeight && (
                        <div className="text-gray-700 font-medium">
                          {img.originalWidth} × {img.originalHeight} px
                          {fileSizeMB && ` (${fileSizeMB} MB)`}
                        </div>
                      )}
                      {/* Gallery Size (after processing) */}
                      <div className="text-gray-500">
                        Gallery: {img.width}×{img.height}
                      </div>
                      {img.hqUrl && <div className="text-green-600">✓ HQ Available</div>}
                      {galleryPath && (
                        <div className="text-gray-400 truncate text-xs" title={galleryPath}>
                          {galleryPath.split('/').pop()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-gray-500 mb-4">No images yet. Upload images below.</p>
        )}
        
        <div className="border border-gray-300 p-4 bg-gray-50">
          <h4 className="font-medium mb-2">Upload New Images:</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Headshot (Portrait Photo):</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleHeadshotUpload}
                className="text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload a headshot image. It will be automatically cropped and resized to match existing headshots (40px top/bottom, 25px left, 28px right).
              </p>
            </div>
            <div>
              <label className="block text-sm mb-1">Gallery Image (and HQ if available):</label>
              <input 
                type="file" 
                accept="image/*"
                multiple
                onChange={(e) => handleImageUpload(e, 'gallery')}
                className="text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload gallery images. For HQ versions, upload both gallery and HQ images.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => router.push('/admin')}
          className="vintage-condensed bg-gray-500 text-white px-4 py-2 tracking-wider"
        >
          BACK
        </button>
      </div>
    </div>
  );
}

