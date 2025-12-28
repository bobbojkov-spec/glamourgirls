'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Alert, Spin, Progress } from 'antd';
import { FileOutlined, ReloadOutlined, DeleteOutlined, LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

type StatsResponse = {
  success: boolean;
  total: number;
  missingSz: number;
  hasSz: number;
};

type CalculateResponse = {
  success: boolean;
  message: string;
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails?: string[];
};

export default function CalculateHQFileSizesAction() {
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [result, setResult] = useState<CalculateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/calculate-hq-file-sizes');
      const data = await response.json();
      
      if (data.success) {
        setStats(data);
      } else {
        setError(data.error || 'Failed to fetch stats');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching stats');
      console.error('Stats error:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCalculate = async (testMode: boolean = false) => {
    setCalculating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/calculate-hq-file-sizes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'calculate',
          limit: testMode ? 2 : undefined // Only process 2 images in test mode
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate file sizes');
      }

      setResult(data);
      // Refresh stats after calculation
      await fetchStats();
    } catch (err: any) {
      setError(err.message || 'An error occurred while calculating file sizes');
      console.error('Calculate error:', err);
    } finally {
      setCalculating(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Are you sure you want to remove all file size data? This cannot be undone.')) {
      return;
    }

    setCleaning(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/calculate-hq-file-sizes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'cleanup' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cleanup file sizes');
      }

      setResult({
        success: true,
        message: data.message,
        processed: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
      });
      // Refresh stats after cleanup
      await fetchStats();
    } catch (err: any) {
      setError(err.message || 'An error occurred while cleaning up');
      console.error('Cleanup error:', err);
    } finally {
      setCleaning(false);
    }
  };

  const progress = stats && stats.total > 0 
    ? Math.round((stats.hasSz / stats.total) * 100) 
    : 0;

  return (
    <Card hoverable style={{ height: '100%' }}>
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <Space>
          <div style={{ fontSize: '24px', color: '#1890ff' }}>
            <FileOutlined />
          </div>
          <div>
            <Text strong style={{ display: 'block', fontSize: '18px', lineHeight: '1.2', textTransform: 'uppercase' }}>
              📊 Calculate HQ File Sizes
            </Text>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              Calculate and store file sizes for HQ images (&gt;1200px)
            </Text>
          </div>
        </Space>

        {error && (
          <Alert
            title="Error"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        {stats && (
          <div>
            <Space orientation="vertical" style={{ width: '100%' }} size="small">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <Text>Total HQ Images (&gt;1200px):</Text>
                <Text strong>{stats.total}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <Text>With File Size:</Text>
                <Text style={{ color: '#52c41a' }}>{stats.hasSz}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <Text>Missing File Size:</Text>
                <Text style={{ color: '#ff4d4f' }}>{stats.missingSz}</Text>
              </div>
              <Progress 
                percent={progress} 
                status={progress === 100 ? 'success' : 'active'}
                size="small"
              />
            </Space>
          </div>
        )}

        {result && (
          <Alert
            title="Calculation Complete"
            description={
              <div>
                <div><strong>Processed:</strong> {result.processed}</div>
                <div><strong>Updated:</strong> {result.updated}</div>
                <div><strong>Skipped:</strong> {result.skipped}</div>
                {result.errors > 0 && (
                  <div style={{ color: '#ff4d4f' }}>
                    <strong>Errors:</strong> {result.errors}
                    {result.errorDetails && result.errorDetails.length > 0 && (
                      <ul style={{ marginTop: '4px', paddingLeft: '20px', fontSize: '11px' }}>
                        {result.errorDetails.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            }
            type={result.errors > 0 ? 'warning' : 'success'}
            showIcon
            closable
            onClose={() => setResult(null)}
          />
        )}

        <Space orientation="vertical" style={{ width: '100%' }} size="small">
          <Button
            type="default"
            icon={calculating ? <LoadingOutlined /> : <FileOutlined />}
            onClick={() => handleCalculate(true)}
            loading={calculating}
            disabled={calculating || cleaning || loading}
            block
          >
            {calculating ? 'Testing...' : 'Test with 2 Images'}
          </Button>
          <Button
            type="primary"
            icon={calculating ? <LoadingOutlined /> : <FileOutlined />}
            onClick={() => handleCalculate(false)}
            loading={calculating}
            disabled={calculating || cleaning || loading}
            block
          >
            {calculating ? 'Calculating...' : 'Calculate All File Sizes'}
          </Button>

          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={fetchStats}
            loading={loading}
            disabled={calculating || cleaning}
            block
          >
            Refresh Stats
          </Button>

          <Button
            type="default"
            danger
            icon={<DeleteOutlined />}
            onClick={handleCleanup}
            loading={cleaning}
            disabled={calculating || cleaning || loading}
            block
          >
            {cleaning ? 'Cleaning...' : 'Cleanup File Sizes'}
          </Button>
        </Space>

        <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
          This will fetch images from Supabase storage and calculate their file sizes. Only processes HQ images where the long side &gt; 1200px.
        </Text>
      </Space>
    </Card>
  );
}

