'use client';

import Link from 'next/link';
import { Result, Button, Typography, Space } from 'antd';
import { HomeOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function Error404Demo() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <Result
        status="404"
        title={<Title level={2} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>404</Title>}
        subTitle="We can't seem to find the page you are looking for!"
        extra={
          <Link href="/admin">
            <Button type="primary" icon={<HomeOutlined />} size="large">
              Back to Dashboard
            </Button>
          </Link>
        }
      />
    </div>
  );
}
