'use client';

import { Card, Typography, Space, Button } from 'antd';

const { Title, Text } = Typography;

export default function BlankDemo() {
  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ minHeight: '400px', padding: '48px', textAlign: 'center' }}>
          <Space orientation="vertical" size="large" style={{ width: '100%', maxWidth: '630px', margin: '0 auto' }}>
            <Title level={3} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Card Title Here</Title>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              Start putting content on grids or panels, you can also use different
              combinations of grids. Please check out the dashboard and other pages
              for examples of how to structure your content.
            </Text>
            <div style={{ marginTop: '32px' }}>
              <Button type="primary" size="large">Get Started</Button>
            </div>
          </Space>
        </div>
      </Card>
    </div>
  );
}
