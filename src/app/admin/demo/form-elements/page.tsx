'use client';

import { Form, Input, Select, Space, Typography, Card, Checkbox, Radio, Row, Col } from 'antd';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function FormElementsDemo() {
  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Form Elements</Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>Various form input components and elements using Ant Design</Text>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Default Inputs</Title>}>
              <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                <Form.Item label="Text Input">
                  <Input placeholder="Enter text" />
                </Form.Item>
                <Form.Item label="Email Input">
                  <Input type="email" placeholder="email@example.com" />
                </Form.Item>
                <Form.Item label="Password Input">
                  <Input.Password placeholder="Password" />
                </Form.Item>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Select & Textarea</Title>}>
              <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                <Form.Item label="Select Dropdown">
                  <Select placeholder="Select option">
                    <Select.Option value="option1">Option 1</Select.Option>
                    <Select.Option value="option2">Option 2</Select.Option>
                    <Select.Option value="option3">Option 3</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Textarea">
                  <TextArea rows={4} placeholder="Enter message" />
                </Form.Item>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Checkboxes & Radio</Title>}>
              <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <Text strong style={{ display: 'block', marginBottom: '8px' }}>Checkboxes:</Text>
                  <Checkbox.Group>
                    <Space orientation="vertical">
                      <Checkbox>Checkbox Option 1</Checkbox>
                      <Checkbox>Checkbox Option 2</Checkbox>
                    </Space>
                  </Checkbox.Group>
                </div>
                <div>
                  <Text strong style={{ display: 'block', marginBottom: '8px' }}>Radio Buttons:</Text>
                  <Radio.Group>
                    <Space orientation="vertical">
                      <Radio value="option1">Radio Option 1</Radio>
                      <Radio value="option2">Radio Option 2</Radio>
                    </Space>
                  </Radio.Group>
                </div>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Input States</Title>}>
              <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                <Form.Item label="Disabled Input">
                  <Input disabled value="Disabled" />
                </Form.Item>
                <Form.Item label="Error Input" validateStatus="error" help="This field has an error">
                  <Input />
                </Form.Item>
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
}
