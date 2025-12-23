'use client';

import { Calendar, Space, Typography, Card } from 'antd';

const { Title, Text } = Typography;

export default function CalendarDemo() {
  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Calendar</Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>Calendar component for date selection and scheduling using Ant Design</Text>
        </div>

        <Card>
          <Calendar fullscreen={false} />
        </Card>

        <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Full Screen Calendar</Title>}>
          <Calendar />
        </Card>
      </Space>
    </div>
  );
}
