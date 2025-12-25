'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Alert, Spin, Row, Col, Input, Image } from 'antd';
import { SaveOutlined, SearchOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface GalleryImage {
  id: number;
  path: string;
  width: number;
  height: number;
  actressId: number;
  actressName: string;
}

export default function HeroImagePage() {
  const [currentHeroImage, setCurrentHeroImage] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [selectedImagePath, setSelectedImagePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load current hero image on mount
  useEffect(() => {
    loadCurrentHeroImage();
    loadGalleryImages();
  }, []);

  async function loadCurrentHeroImage() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/hero-image');
      const data = await res.json();
      
      if (res.ok && data.success) {
        setCurrentHeroImage(data.heroImagePath);
        setSelectedImagePath(data.heroImagePath);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load current hero image' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Error loading hero image: ' + error.message });
    } finally {
      setLoading(false);
    }
  }

  async function loadGalleryImages() {
    setLoadingImages(true);
    try {
      const res = await fetch('/api/admin/hero-image/gallery-images?limit=200');
      const data = await res.json();
      
      if (res.ok && data.success) {
        setGalleryImages(data.images || []);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load gallery images' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Error loading gallery images: ' + error.message });
    } finally {
      setLoadingImages(false);
    }
  }

  async function saveHeroImage() {
    if (selectedImagePath === currentHeroImage) {
      setMessage({ type: 'error', text: 'No changes to save' });
      return;
    }

    setSaving(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/admin/hero-image', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePath: selectedImagePath }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCurrentHeroImage(selectedImagePath);
        setMessage({ type: 'success', text: 'Hero image saved successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save hero image' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Error saving hero image: ' + error.message });
    } finally {
      setSaving(false);
    }
  }

  function clearHeroImage() {
    setSelectedImagePath(null);
  }

  // Filter images by search term
  const filteredImages = galleryImages.filter(img => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      img.actressName.toLowerCase().includes(search) ||
      img.path.toLowerCase().includes(search)
    );
  });

  // Get base URL for images
  const getImageUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    // Assuming images are served from /images/ or similar
    return path.startsWith('/') ? path : `/${path}`;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Title level={2}>Hero Image Administration</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
        Select a single image to display in the homepage hero section. The hero image is editorial and represents the archive, not a specific actress profile.
      </Text>

      {message && (
        <Alert
          message={message.text}
          type={message.type}
          closable
          onClose={() => setMessage(null)}
          style={{ marginBottom: '24px' }}
        />
      )}

      <Card title="Current Hero Image" style={{ marginBottom: '24px' }}>
        {loading ? (
          <Spin />
        ) : currentHeroImage ? (
          <div style={{ textAlign: 'center' }}>
            <Image
              src={getImageUrl(currentHeroImage)}
              alt="Current hero image"
              style={{ maxWidth: '300px', maxHeight: '450px', objectFit: 'contain' }}
              fallback="/images/placeholder-portrait.png"
            />
            <div style={{ marginTop: '12px' }}>
              <Text type="secondary">{currentHeroImage}</Text>
            </div>
          </div>
        ) : (
          <Text type="secondary">No hero image selected</Text>
        )}
      </Card>

      <Card
        title="Select Hero Image"
        extra={
          <Space>
            <Button onClick={clearHeroImage} disabled={selectedImagePath === null}>
              Clear Selection
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={saveHeroImage}
              loading={saving}
              disabled={selectedImagePath === currentHeroImage}
            >
              Save Hero Image
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: '16px' }}>
          <Input
            placeholder="Search by actress name or image path..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '400px' }}
          />
        </div>

        {loadingImages ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>
              <Text>Loading gallery images...</Text>
            </div>
          </div>
        ) : (
          <>
            <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
              {filteredImages.length} image{filteredImages.length !== 1 ? 's' : ''} available
            </Text>
            
            <Row gutter={[16, 16]}>
              {filteredImages.map((img) => {
                const isSelected = selectedImagePath === img.path;
                return (
                  <Col key={img.id} xs={12} sm={8} md={6} lg={4}>
                    <Card
                      hoverable
                      onClick={() => setSelectedImagePath(img.path)}
                      style={{
                        border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
                        cursor: 'pointer',
                        height: '100%',
                      }}
                      bodyStyle={{ padding: '8px' }}
                    >
                      <div style={{ position: 'relative', paddingBottom: '150%', overflow: 'hidden' }}>
                        <Image
                          src={getImageUrl(img.path)}
                          alt={img.actressName}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                          preview={false}
                          fallback="/images/placeholder-portrait.png"
                        />
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '12px' }}>
                        <Text ellipsis style={{ display: 'block' }}>
                          {img.actressName}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {img.width} × {img.height}
                        </Text>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {filteredImages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Text type="secondary">No images found</Text>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

