'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Space, Typography, Progress, Alert, App } from 'antd';
import { ThunderboltOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { useApp } = App;

export default function BulkSEOPage() {
  const { message } = useApp();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/girls/bulk-generate-seo');
      const data = await response.json();
      if (data.success) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Load stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  const handleGenerateAll = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/girls/bulk-generate-seo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          onlyMissing: false, // Generate for all entries
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        message.success(`Successfully processed ${data.processed} entries!`);
        // Refresh stats
        await fetchStats();
      } else {
        message.error(data.error || 'Failed to generate SEO');
      }
    } catch (error) {
      console.error('Error generating SEO:', error);
      message.error('Error generating SEO. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMissing = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/girls/bulk-generate-seo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          onlyMissing: true, // Only generate for entries without SEO
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        message.success(`Successfully processed ${data.processed} entries!`);
        // Refresh stats
        await fetchStats();
      } else {
        message.error(data.error || 'Failed to generate SEO');
      }
    } catch (error) {
      console.error('Error generating SEO:', error);
      message.error('Error generating SEO. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>
            Bulk SEO Generation
          </Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            Auto-generate and save SEO text for all actress entries
          </Text>
        </div>

        {/* Statistics */}
        {stats && (
          <Card title="SEO Status">
            <Space orientation="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Total Entries: </Text>
                <Text>{stats.total}</Text>
              </div>
              <div>
                <Text strong>With SEO: </Text>
                <Text style={{ color: '#52c41a' }}>{stats.withSEO}</Text>
              </div>
              <div>
                <Text strong>Without SEO: </Text>
                <Text style={{ color: '#ff4d4f' }}>{stats.withoutSEO}</Text>
              </div>
              <Progress 
                percent={stats.percentage} 
                status={stats.percentage === 100 ? 'success' : 'active'}
                format={(percent) => `${percent}% Complete`}
              />
            </Space>
          </Card>
        )}

        {/* Actions */}
        <Card title="Actions">
          <Space orientation="vertical" style={{ width: '100%' }}>
            <Alert
              title="Bulk SEO Generation"
              description="This will generate SEO metadata (titles, descriptions, keywords, etc.) for all entries using the same algorithm as the individual auto-generate feature."
              type="info"
              showIcon
              icon={<ThunderboltOutlined />}
            />
            
            <Space>
              <Button
                type="default"
                icon={<ThunderboltOutlined />}
                onClick={handleGenerateMissing}
                loading={loading}
                size="large"
              >
                Generate SEO for Missing Entries Only
              </Button>
              
              <Button
                type="default"
                icon={<ThunderboltOutlined />}
                onClick={handleGenerateAll}
                loading={loading}
                size="large"
                style={{ fontWeight: 'bold', borderWidth: '2px', borderStyle: 'solid' }}
              >
                Generate SEO for All Entries
              </Button>
            </Space>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              Note: Generating for all entries will overwrite existing SEO data. Use "Missing Entries Only" to preserve existing SEO.
            </Text>
          </Space>
        </Card>

        {/* Results */}
        {result && (
          <Card title="Generation Results">
            <Space orientation="vertical" style={{ width: '100%' }}>
              {result.successful > 0 && (
                <Alert
                  title={`Successfully processed ${result.successful} entries`}
                  type="success"
                  icon={<CheckCircleOutlined />}
                />
              )}
              
              {result.failed > 0 && (
                <Alert
                  title={`Failed to process ${result.failed} entries`}
                  type="warning"
                  icon={<ExclamationCircleOutlined />}
                  description={
                    result.errors && result.errors.length > 0 ? (
                      <div style={{ marginTop: '8px' }}>
                        <Text strong>Errors:</Text>
                        <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
                          {result.errors.slice(0, 10).map((err: any, idx: number) => (
                            <li key={idx} style={{ fontSize: '12px' }}>
                              {err.name} (ID: {err.id}): {err.error}
                            </li>
                          ))}
                          {result.errors.length > 10 && (
                            <li style={{ fontSize: '12px' }}>... and {result.errors.length - 10} more</li>
                          )}
                        </ul>
                      </div>
                    ) : null
                  }
                />
              )}

              <div>
                <Text strong>Total Processed: </Text>
                <Text>{result.processed} of {result.total}</Text>
              </div>
            </Space>
          </Card>
        )}
      </Space>
    </div>
  );
}

