'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Space, Typography, Select, InputNumber, Alert, App, Spin, Image, Table, Tag, Switch, Popconfirm, Tabs } from 'antd';
import { PictureOutlined, CheckCircleOutlined, LoadingOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { useApp } = App;

const ERAS = ['1930s', '1940s', '1950s', '1960s'];

interface CollageMetadata {
  id: string;
  era: string;
  version: number;
  filepath: string;
  filename: string;
  active: boolean;
  createdAt: string;
  fileSize?: number;
}

export default function CollageGeneratorPage() {
  const { message } = useApp();
  const [loading, setLoading] = useState(false);
  const [era, setEra] = useState<string>('1930s');
  const [version, setVersion] = useState<number>(1);
  const [result, setResult] = useState<{ filepath: string; era: string; version: number; id?: string } | null>(null);
  const [collages, setCollages] = useState<CollageMetadata[]>([]);
  const [loadingCollages, setLoadingCollages] = useState(false);
  const [selectedEraFilter, setSelectedEraFilter] = useState<string>('all');

  // Load collages on mount and when filter changes
  useEffect(() => {
    loadCollages();
  }, [selectedEraFilter]);

  const loadCollages = async () => {
    setLoadingCollages(true);
    try {
      const url = selectedEraFilter === 'all' 
        ? '/api/admin/collages'
        : `/api/admin/collages?era=${selectedEraFilter}`;
      console.log('[CollageManager] Loading collages from:', url);
      const response = await fetch(url, {
        credentials: 'include',
      });
      
      console.log('[CollageManager] Response status:', response.status, response.ok);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load collages' }));
        console.error('[CollageManager] API error:', errorData);
        message.error(errorData.error || `Failed to load collages (${response.status})`);
        setCollages([]);
        return;
      }
      
      const data = await response.json();
      console.log('[CollageManager] Received data:', data);
      
      if (data.success) {
        const collagesList = data.collages || [];
        console.log('[CollageManager] Setting collages:', collagesList.length);
        setCollages(collagesList);
      } else {
        console.error('[CollageManager] API returned success=false:', data);
        message.error(data.error || 'Failed to load collages');
        setCollages([]);
      }
    } catch (error: any) {
      console.error('[CollageManager] Error loading collages:', error);
      message.error('Error loading collages: ' + (error.message || 'Unknown error'));
      setCollages([]);
    } finally {
      setLoadingCollages(false);
    }
  };

  const handleGenerate = async () => {
    if (!era) {
      message.error('Please select an era');
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/generate-collage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          era,
          version: version || 1,
          generationId: Date.now(), // Ensure unique collage each time
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        message.success(`Collage generated successfully for ${era}!`);
        // Reload collages list
        loadCollages();
      } else {
        message.error(data.error || 'Failed to generate collage');
      }
    } catch (error: any) {
      console.error('Error generating collage:', error);
      message.error('Error generating collage. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch('/api/admin/collages/toggle-active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();
      
      if (data.success) {
        message.success(data.message);
        loadCollages();
      } else {
        message.error(data.error || 'Failed to update collage status');
      }
    } catch (error: any) {
      console.error('Error toggling collage status:', error);
      message.error('Error updating collage status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch('/api/admin/collages', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();
      
      if (data.success) {
        message.success('Collage deleted successfully');
        loadCollages();
        // Clear result if it was the deleted collage
        if (result?.id === id) {
          setResult(null);
        }
      } else {
        message.error(data.error || 'Failed to delete collage');
      }
    } catch (error: any) {
      console.error('Error deleting collage:', error);
      message.error('Error deleting collage');
    }
  };

  const handleRegenerate = async (collage: CollageMetadata) => {
    setEra(collage.era);
    setVersion(collage.version);
    setResult(null);
    
    setLoading(true);
    try {
      const response = await fetch('/api/admin/generate-collage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          era: collage.era,
          version: collage.version,
          generationId: Date.now(),
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        message.success(`Collage regenerated successfully for ${collage.era}!`);
        loadCollages();
      } else {
        message.error(data.error || 'Failed to regenerate collage');
      }
    } catch (error: any) {
      console.error('Error regenerating collage:', error);
      message.error('Error regenerating collage. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Group collages by era
  const collagesByEra = collages.reduce((acc, collage) => {
    if (!acc[collage.era]) {
      acc[collage.era] = [];
    }
    acc[collage.era].push(collage);
    return acc;
  }, {} as Record<string, CollageMetadata[]>);
  
  // Debug logging
  useEffect(() => {
    console.log('Collages state updated:', { 
      count: collages.length, 
      loading: loadingCollages,
      filter: selectedEraFilter 
    });
  }, [collages, loadingCollages, selectedEraFilter]);

  // Table columns
  const columns = [
    {
      title: 'Preview',
      key: 'preview',
      width: 120,
      render: (_: any, record: CollageMetadata) => (
        <Image
          src={record.filepath}
          alt={record.filename}
          width={100}
          height={60}
          style={{ objectFit: 'cover', borderRadius: '4px' }}
          preview={{
            mask: 'View',
          }}
        />
      ),
    },
    {
      title: 'Era',
      dataIndex: 'era',
      key: 'era',
      width: 100,
      render: (era: string) => <Tag color="blue">{era}</Tag>,
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 80,
    },
    {
      title: 'Filename',
      dataIndex: 'filename',
      key: 'filename',
      ellipsis: true,
    },
    {
      title: 'Active',
      dataIndex: 'active',
      key: 'active',
      width: 100,
      render: (active: boolean, record: CollageMetadata) => (
        <Switch
          checked={active}
          onChange={() => handleToggleActive(record.id, active)}
          checkedChildren={<EyeOutlined />}
          unCheckedChildren={<EyeInvisibleOutlined />}
        />
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: any, record: CollageMetadata) => (
        <Space>
          <Button
            type="link"
            icon={<ReloadOutlined />}
            onClick={() => handleRegenerate(record)}
            size="small"
          >
            Regenerate
          </Button>
          <Popconfirm
            title="Delete this collage?"
            description="This will permanently delete the collage file and metadata."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>
            Hero Collage Generator
          </Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            Generate and manage hero background collages for different eras
          </Text>
        </div>

        <Tabs
          defaultActiveKey="generate"
          items={[
            {
              key: 'generate',
              label: 'Generate New Collage',
              children: (
                <Card title="Generate Collage">
                  <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                    <Alert
                      title="Collage Generation"
                      description="Creates a creative 'thrown pictures on the floor' mosaic effect using gallery images from the selected era. Each generation creates a unique collage with random positioning and rotation."
                      type="info"
                      showIcon
                      icon={<PictureOutlined />}
                    />
                    
                    <div>
                      <Text strong style={{ display: 'block', marginBottom: '8px' }}>Era:</Text>
                      <Select
                        value={era}
                        onChange={setEra}
                        style={{ width: '100%', maxWidth: '200px' }}
                        options={ERAS.map(e => ({ label: e, value: e }))}
                      />
                    </div>

                    <div>
                      <Text strong style={{ display: 'block', marginBottom: '8px' }}>Version:</Text>
                      <InputNumber
                        value={version}
                        onChange={(val) => setVersion(val || 1)}
                        min={1}
                        max={10}
                        style={{ width: '100%', maxWidth: '200px' }}
                      />
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
                        Version number for the output filename (default: 1)
                      </Text>
                    </div>
                    
                    <Button
                      type="primary"
                      icon={<PictureOutlined />}
                      onClick={handleGenerate}
                      loading={loading}
                      size="large"
                      style={{ marginTop: '16px' }}
                    >
                      Generate Collage
                    </Button>

                    <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                      Note: The collage will be saved to /public/images/ and can be used as a hero background. 
                      Each generation creates a unique layout with random image positions and rotations.
                      New collages are automatically set as active for random selection.
                    </Text>
                  </Space>
                </Card>
              ),
            },
            {
              key: 'manage',
              label: 'Manage Collages',
              children: (
                <Card 
                  title="Collage Management"
                  extra={
                    <Select
                      value={selectedEraFilter}
                      onChange={setSelectedEraFilter}
                      style={{ width: 150 }}
                      options={[
                        { label: 'All Eras', value: 'all' },
                        ...ERAS.map(e => ({ label: e, value: e })),
                      ]}
                    />
                  }
                >
                  <Alert
                    title="Active Collages"
                    description="Only collages marked as 'Active' will be randomly selected for display on the website. Use the toggle switch to enable/disable collages."
                    type="info"
                    showIcon
                    style={{ marginBottom: '16px' }}
                  />

                  {loadingCollages ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <Spin size="large" />
                      <div style={{ marginTop: '16px' }}>
                        <Text>Loading collages...</Text>
                      </div>
                    </div>
                  ) : collages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', border: '1px dashed #d9d9d9', borderRadius: '4px' }}>
                      <PictureOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '16px' }} />
                      <div>
                        <Text type="secondary" style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                          No collages found
                        </Text>
                        <Text type="secondary" style={{ fontSize: '14px' }}>
                          {selectedEraFilter === 'all' 
                            ? 'Generate your first collage to get started!'
                            : `No collages found for ${selectedEraFilter}. Try generating one or select a different era.`}
                        </Text>
                      </div>
                    </div>
                  ) : (
                    <Table
                      columns={columns}
                      dataSource={collages}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      loading={loadingCollages}
                    />
                  )}

                  {/* Summary by Era */}
                  {Object.keys(collagesByEra).length > 0 && (
                    <div style={{ marginTop: '24px' }}>
                      <Title level={4}>Summary by Era</Title>
                      <Space orientation="vertical" style={{ width: '100%' }} size="small">
                        {Object.entries(collagesByEra).map(([era, eraCollages]) => {
                          const activeCount = eraCollages.filter(c => c.active).length;
                          const totalCount = eraCollages.length;
                          return (
                            <div key={era} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                              <Text strong>{era}:</Text>
                              <Text>
                                {activeCount} active / {totalCount} total
                              </Text>
                            </div>
                          );
                        })}
                      </Space>
                    </div>
                  )}
                </Card>
              ),
            },
          ]}
        />

        {/* Results */}
        {loading && (
          <Card>
            <Space orientation="vertical" align="center" style={{ width: '100%', padding: '40px' }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
              <Text>Generating collage...</Text>
            </Space>
          </Card>
        )}

        {result && !loading && (
          <Card 
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>Collage Generated Successfully</span>
              </Space>
            }
          >
            <Space orientation="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong>Era: </Text>
                <Text>{result.era}</Text>
              </div>
              <div>
                <Text strong>Version: </Text>
                <Text>{result.version}</Text>
              </div>
              <div>
                <Text strong>File Path: </Text>
                <Text code>{result.filepath}</Text>
              </div>
              
              {result.filepath && (
                <div style={{ marginTop: '16px' }}>
                  <Text strong style={{ display: 'block', marginBottom: '8px' }}>Preview:</Text>
                  <Image
                    src={result.filepath}
                    alt={`Hero collage for ${result.era}`}
                    style={{ maxWidth: '100%', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                    preview={{
                      mask: 'View Full Size',
                    }}
                  />
                </div>
              )}
            </Space>
          </Card>
        )}
      </Space>
    </div>
  );
}
