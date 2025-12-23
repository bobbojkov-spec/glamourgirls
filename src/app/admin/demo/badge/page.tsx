'use client';

import { Badge, Space, Typography, Card, Avatar, Button } from 'antd';
import { BellOutlined, ShoppingCartOutlined, UserOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function BadgeDemo() {
  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Badge</Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>Badge components for notifications and status indicators using Ant Design</Text>
        </div>

        <Card title="Basic Badge">
          <Space size="large">
            <Badge count={5}>
              <Avatar shape="square" size="large" icon={<UserOutlined />} />
            </Badge>
            <Badge count={0} showZero>
              <Avatar shape="square" size="large" icon={<UserOutlined />} />
            </Badge>
            <Badge count={99}>
              <Avatar shape="square" size="large" icon={<UserOutlined />} />
            </Badge>
            <Badge count={100}>
              <Avatar shape="square" size="large" icon={<UserOutlined />} />
            </Badge>
            <Badge count={99} overflowCount={10}>
              <Avatar shape="square" size="large" icon={<UserOutlined />} />
            </Badge>
          </Space>
        </Card>

        <Card title="Badge with Icons">
          <Space size="large">
            <Badge count={5}>
              <Button shape="circle" icon={<BellOutlined />} size="large" />
            </Badge>
            <Badge count={0} showZero>
              <Button shape="circle" icon={<ShoppingCartOutlined />} size="large" />
            </Badge>
            <Badge dot>
              <Button shape="circle" icon={<BellOutlined />} size="large" />
            </Badge>
          </Space>
        </Card>

        <Card title="Status Badge">
          <Space size="large">
            <Badge status="success" text="Success" />
            <Badge status="error" text="Error" />
            <Badge status="default" text="Default" />
            <Badge status="processing" text="Processing" />
            <Badge status="warning" text="Warning" />
          </Space>
        </Card>

        <Card title="Badge with Custom Colors">
          <Space size="large">
            <Badge count={5} color="#52c41a">
              <Avatar shape="square" size="large" icon={<UserOutlined />} />
            </Badge>
            <Badge count={5} color="#1890ff">
              <Avatar shape="square" size="large" icon={<UserOutlined />} />
            </Badge>
            <Badge count={5} color="#1890ff">
              <Avatar shape="square" size="large" icon={<UserOutlined />} />
            </Badge>
            <Badge count={5} color="#ff4d4f">
              <Avatar shape="square" size="large" icon={<UserOutlined />} />
            </Badge>
          </Space>
        </Card>

        <Card title="Standalone Badge">
          <Space size="large">
            <Badge count={25} />
            <Badge count={4} color="#52c41a" />
            <Badge count={109} style={{ backgroundColor: '#1890ff' }} />
            <Badge dot />
            <Badge status="success" />
            <Badge status="error" />
            <Badge status="default" />
            <Badge status="processing" />
            <Badge status="warning" />
          </Space>
        </Card>
      </Space>
    </div>
  );
}
