'use client';

import { Spin } from 'antd';

export default function LoadingFallback() {
  return (
    <div style={{ padding: '48px', textAlign: 'center', minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spin size="large" />
    </div>
  );
}

