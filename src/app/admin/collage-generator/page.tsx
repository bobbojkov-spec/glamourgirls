'use client';

import { useState } from 'react';
import { Button, Card, Space, Typography, Select, InputNumber, Alert, App, Spin, Image } from 'antd';
import { PictureOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { useApp } = App;

const ERAS = ['1930s', '1940s', '1950s', '1960s'];

export default function CollageGeneratorPage() {
  const { message } = useApp();
  const [loading, setLoading] = useState(false);
  const [era, setEra] = useState<string>('1930s');
  const [version, setVersion] = useState<number>(1);
  const [result, setResult] = useState<{ filepath: string; era: string; version: number } | null>(null);

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

  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>
            Hero Collage Generator
          </Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            Generate hero background collages for different eras
          </Text>
        </div>

        {/* Generator Form */}
        <Card title="Generate Collage">
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            <Alert
              message="Collage Generation"
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
            </Text>
          </Space>
        </Card>

        {/* Results */}
        {loading && (
          <Card>
            <Space direction="vertical" align="center" style={{ width: '100%', padding: '40px' }}>
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

