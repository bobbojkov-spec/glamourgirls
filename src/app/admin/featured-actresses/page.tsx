'use client';

import { useState, useEffect } from 'react';
import { Card, Switch, Select, Button, Space, Typography, Alert, Spin, Row, Col, Input } from 'antd';
import { StarOutlined, StarFilled, SearchOutlined } from '@ant-design/icons';
import type { SearchActressResult } from '@/types/search';

const { Title, Text } = Typography;
const { Option } = Select;

interface FeaturedActress extends SearchActressResult {
  isFeatured: boolean;
  featuredOrder: number | null;
}

export default function FeaturedActressesPage() {
  const [actresses, setActresses] = useState<FeaturedActress[]>([]);
  const [allSelectedActresses, setAllSelectedActresses] = useState<Map<number, FeaturedActress>>(new Map()); // Track all selected actresses across filters
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Filter state
  const [keyword, setKeyword] = useState('');
  const [decade, setDecade] = useState<string>('all');
  const [hasFiltered, setHasFiltered] = useState(false);

  // Calculate featured count from all selected actresses
  const featuredCount = Array.from(allSelectedActresses.values()).filter(a => a.isFeatured).length;

  // Load featured actresses on mount
  useEffect(() => {
    loadFeaturedActresses();
  }, []);

  async function loadFeaturedActresses() {
    setLoading(true);
    try {
      // Fetch only featured actresses (no filters)
      const res = await fetch('/api/admin/featured-actresses?featuredOnly=true');
      const responseText = await res.text();
      let data: any = {};
      
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError: any) {
        console.error('Failed to parse JSON response:', responseText);
        data = { 
          error: res.statusText || 'Invalid response',
          rawResponse: responseText.substring(0, 200)
        };
      }
      
      if (res.ok) {
        const featuredActresses = data.actresses || [];
        // Merge with existing selections to preserve featured status
        // Update global map with all featured actresses from the server
        setAllSelectedActresses(prev => {
          const updated = new Map(prev);
          featuredActresses.forEach((actress: FeaturedActress) => {
            if (actress.isFeatured) {
              updated.set(actress.id, actress);
            }
          });
          return updated;
        });
        
        // Merge with existing selections and update global map
        const mergedActresses = featuredActresses.map((actress: FeaturedActress) => {
          const existing = allSelectedActresses.get(actress.id);
          if (existing) {
            return existing; // Use existing selection if available
          }
          return actress;
        });
        setActresses(mergedActresses);
        setHasFiltered(true); // Mark as filtered so we show the grid
      } else {
        const errorParts = [
          data?.error,
          data?.details,
          data?.detail,
          data?.hint,
          data?.code ? `Code: ${data.code}` : null,
          data?.migrationScript ? `Migration needed: ${data.migrationScript}` : null,
          res.statusText,
          `Status: ${res.status}`
        ].filter(Boolean);
        
        const errorMsg = errorParts.length > 0 
          ? errorParts.join(' - ') 
          : `Failed to load actresses (${res.status})`;
        
        setMessage({ type: 'error', text: errorMsg });
        console.error('API error details (loadFeaturedActresses):', { 
          status: res.status, 
          statusText: res.statusText, 
          data: data || {},
          rawResponse: responseText ? responseText.substring(0, 500) : 'No response text',
          responseLength: responseText?.length || 0
        });
      }
    } catch (error: any) {
      console.error('Error fetching featured actresses:', error);
      setMessage({ type: 'error', text: error?.message || 'Error loading featured actresses' });
    } finally {
      setLoading(false);
    }
  }

  async function fetchActresses() {
    setLoading(true);
    setMessage(null);
    try {
      // Build query string with filters
      const params = new URLSearchParams();
      if (keyword.trim()) {
        params.set('keyword', keyword.trim());
      }
      if (decade && decade !== 'all') {
        params.set('decade', decade);
      }

      const url = `/api/admin/featured-actresses${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      const responseText = await res.text();
      let data: any = {};
      
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError: any) {
        // If response isn't JSON, log the raw text
        console.error('Failed to parse JSON response:', responseText);
        data = { 
          error: res.statusText || 'Invalid response',
          rawResponse: responseText.substring(0, 200) // First 200 chars for debugging
        };
      }
      
      if (res.ok) {
        const fetchedActresses = data.actresses || [];
        // Merge with existing selections and update global map
        const mergedActresses = fetchedActresses.map((actress: FeaturedActress) => {
          const existing = allSelectedActresses.get(actress.id);
          if (existing) {
            return existing; // Use existing selection if available
          }
          // Add to global map if featured
          if (actress.isFeatured) {
            setAllSelectedActresses(prev => {
              const updated = new Map(prev);
              updated.set(actress.id, actress);
              return updated;
            });
          }
          return actress;
        });
        setActresses(mergedActresses);
        setHasFiltered(true);
      } else {
        // Build comprehensive error message
        const errorParts = [
          data?.error,
          data?.details,
          data?.detail,
          data?.hint,
          data?.code ? `Code: ${data.code}` : null,
          data?.migrationScript ? `Migration needed: ${data.migrationScript}` : null,
          res.statusText,
          `Status: ${res.status}`
        ].filter(Boolean);
        
        const errorMsg = errorParts.length > 0 
          ? errorParts.join(' - ') 
          : `Failed to load actresses (${res.status})`;
        
        setMessage({ type: 'error', text: errorMsg });
        console.error('API error details:', { 
          status: res.status, 
          statusText: res.statusText, 
          data: data || {},
          rawResponse: responseText ? responseText.substring(0, 500) : 'No response text',
          responseLength: responseText?.length || 0
        });
      }
    } catch (error: any) {
      console.error('Error fetching actresses:', error);
      setMessage({ type: 'error', text: error?.message || 'Error loading actresses' });
    } finally {
      setLoading(false);
    }
  }

  const handleFilter = () => {
    // Require at least keyword or decade filter
    if (!keyword.trim() && decade === 'all') {
      setMessage({ type: 'error', text: 'Please enter a name or select a decade to filter' });
      return;
    }
    fetchActresses();
  };

  const handleClearFilters = () => {
    setKeyword('');
    setDecade('all');
    setActresses([]);
    setHasFiltered(false);
    setMessage(null);
  };

  const handleToggleFeatured = (actressId: number, checked: boolean) => {
    if (checked && featuredCount >= 8) {
      setMessage({ type: 'error', text: 'Maximum 8 actresses can be featured' });
      return;
    }

    // Find the next available order (1-8)
    const getNextAvailableOrder = () => {
      const usedOrders = new Set(
        Array.from(allSelectedActresses.values())
          .filter(a => a.isFeatured && a.featuredOrder !== null)
          .map(a => a.featuredOrder as number)
      );
      for (let i = 1; i <= 8; i++) {
        if (!usedOrders.has(i)) {
          return i;
        }
      }
      return null; // Should never happen if featuredCount < 8
    };

    // Update both visible actresses and all selected actresses
    const updateActress = (a: FeaturedActress) => {
      if (a.id === actressId) {
        return {
          ...a,
          isFeatured: checked,
          featuredOrder: checked ? (getNextAvailableOrder() || 1) : null,
        };
      }
      return a;
    };

    setActresses(prev => prev.map(updateActress));
    
    // Update the global selection map
    setAllSelectedActresses(prev => {
      const updated = new Map(prev);
      // Find actress from either visible list or global map
      const actress = actresses.find(a => a.id === actressId) || prev.get(actressId);
      if (actress) {
        const updatedActress = updateActress(actress);
        if (checked) {
          updated.set(actressId, updatedActress);
        } else {
          // If unchecking, update to mark as not featured but keep in map
          updated.set(actressId, { ...updatedActress, isFeatured: false, featuredOrder: null });
        }
      }
      return updated;
    });
    
    setMessage(null);
  };

  const handleOrderChange = (actressId: number, order: number | null) => {
    const updateActress = (a: FeaturedActress) => {
      if (a.id === actressId) {
        return { ...a, featuredOrder: order };
      }
      // If setting an order that's already taken, clear it from the other actress
      if (a.featuredOrder === order && a.id !== actressId) {
        return { ...a, featuredOrder: null };
      }
      return a;
    };

    setActresses(prev => prev.map(updateActress));
    
    // Update the global selection map
    setAllSelectedActresses(prev => {
      const updated = new Map(prev);
      // Find actress from either visible list or global map
      const actress = actresses.find(a => a.id === actressId) || prev.get(actressId);
      if (actress) {
        updated.set(actressId, updateActress(actress));
      }
      // Clear order from any other actress with the same order
      prev.forEach((a, id) => {
        if (id !== actressId && a.featuredOrder === order && order !== null) {
          // Only clear if the other actress is featured
          if (a.isFeatured) {
            // Find a new order for the other actress or set to null
            const usedOrders = new Set(
              Array.from(prev.values())
                .filter(act => act.isFeatured && act.id !== id && act.featuredOrder !== null && act.featuredOrder !== order)
                .map(act => act.featuredOrder as number)
            );
            let newOrder: number | null = null;
            for (let i = 1; i <= 8; i++) {
              if (!usedOrders.has(i) && i !== order) {
                newOrder = i;
                break;
              }
            }
            updated.set(id, { ...a, featuredOrder: newOrder });
          }
        }
      });
      return updated;
    });
    
    setMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Get all featured actresses from the global selection map, not just visible ones
      const allFeatured = Array.from(allSelectedActresses.values()).filter(a => a.isFeatured);
      const featuredActresses = allFeatured;
      
      // Validate: all featured actresses must have a position
      const featuredWithoutOrder = featuredActresses.filter(a => a.featuredOrder === null || a.featuredOrder === undefined);
      if (featuredWithoutOrder.length > 0) {
        setMessage({ 
          type: 'error', 
          text: `Please assign a position (1-8) to all featured actresses. ${featuredWithoutOrder.length} featured actress(es) are missing a position.` 
        });
        setSaving(false);
        return;
      }

      // Validate: all positions must be unique
      const orders = featuredActresses.map(a => a.featuredOrder).filter(o => o !== null && o !== undefined);
      const uniqueOrders = new Set(orders);
      if (orders.length !== uniqueOrders.size) {
        setMessage({ 
          type: 'error', 
          text: 'Each featured actress must have a unique position (1-8). Please fix duplicate positions.' 
        });
        setSaving(false);
        return;
      }

      // Validate: positions must be between 1-8
      const invalidOrders = orders.filter((o: number) => o < 1 || o > 8);
      if (invalidOrders.length > 0) {
        setMessage({ 
          type: 'error', 
          text: `Positions must be between 1 and 8. Invalid positions: ${invalidOrders.join(', ')}` 
        });
        setSaving(false);
        return;
      }

      // Get all updates - send featured actresses with valid orders
      // The API will clear all existing featured status first, then set only the ones we send
      const allUpdates = Array.from(allSelectedActresses.values())
        .filter(a => a.isFeatured) // Only send currently featured actresses
        .map(a => {
          // Ensure featuredOrder is valid (1-8)
          let order = a.featuredOrder;
          
          // Validate and fix order if needed
          if (!order || typeof order !== 'number' || order < 1 || order > 8) {
            console.warn('Invalid featuredOrder detected, fixing:', a.id, a.name, order);
            // Find next available order
            const usedOrders = new Set(
              Array.from(allSelectedActresses.values())
                .filter(act => act.isFeatured && act.id !== a.id && act.featuredOrder && typeof act.featuredOrder === 'number' && act.featuredOrder >= 1 && act.featuredOrder <= 8)
                .map(act => act.featuredOrder as number)
            );
            order = null;
            for (let i = 1; i <= 8; i++) {
              if (!usedOrders.has(i)) {
                order = i;
                break;
              }
            }
            if (!order || order < 1 || order > 8) {
              console.error('Could not assign valid order to actress:', a.id, a.name);
              return null; // Skip this actress
            }
          }
          
          // Final validation
          if (typeof order !== 'number' || order < 1 || order > 8) {
            console.error('Order still invalid after fix:', a.id, a.name, order);
            return null;
          }
          
          return {
            id: a.id,
            isFeatured: true,
            featuredOrder: order,
          };
        })
        .filter((update): update is { id: number; isFeatured: boolean; featuredOrder: number } => {
          // Filter out null values and validate
          if (!update) return false;
          if (!update.isFeatured) return false;
          if (typeof update.featuredOrder !== 'number' || update.featuredOrder < 1 || update.featuredOrder > 8) {
            console.error('Invalid update after processing:', update);
            return false;
          }
          return true;
        });

      // Final validation: ensure all orders are valid and unique
      const finalOrders = allUpdates.map(u => u.featuredOrder);
      const uniqueFinalOrders = new Set(finalOrders);
      if (finalOrders.length !== uniqueFinalOrders.size) {
        setMessage({ 
          type: 'error', 
          text: 'Duplicate positions detected. Please fix duplicate positions before saving.' 
        });
        setSaving(false);
        return;
      }

      const invalidFinalOrders = finalOrders.filter(o => o < 1 || o > 8);
      if (invalidFinalOrders.length > 0) {
        setMessage({ 
          type: 'error', 
          text: `Invalid positions detected: ${invalidFinalOrders.join(', ')}. All positions must be between 1 and 8.` 
        });
        setSaving(false);
        return;
      }

      // Log what we're sending
      console.log('=== SENDING UPDATES ===');
      console.log('Total featured actresses:', allUpdates.length);
      console.log('Updates:', allUpdates.map(u => ({ id: u.id, order: u.featuredOrder, isFeatured: u.isFeatured })));
      console.log('Orders:', allUpdates.map(u => u.featuredOrder).sort((a, b) => a - b));
      console.log('All orders valid?', allUpdates.every(u => u.featuredOrder >= 1 && u.featuredOrder <= 8));
      console.log('All orders unique?', new Set(allUpdates.map(u => u.featuredOrder)).size === allUpdates.length);

      const res = await fetch('/api/admin/featured-actresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: allUpdates }),
      });

      const responseText = await res.text();
      let data: any = {};
      
      // Log raw response for debugging
      console.log('Raw API response:', {
        status: res.status,
        statusText: res.statusText,
        contentType: res.headers.get('content-type'),
        responseLength: responseText?.length || 0,
        responsePreview: responseText ? responseText.substring(0, 1000) : 'No response'
      });
      
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError: any) {
        console.error('Failed to parse JSON response:', parseError);
        console.error('Response text:', responseText);
        data = { 
          error: res.statusText || 'Invalid response',
          rawResponse: responseText ? responseText.substring(0, 500) : 'No response text',
          parseError: parseError?.message
        };
      }

      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Featured actresses updated successfully!' });
        // Refresh to get updated data and reload featured actresses
        setTimeout(() => {
          loadFeaturedActresses();
        }, 1000);
      } else {
        // Build comprehensive error message
        const errorParts = [
          data?.error,
          data?.details,
          data?.detail,
          data?.hint,
          data?.code ? `Code: ${data.code}` : null,
          data?.migrationScript ? `Migration needed: ${data.migrationScript}` : null,
          res.statusText,
          `Status: ${res.status}`
        ].filter(Boolean);
        
        const errorMsg = errorParts.length > 0 
          ? errorParts.join(' - ') 
          : `Failed to save changes (${res.status})`;
        
        setMessage({ type: 'error', text: errorMsg });
        console.error('Save error details:', { 
          status: res.status, 
          statusText: res.statusText,
          statusCode: res.status,
          headers: Object.fromEntries(res.headers.entries()),
          data: data || {},
          rawResponse: responseText ? responseText.substring(0, 1000) : 'No response text',
          responseLength: responseText?.length || 0,
          updatesSent: allUpdates.length,
          updatesPreview: allUpdates.map(u => ({ id: u.id, order: u.featuredOrder, isFeatured: u.isFeatured })),
          allUpdates: allUpdates // Log all updates for debugging
        });
      }
    } catch (error: any) {
      console.error('Error saving:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        cause: error?.cause
      });
      setMessage({ type: 'error', text: error?.message || 'Error saving changes. Please check the console for details.' });
    } finally {
      setSaving(false);
    }
  };

  // Get all featured actresses from the global selection map, sorted by order
  const featuredActresses = Array.from(allSelectedActresses.values())
    .filter(a => a.isFeatured)
    .sort((a, b) => {
      if (a.featuredOrder === null && b.featuredOrder === null) return 0;
      if (a.featuredOrder === null) return 1;
      if (b.featuredOrder === null) return -1;
      return a.featuredOrder - b.featuredOrder;
    });

  const availableOrders = [1, 2, 3, 4, 5, 6, 7, 8].filter(order => {
    const taken = featuredActresses.find(a => a.featuredOrder === order);
    return !taken;
  });

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ 
      padding: 'clamp(8px, 2vw, 24px)', 
      backgroundColor: '#f5f5f5', 
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>
      <style jsx global>{`
        /* Remove any min-width constraints from Ant Design components */
        .ant-row {
          min-width: 0 !important;
        }
        .ant-col {
          min-width: 0 !important;
        }
        .ant-card {
          min-width: 0 !important;
        }
        .ant-card-body {
          min-width: 0 !important;
          padding: clamp(12px, 2vw, 24px) !important;
        }
        .ant-input,
        .ant-select-selector,
        .ant-btn {
          min-width: 0 !important;
        }
        /* Ensure filter buttons stack on mobile */
        @media (max-width: 400px) {
          .ant-space {
            width: 100% !important;
          }
          .ant-space-item {
            width: 100% !important;
          }
          .filter-buttons .ant-btn {
            width: 100% !important;
            margin-bottom: 8px !important;
          }
        }
        /* Ensure no horizontal overflow */
        * {
          max-width: 100%;
          box-sizing: border-box;
        }
      `}</style>
      <Space orientation="vertical" size="large" style={{ width: '100%', maxWidth: '100%' }}>
        {/* Header */}
        <Row gutter={[16, 16]} justify="space-between" align="middle">
          <Col xs={24} sm={24} md={18}>
            <Space orientation="vertical" size={0} style={{ width: '100%' }}>
              <Title level={2} style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 24px)' }}>
                Featured Actresses
              </Title>
              <Text type="secondary" style={{ fontSize: 'clamp(12px, 2vw, 14px)' }}>
                Curate up to 8 actresses to feature on the homepage
              </Text>
            </Space>
          </Col>
          <Col xs={24} sm={24} md={6} style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
            <Button
              type="primary"
              size="large"
              onClick={handleSave}
              loading={saving}
              disabled={saving}
              block
              style={{ 
                width: '100%',
                maxWidth: '100%'
              }}
            >
              Save Changes
            </Button>
          </Col>
        </Row>

        {/* Status Alert */}
        <Alert
          title={`Featured: ${featuredCount} / 8`}
          type={featuredCount === 8 ? 'success' : featuredCount > 8 ? 'error' : 'info'}
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* Missing Headshots Alert */}
        {actresses.length > 0 && (() => {
          // previewImageUrl is always populated, so no missing headshots check needed
          const missingHeadshots: typeof actresses = [];
          if (missingHeadshots.length > 0) {
            return (
              <Alert
                message={`${missingHeadshots.length} featured actress${missingHeadshots.length !== 1 ? 'es' : ''} missing headshots`}
                description={
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      These actresses won't display thumbnails in listings:
                    </Text>
                    <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                      {missingHeadshots.slice(0, 10).map(actress => (
                        <li key={actress.id} style={{ fontSize: '12px', marginBottom: '4px' }}>
                          <Text strong>[{actress.id}]</Text> {actress.name}
                        </li>
                      ))}
                      {missingHeadshots.length > 10 && (
                        <li style={{ fontSize: '12px', fontStyle: 'italic' }}>
                          ... and {missingHeadshots.length - 10} more
                        </li>
                      )}
                    </ul>
                  </div>
                }
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            );
          }
          return null;
        })()}

        {/* Messages */}
        {message && (
          <Alert
            title={message.text}
            type={message.type}
            closable
            onClose={() => setMessage(null)}
          />
        )}

        {/* Filter Section */}
        <Card title="Filter Actresses" style={{ marginBottom: 24, width: '100%', maxWidth: '100%' }}>
          <Space orientation="vertical" size="middle" style={{ width: '100%', maxWidth: '100%' }}>
            <Row gutter={[8, 8]}>
              <Col xs={24} sm={24} md={10}>
                <Input
                  placeholder="Search by name..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onPressEnter={handleFilter}
                  prefix={<SearchOutlined />}
                  allowClear
                  style={{ width: '100%' }}
                />
              </Col>
              <Col xs={24} sm={24} md={8}>
                <Select
                  value={decade}
                  onChange={setDecade}
                  style={{ width: '100%' }}
                  placeholder="Select decade"
                >
                  <Option value="all">All Decades</Option>
                  <Option value="20-30s">20-30s</Option>
                  <Option value="40s">40s</Option>
                  <Option value="50s">50s</Option>
                  <Option value="60s">60s</Option>
                </Select>
              </Col>
              <Col xs={24} sm={24} md={6}>
                <Space orientation="vertical" size="small" className="filter-buttons" style={{ width: '100%' }}>
                  <Button 
                    type="primary" 
                    icon={<SearchOutlined />} 
                    onClick={handleFilter} 
                    loading={loading}
                    block
                    style={{ width: '100%' }}
                  >
                    Filter
                  </Button>
                  {hasFiltered && (
                    <Button 
                      onClick={handleClearFilters}
                      block
                      style={{ width: '100%' }}
                    >
                      Clear
                    </Button>
                  )}
                </Space>
              </Col>
            </Row>
            {hasFiltered && (
              <Text type="secondary">
                Showing {actresses.length} result{actresses.length !== 1 ? 's' : ''}
                {keyword && ` matching "${keyword}"`}
                {decade !== 'all' && ` from ${decade}`}
              </Text>
            )}
          </Space>
        </Card>

        {/* Featured Actresses Section */}
        {featuredActresses.length > 0 && (
          <Card title="Featured Actresses (1-8)" style={{ marginBottom: 24, width: '100%', maxWidth: '100%' }}>
            <Row gutter={[8, 8]}>
              {featuredActresses.map(actress => (
                <Col xs={12} sm={8} md={6} lg={4} xl={3} key={actress.id}>
                  <Card
                    hoverable
                    style={{
                      border: '2px solid #52c41a',
                      backgroundColor: '#f6ffed',
                    }}
                    cover={
                      <div style={{ 
                        width: '100%', 
                        aspectRatio: '3/4',
                        backgroundColor: '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        position: 'relative',
                        }}>
                        <img
                          src={actress.previewImageUrl}
                          alt={actress.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                          onError={(e) => {
                            const img = e.currentTarget;
                            img.style.display = 'none';
                          }}
                        />
                      </div>
                    }
                  >
                    <Card.Meta
                      title={
                        <Space>
                          <StarFilled style={{ color: '#52c41a' }} />
                          <Text strong>{actress.name}</Text>
                        </Space>
                      }
                      description={
                        <Space orientation="vertical" size="small" style={{ width: '100%', marginTop: 8 }}>
                          <Switch
                            checked={actress.isFeatured}
                            onChange={(checked) => handleToggleFeatured(actress.id, checked)}
                            checkedChildren="Featured"
                            unCheckedChildren="Not Featured"
                          />
                          <div>
                            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
                              Position:
                            </Text>
                            <Select
                              value={actress.featuredOrder}
                              onChange={(value) => handleOrderChange(actress.id, value)}
                              style={{ width: '100%' }}
                              placeholder="Select position"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8].map(order => (
                                <Option key={order} value={order} disabled={featuredActresses.some(a => a.featuredOrder === order && a.id !== actress.id)}>
                                  Position {order}
                                </Option>
                              ))}
                            </Select>
                          </div>
                        </Space>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        )}

        {/* Filtered Actresses Grid */}
        {hasFiltered ? (
          <Card title="Filtered Actresses - Select up to 8 to Feature" style={{ width: '100%', maxWidth: '100%' }}>
            {actresses.length === 0 ? (
              <Alert
                type="info"
                title="No actresses found"
                description="Try adjusting your search or decade filter"
              />
            ) : (
              <Row gutter={[8, 8]}>
                {actresses.map(actress => (
              <Col xs={12} sm={12} md={8} lg={6} xl={4} key={actress.id}>
                <Card
                  hoverable
                  style={{
                    border: actress.isFeatured ? '2px solid #52c41a' : '1px solid #d9d9d9',
                    backgroundColor: actress.isFeatured ? '#f6ffed' : '#fff',
                  }}
                  cover={
                    <div style={{ 
                      width: '100%', 
                      aspectRatio: '3/4',
                      backgroundColor: '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      <img
                        src={actress.previewImageUrl}
                        alt={actress.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                        onError={(e) => {
                          const img = e.currentTarget;
                          img.style.display = 'none';
                        }}
                      />
                    </div>
                  }
                >
                  <Card.Meta
                    title={
                      <Space>
                        {actress.isFeatured && <StarFilled style={{ color: '#52c41a' }} />}
                        <Text strong>{actress.name}</Text>
                      </Space>
                    }
                    description={
                      <Space orientation="vertical" size="small" style={{ width: '100%', marginTop: 8 }}>
                        <Switch
                          checked={actress.isFeatured}
                          onChange={(checked) => handleToggleFeatured(actress.id, checked)}
                          checkedChildren="Featured"
                          unCheckedChildren="Not Featured"
                          disabled={!actress.isFeatured && featuredCount >= 8}
                        />
                        {actress.isFeatured && (
                          <div>
                            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
                              Position:
                            </Text>
                            <Select
                              value={actress.featuredOrder}
                              onChange={(value) => handleOrderChange(actress.id, value)}
                              style={{ width: '100%' }}
                              placeholder="Select position"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8].map(order => (
                                <Option 
                                  key={order} 
                                  value={order} 
                                  disabled={featuredActresses.some(a => a.featuredOrder === order && a.id !== actress.id)}
                                >
                                  Position {order}
                                </Option>
                              ))}
                            </Select>
                          </div>
                        )}
                      </Space>
                    }
                  />
                </Card>
              </Col>
                ))}
              </Row>
            )}
          </Card>
        ) : (
          <Card style={{ width: '100%', maxWidth: '100%' }}>
            <Alert
              type="info"
              title="Use filters to find actresses"
              description="Enter a name or select a decade, then click 'Filter' to see results. You can then select up to 8 actresses to feature."
            />
          </Card>
        )}
      </Space>
    </div>
  );
}

