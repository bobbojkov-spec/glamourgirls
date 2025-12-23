'use client';

import { Space, Typography, Card, Avatar, Descriptions } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function ProfileDemo() {
  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Profile</Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>User profile page with information cards using Ant Design</Text>
        </div>

        <Card>
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '24px', borderBottom: '1px solid #f0f0f0' }}>
              <Avatar size={80} icon={<UserOutlined />} style={{ backgroundColor: '#7265e6' }}>JD</Avatar>
              <div>
                <Title level={3} style={{ margin: 0 }}>John Doe</Title>
                <Text type="secondary" style={{ fontSize: '14px', display: 'block' }}>john.doe@example.com</Text>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Administrator</Text>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Personal Information</Title>} size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Full Name">John Doe</Descriptions.Item>
                  <Descriptions.Item label="Email">john.doe@example.com</Descriptions.Item>
                  <Descriptions.Item label="Phone">+1 (555) 123-4567</Descriptions.Item>
                </Descriptions>
              </Card>

              <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Address</Title>} size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Street">123 Main Street</Descriptions.Item>
                  <Descriptions.Item label="City">New York</Descriptions.Item>
                  <Descriptions.Item label="Country">United States</Descriptions.Item>
                </Descriptions>
              </Card>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
