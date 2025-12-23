'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import GirlForm from '@/components/admin/girls/GirlForm';
import { Title, Text } from '@/components/admin/AdminTypography';
import { Space } from 'antd';

export default function NewGirlPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSuccess = () => {
    router.push('/admin/girls');
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Add New Girl</Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>Create a new actress entry</Text>
        </div>

        <GirlForm onSuccess={handleSuccess} isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />
      </Space>
    </div>
  );
}
