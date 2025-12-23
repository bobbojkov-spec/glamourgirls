'use client';

import { Avatar, Space, Typography, Card, Badge } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function AvatarsDemo() {
  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Avatars</Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>User avatar components with different sizes and status indicators using Ant Design</Text>
        </div>

        <Card title="Avatar Sizes">
          <Space size="large">
            <Space orientation="vertical" align="center">
              <Avatar size={64} icon={<UserOutlined />} />
              <Text type="secondary" style={{ fontSize: '12px' }}>64px</Text>
            </Space>
            <Space orientation="vertical" align="center">
              <Avatar size="large" icon={<UserOutlined />} />
              <Text type="secondary" style={{ fontSize: '12px' }}>Large</Text>
            </Space>
            <Space orientation="vertical" align="center">
              <Avatar icon={<UserOutlined />} />
              <Text type="secondary" style={{ fontSize: '12px' }}>Default</Text>
            </Space>
            <Space orientation="vertical" align="center">
              <Avatar size="small" icon={<UserOutlined />} />
              <Text type="secondary" style={{ fontSize: '12px' }}>Small</Text>
            </Space>
          </Space>
        </Card>

        <Card title="Avatar with Image">
          <Space size="large">
            <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Avatar1" size={64} />
            <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Avatar2" size="large" />
            <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Avatar3" />
            <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Avatar4" size="small" />
          </Space>
        </Card>

        <Card title="Avatar with Status Badge">
          <Space size="large">
            <Badge status="success" offset={[-2, 2]}>
              <Avatar size={64} icon={<UserOutlined />} />
            </Badge>
            <Badge status="error" offset={[-2, 2]}>
              <Avatar size="large" icon={<UserOutlined />} />
            </Badge>
            <Badge status="warning" offset={[-2, 2]}>
              <Avatar icon={<UserOutlined />} />
            </Badge>
            <Badge status="processing" offset={[-2, 2]}>
              <Avatar size="small" icon={<UserOutlined />} />
            </Badge>
          </Space>
        </Card>

        <Card title="Avatar Group">
          <Avatar.Group>
            <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=1" />
            <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=2" />
            <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=3" />
            <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=4" />
            <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=5" />
            <Avatar style={{ backgroundColor: '#f56a00' }}>K</Avatar>
            <Avatar style={{ backgroundColor: '#87d068' }} icon={<UserOutlined />} />
          </Avatar.Group>
        </Card>

        <Card title="Avatar with Text">
          <Space size="large">
            <Avatar style={{ backgroundColor: '#f56a00' }}>U</Avatar>
            <Avatar style={{ backgroundColor: '#7265e6' }}>USER</Avatar>
            <Avatar style={{ backgroundColor: '#ffbf00' }}>A</Avatar>
            <Avatar style={{ backgroundColor: '#00a2ae' }}>B</Avatar>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
