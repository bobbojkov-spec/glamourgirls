'use client';

import { Alert, Space, Typography, Card } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function AlertsDemo() {
  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Alerts</Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>Various alert message components using Ant Design</Text>
        </div>

        <Card title="Success Alerts">
          <Space orientation="vertical" style={{ width: '100%' }}>
            <Alert
              title="Success Message"
              description="This is a success alert with description."
              type="success"
              icon={<CheckCircleOutlined />}
              showIcon
            />
            <Alert
              title="Success Tips"
              description="Detailed description and advice about successful copywriting."
              type="success"
              icon={<CheckCircleOutlined />}
              showIcon
              closable
            />
          </Space>
        </Card>

        <Card title="Info Alerts">
          <Space orientation="vertical" style={{ width: '100%' }}>
            <Alert
              title="Info Message"
              description="This is an info alert with description."
              type="info"
              icon={<InfoCircleOutlined />}
              showIcon
            />
            <Alert
              title="Informational Notes"
              description="Additional description and information about copywriting."
              type="info"
              icon={<InfoCircleOutlined />}
              showIcon
              closable
            />
          </Space>
        </Card>

        <Card title="Warning Alerts">
          <Space orientation="vertical" style={{ width: '100%' }}>
            <Alert
              title="Warning Message"
              description="This is a warning alert with description."
              type="warning"
              icon={<ExclamationCircleOutlined />}
              showIcon
            />
            <Alert
              title="Warning Tips"
              description="This is a warning notice about copywriting."
              type="warning"
              icon={<ExclamationCircleOutlined />}
              showIcon
              closable
            />
          </Space>
        </Card>

        <Card title="Error Alerts">
          <Space orientation="vertical" style={{ width: '100%' }}>
            <Alert
              title="Error Message"
              description="This is an error alert with description."
              type="error"
              icon={<CloseCircleOutlined />}
              showIcon
            />
            <Alert
              title="Error Tips"
              description="This is an error notice about copywriting."
              type="error"
              icon={<CloseCircleOutlined />}
              showIcon
              closable
            />
          </Space>
        </Card>
      </Space>
    </div>
  );
}
