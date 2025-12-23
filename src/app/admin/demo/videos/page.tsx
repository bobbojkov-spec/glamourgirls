'use client';

import { Space, Typography, Card } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function VideosDemo() {
  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Videos</Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>Video embedding and display components using Ant Design</Text>
        </div>

        <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>16:9 Aspect Ratio Video</Title>}>
          <div style={{ aspectRatio: '16/9', backgroundColor: '#000', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Space orientation="vertical" align="center">
              <PlayCircleOutlined style={{ fontSize: '64px', color: '#fff' }} />
              <Text style={{ color: '#fff' }}>Video Player Placeholder</Text>
            </Space>
          </div>
        </Card>

        <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>4:3 Aspect Ratio Video</Title>}>
          <div style={{ aspectRatio: '4/3', backgroundColor: '#000', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Space orientation="vertical" align="center">
              <PlayCircleOutlined style={{ fontSize: '64px', color: '#fff' }} />
              <Text style={{ color: '#fff' }}>Video Player Placeholder</Text>
            </Space>
          </div>
        </Card>

        <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>1:1 Square Video</Title>}>
          <div style={{ maxWidth: '400px', margin: '0 auto', aspectRatio: '1/1', backgroundColor: '#000', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Space orientation="vertical" align="center">
              <PlayCircleOutlined style={{ fontSize: '64px', color: '#fff' }} />
              <Text style={{ color: '#fff' }}>Video Player Placeholder</Text>
            </Space>
          </div>
        </Card>
      </Space>
    </div>
  );
}
