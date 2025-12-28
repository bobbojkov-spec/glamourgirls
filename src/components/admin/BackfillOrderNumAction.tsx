'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Alert, Spin } from 'antd';
import { ReloadOutlined, LoadingOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';

const { Text } = Typography;

type StatsResponse = {
  total: number;
  withOrder: number;
  withoutOrder: number;
  isComplete: boolean;
  girlsWithGaps?: Array<{
    girlId: number;
    total: number;
    minOrder: number;
    maxOrder: number;
  }>;
};

type BackfillResponse = {
  success: boolean;
  message?: string;
  error?: string;
  processed?: number;
  updated?: number;
  girlsProcessed?: number;
  remainingNulls?: number;
  errors?: Array<{ girlId: number; error: string }>;
};

export default function BackfillOrderNumAction() {
  const [loading, setLoading] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [result, setResult] = useState<BackfillResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/images/backfill-order-num');
      const data = await response.json();
      
      if (response.ok) {
        setStats(data);
      } else {
        setError(data.error || 'Failed to fetch stats');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching stats');
      console.error('Stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleBackfill = async () => {
    if (!confirm('This will set order_num for all gallery images that currently have NULL order_num. Continue?')) {
      return;
    }

    setBackfilling(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/images/backfill-order-num', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to backfill order_num');
      }

      setResult(data);
      // Refresh stats after backfill
      await fetchStats();
    } catch (err: any) {
      setError(err.message || 'An error occurred while backfilling order_num');
      console.error('Backfill error:', err);
    } finally {
      setBackfilling(false);
    }
  };

  return (
    <Card
      title={
        <Space>
          <ReloadOutlined style={{ color: '#1890ff' }} />
          <Text strong>Backfill Order Num</Text>
        </Space>
      }
      style={{ height: '100%' }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {loading && !stats && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin />
          </div>
        )}

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

        {result && (
          <Alert
            title={result.success ? 'Backfill Complete' : 'Backfill Failed'}
            description={
              result.success ? (
                <div>
                  <div>{result.message}</div>
                  {result.updated !== undefined && (
                    <div style={{ marginTop: '8px' }}>
                      <Text strong>Updated: </Text>
                      <Text>{result.updated} images</Text>
                      {result.girlsProcessed !== undefined && (
                        <>
                          <Text strong style={{ marginLeft: '16px' }}>Girls: </Text>
                          <Text>{result.girlsProcessed}</Text>
                        </>
                      )}
                    </div>
                  )}
                  {result.remainingNulls !== undefined && result.remainingNulls > 0 && (
                    <div style={{ marginTop: '8px', color: '#ff4d4f' }}>
                      <WarningOutlined /> {result.remainingNulls} images still have NULL order_num
                    </div>
                  )}
                  {result.errors && result.errors.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <Text type="warning">Errors: {result.errors.length}</Text>
                    </div>
                  )}
                </div>
              ) : (
                result.error || 'Unknown error'
              )
            }
            type={result.success ? 'success' : 'error'}
            showIcon
            closable
            onClose={() => setResult(null)}
          />
        )}

        {stats && (
          <>
            <div>
              <Text strong>Total Gallery Images: </Text>
              <Text>{stats.total}</Text>
            </div>
            <div>
              <Text strong>With Order Num: </Text>
              <Text style={{ color: stats.withOrder === stats.total ? '#52c41a' : '#ff4d4f' }}>
                {stats.withOrder}
              </Text>
            </div>
            <div>
              <Text strong>Without Order Num: </Text>
              <Text style={{ color: stats.withoutOrder === 0 ? '#52c41a' : '#ff4d4f' }}>
                {stats.withoutOrder}
              </Text>
            </div>
            {stats.isComplete && (
              <Alert
                title="✅ All images have order_num"
                description="You can now run the migration SQL to add the NOT NULL constraint."
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
              />
            )}
            {!stats.isComplete && stats.withoutOrder > 0 && (
              <Alert
                title="⚠️ Some images need order_num"
                description={`${stats.withoutOrder} images still have NULL or 0 order_num. Click "Run Backfill" to fix them.`}
                type="warning"
                showIcon
              />
            )}
            {stats.girlsWithGaps && stats.girlsWithGaps.length > 0 && (
              <Alert
                title="⚠️ Order gaps detected"
                description={`${stats.girlsWithGaps.length} girls have gaps in their order_num sequence.`}
                type="warning"
                showIcon
              />
            )}
          </>
        )}

        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Button
            type="primary"
            icon={backfilling ? <LoadingOutlined /> : <ReloadOutlined />}
            onClick={handleBackfill}
            loading={backfilling}
            disabled={backfilling || loading}
            block
            danger={stats?.withoutOrder === 0}
          >
            {backfilling ? 'Running Backfill...' : stats?.withoutOrder === 0 ? 'Backfill Already Complete' : 'Run Backfill'}
          </Button>

          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={fetchStats}
            loading={loading}
            disabled={backfilling}
            block
          >
            Refresh Stats
          </Button>
        </Space>

        <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
          This will set order_num for all gallery images (mytp = 4) that currently have NULL order_num. Images are ordered by created_at, then id.
        </Text>
      </Space>
    </Card>
  );
}

