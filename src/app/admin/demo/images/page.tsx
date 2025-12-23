'use client';

import { Space, Typography, Card } from 'antd';
import { PictureOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function ImagesDemo() {
  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Images</Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>Image display components and layouts using Ant Design</Text>
        </div>

        <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Responsive Image</Title>}>
          <div style={{ width: '100%' }}>
            <div style={{ aspectRatio: '16/9', backgroundColor: '#f5f5f5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Space orientation="vertical" align="center">
                <PictureOutlined style={{ fontSize: '48px', color: '#8c8c8c' }} />
                <Text type="secondary">Responsive Image Placeholder</Text>
              </Space>
            </div>
          </div>
        </Card>

        <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>2 Column Image Grid</Title>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {[1, 2].map((i) => (
              <div key={i} style={{ aspectRatio: '1/1', backgroundColor: '#f5f5f5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text type="secondary">Image {i}</Text>
              </div>
            ))}
          </div>
        </Card>

        <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>3 Column Image Grid</Title>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ aspectRatio: '1/1', backgroundColor: '#f5f5f5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>Image {i}</Text>
              </div>
            ))}
          </div>
        </Card>
      </Space>
    </div>
  );
}
