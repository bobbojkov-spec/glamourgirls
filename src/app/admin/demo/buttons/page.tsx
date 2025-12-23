'use client';

import { Button, Space, Typography, Card, Divider } from 'antd';
import { DownloadOutlined, SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, PoweroffOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function ButtonsDemo() {
  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Buttons</Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>Button components with different variants and sizes using Ant Design</Text>
        </div>

        <Card title="Button Types">
          <Space wrap>
            <Button type="primary">Primary Button</Button>
            <Button>Default Button</Button>
            <Button type="dashed">Dashed Button</Button>
            <Button type="text">Text Button</Button>
            <Button type="link">Link Button</Button>
          </Space>
        </Card>

        <Card title="Button Sizes">
          <Space wrap>
            <Button type="primary" size="large">Large</Button>
            <Button type="primary">Default</Button>
            <Button type="primary" size="small">Small</Button>
          </Space>
        </Card>

        <Card title="Button with Icons">
          <Space wrap>
            <Button type="primary" icon={<DownloadOutlined />}>Download</Button>
            <Button icon={<SearchOutlined />}>Search</Button>
            <Button type="primary" icon={<PlusOutlined />}>Add</Button>
            <Button icon={<EditOutlined />}>Edit</Button>
            <Button danger icon={<DeleteOutlined />}>Delete</Button>
          </Space>
        </Card>

        <Card title="Button States">
          <Space wrap>
            <Button type="primary">Normal</Button>
            <Button type="primary" loading>Loading</Button>
            <Button type="primary" disabled>Disabled</Button>
            <Button type="primary" icon={<PoweroffOutlined />} loading>Loading with Icon</Button>
          </Space>
        </Card>

        <Card title="Danger Buttons">
          <Space wrap>
            <Button danger>Danger Default</Button>
            <Button danger type="primary">Danger Primary</Button>
            <Button danger type="text">Danger Text</Button>
          </Space>
        </Card>

        <Card title="Button Groups">
          <Space wrap>
            <Button.Group>
              <Button>Left</Button>
              <Button>Middle</Button>
              <Button>Right</Button>
            </Button.Group>
            <Button.Group>
              <Button disabled>L</Button>
              <Button disabled>M</Button>
              <Button disabled>R</Button>
            </Button.Group>
          </Space>
        </Card>

        <Card title="Block Buttons">
          <Space orientation="vertical" style={{ width: '100%' }}>
            <Button type="primary" block>Primary Block Button</Button>
            <Button block>Default Block Button</Button>
            <Button type="dashed" block>Dashed Block Button</Button>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
