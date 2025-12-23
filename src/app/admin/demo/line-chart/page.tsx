'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Space, Typography, Card } from 'antd';

const { Title, Text } = Typography;

export default function LineChartDemo() {
  const data = [
    { name: 'Jan', value: 150 },
    { name: 'Feb', value: 100 },
    { name: 'Mar', value: 80 },
    { name: 'Apr', value: 70 },
    { name: 'May', value: 60 },
    { name: 'Jun', value: 40 },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Line Chart</Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>Line chart component for data visualization using Ant Design Charts</Text>
        </div>

        <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Line Chart Example</Title>}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#1890ff" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <Text type="secondary" style={{ fontSize: '12px', marginTop: '16px', display: 'block' }}>
            This is a sample line chart showing data trends over time.
          </Text>
        </Card>
      </Space>
    </div>
  );
}
