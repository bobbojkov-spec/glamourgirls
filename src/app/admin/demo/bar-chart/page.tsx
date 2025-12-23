'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Space, Typography, Card } from 'antd';

const { Title, Text } = Typography;

export default function BarChartDemo() {
  const data = [
    { name: 'Jan', value: 60 },
    { name: 'Feb', value: 80 },
    { name: 'Mar', value: 45 },
    { name: 'Apr', value: 90 },
    { name: 'May', value: 70 },
    { name: 'Jun', value: 85 },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Bar Chart</Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>Bar chart component for data visualization using Ant Design Charts</Text>
        </div>

        <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Bar Chart Example</Title>}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#1890ff" />
            </BarChart>
          </ResponsiveContainer>
          <Text type="secondary" style={{ fontSize: '12px', marginTop: '16px', display: 'block' }}>
            This is a sample bar chart showing data comparison across categories.
          </Text>
        </Card>
      </Space>
    </div>
  );
}
