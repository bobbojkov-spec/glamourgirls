'use client';

import { useState } from 'react';
import { Card, Button, Space, Typography, Alert, Spin, Collapse, Tag } from 'antd';
import { SearchOutlined, SaveOutlined, LoadingOutlined } from '@ant-design/icons';
import type { RelationPreview } from '@/scripts/rebuildRelatedActresses';

const { Text, Title } = Typography;
const { Panel } = Collapse;

type PreviewResponse = {
  success: boolean;
  preview: boolean;
  processed: number;
  totalRelations: number;
  relations: RelationPreview[];
  message: string;
};

type SaveResponse = {
  success: boolean;
  preview: boolean;
  processed: number;
  totalRelations: number;
  message: string;
};

export default function RelatedActressesAction() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [saveResult, setSaveResult] = useState<SaveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    setPreviewData(null);
    setSaveResult(null);

    try {
      const response = await fetch('/api/admin/rebuild-related', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preview: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to preview relations');
      }

      setPreviewData(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while previewing relations');
      console.error('Preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/rebuild-related', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preview: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to save relations');
      }

      setSaveResult(data);
      setPreviewData(null); // Clear preview after saving
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving relations');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card hoverable style={{ height: '100%' }}>
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <Space>
          <div style={{ fontSize: '24px', color: '#1890ff' }}>
            <SearchOutlined />
          </div>
          <div>
            <Text strong style={{ display: 'block', fontSize: '28px', lineHeight: '1.2' }}>
              🔍 Search for related actresses
            </Text>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              Discover and save relations between actresses
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

        {saveResult && (
          <Alert
            title="Success"
            description={saveResult.message}
            type="success"
            showIcon
            closable
            onClose={() => setSaveResult(null)}
          />
        )}

        {!previewData && !saveResult && (
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handlePreview}
            loading={loading}
            disabled={loading || saving}
            block
          >
            {loading ? 'Searching...' : 'Preview Relations'}
          </Button>
        )}

        {previewData && (
          <>
            <Alert
              title="Preview Results"
              description={
                <div>
                  <div>Processed: <strong>{previewData.processed}</strong> actresses</div>
                  <div>Found: <strong>{previewData.totalRelations}</strong> relations</div>
                </div>
              }
              type="info"
              showIcon
            />

            {previewData.relations.length > 0 && (
              <Collapse
                size="small"
                items={[
                  {
                    key: 'relations',
                    label: `View Relations (${previewData.relations.length})`,
                    children: (
                      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {previewData.relations
                          .slice(0, 50) // Limit to first 50 for performance
                          .map((rel, idx) => (
                            <div
                              key={`${rel.actress_id}-${rel.related_id}-${idx}`}
                              style={{
                                padding: '8px',
                                marginBottom: '8px',
                                border: '1px solid #f0f0f0',
                                borderRadius: '4px',
                              }}
                            >
                              <div style={{ marginBottom: '4px' }}>
                                <Text strong>{rel.actress_name}</Text>
                                <Text> → </Text>
                                <Text strong>{rel.related_name}</Text>
                                <Tag color="blue" style={{ marginLeft: '8px' }}>
                                  Score: {rel.score.toFixed(2)}
                                </Tag>
                              </div>
                              <div style={{ fontSize: '11px', color: '#666' }}>
                                Reasons:{' '}
                                {rel.reasons.map((r, i) => (
                                  <span key={i}>
                                    {r.type === 'text_similarity'
                                      ? `Similarity: ${(r.value * 100).toFixed(1)}%`
                                      : 'Name mention'}
                                    {i < rel.reasons.length - 1 && ', '}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        {previewData.relations.length > 50 && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Showing first 50 of {previewData.relations.length} relations
                          </Text>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            )}

            <Space style={{ width: '100%' }}>
              <Button
                type="default"
                icon={<SearchOutlined />}
                onClick={handlePreview}
                loading={loading}
                disabled={loading || saving}
              >
                Refresh Preview
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saving}
                disabled={loading || saving}
                style={{ flex: 1 }}
              >
                {saving ? 'Saving...' : 'Save Relations'}
              </Button>
            </Space>
          </>
        )}
      </Space>
    </Card>
  );
}

