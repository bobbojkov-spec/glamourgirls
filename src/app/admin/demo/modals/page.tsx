'use client';

import { useState } from 'react';
import { Modal, Button, Space, Typography, Card, Input, Form, App } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { useApp } = App;

export default function ModalsDemo() {
  const { modal } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [modalType, setModalType] = useState('');

  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Modals</Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>Modal dialog components for user interactions using Ant Design</Text>
        </div>

        <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Modal Examples</Title>}>
          <Space wrap>
            <Button
              type="primary"
              onClick={() => {
                setIsOpen(true);
                setModalType('default');
              }}
            >
              Open Default Modal
            </Button>
            <Button
              type="primary"
              onClick={() => {
                setIsOpen(true);
                setModalType('form');
              }}
            >
              Open Form Modal
            </Button>
            <Button
              type="primary"
              onClick={() => {
                modal.confirm({
                  title: 'Confirm Action',
                  icon: <ExclamationCircleOutlined />,
                  content: 'Are you sure you want to perform this action?',
                  onOk() {
                    console.log('Confirmed');
                  },
                });
              }}
            >
              Open Confirm Modal
            </Button>
            <Button
              type="primary"
              danger
              onClick={() => {
                modal.warning({
                  title: 'Warning',
                  content: 'This is a warning message.',
                });
              }}
            >
              Open Warning Modal
            </Button>
          </Space>
        </Card>

        <Modal
          title={modalType === 'form' ? 'Form Modal' : 'Default Modal'}
          open={isOpen}
          onCancel={() => setIsOpen(false)}
          onOk={() => setIsOpen(false)}
          width={modalType === 'form' ? 600 : 520}
        >
          {modalType === 'form' ? (
            <Form layout="vertical" style={{ marginTop: '16px' }}>
              <Form.Item label="Name">
                <Input placeholder="Enter name" />
              </Form.Item>
              <Form.Item label="Email">
                <Input type="email" placeholder="Enter email" />
              </Form.Item>
              <Form.Item label="Message">
                <Input.TextArea rows={4} placeholder="Enter message" />
              </Form.Item>
            </Form>
          ) : (
            <Text>This is a modal dialog. You can add any content here.</Text>
          )}
        </Modal>
      </Space>
    </div>
  );
}
