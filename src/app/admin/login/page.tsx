'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, App, Button, Card, Form, Input, Space, Typography, Divider } from 'antd';

async function readJsonSafe(res: Response) {
  const raw = await res.text();
  if (!raw) return { body: null, raw: '' };
  try {
    return { body: JSON.parse(raw), raw };
  } catch {
    return { body: null, raw };
  }
}

export default function AdminLogin() {
  const router = useRouter();
  const { message: messageApi } = App.useApp();
  const [form] = Form.useForm();
  const [codeForm] = Form.useForm();
  const [step, setStep] = useState<'creds' | 'code'>('creds');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lastCode, setLastCode] = useState<string | null>(null); // only shown when EXPOSE_LOGIN_CODE=true
  const [hasAdmins, setHasAdmins] = useState<boolean | null>(null); // null = loading, true/false = loaded

  const deviceFingerprint = typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown-device';

  // Check if admin users exist on mount
  useEffect(() => {
    fetch('/api/admin/users/check')
      .then(res => res.json())
      .then(data => {
        setHasAdmins(data.hasAdmins || false);
      })
      .catch(err => {
        console.error('Error checking admin users:', err);
        // On error, assume no admins (safer to show setup message)
        setHasAdmins(false);
      });
  }, []);

  const nextParam =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') || '/admin' : '/admin';

  const handleStart = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      setEmail(values.email);
      setPassword(values.password);
      const res = await fetch('/api/admin/auth/login-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          device_fingerprint: deviceFingerprint,
        }),
      });
      const { body, raw } = await readJsonSafe(res);
      if (!res.ok) throw new Error(body?.error || raw || `Login start failed (${res.status})`);

      if (body.trusted) {
        messageApi.success('Logged in');
        router.push(nextParam);
        return;
      }

      messageApi.success('Code sent to your email');
      setLastCode(body.code || null);
      setStep('code');
    } catch (err: any) {
      if (err?.message) messageApi.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      const values = await codeForm.validateFields();
      setLoading(true);
      const res = await fetch('/api/admin/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: values.code,
          device_fingerprint: deviceFingerprint,
        }),
      });
      const { body, raw } = await readJsonSafe(res);
      if (!res.ok) throw new Error(body?.error || raw || `Code verification failed (${res.status})`);

      messageApi.success('Login successful');
      router.push(nextParam);
    } catch (err: any) {
      if (err?.message) messageApi.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrap = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          role: 'super_admin',
        }),
      });
      const { body, raw } = await readJsonSafe(res);
      if (!res.ok) throw new Error(body?.error || raw || `Bootstrap failed (${res.status})`);
      messageApi.success('First admin created. Now sending your login code...');
      await handleStart();
    } catch (err: any) {
      if (err?.message) messageApi.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%', maxWidth: 420, margin: '40px auto' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Admin Login
      </Typography.Title>

      <Card>
        {step === 'creds' ? (
          <Form layout="vertical" form={form}>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, message: 'Email is required' }, { type: 'email', message: 'Invalid email' }]}
            >
              <Input placeholder="admin@example.com" />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Password is required' }]}>
              <Input.Password placeholder="Password" />
            </Form.Item>
            <Button type="primary" block onClick={handleStart} loading={loading}>
              LOGIN
            </Button>

            {/* Only show first-time setup if no admins exist */}
            {hasAdmins === false && (
              <>
                <Divider style={{ margin: '16px 0' }} />
                <Alert
                  type="info"
                  showIcon
                  title="First-time setup"
                  description="If there are no admin users yet, you can create the first super admin using the email+password above."
                />
                <Button style={{ marginTop: 12 }} block onClick={handleBootstrap} loading={loading}>
                  Create first admin (super admin)
                </Button>
              </>
            )}
          </Form>
        ) : (
          <Space orientation="vertical" style={{ width: '100%' }} size={12}>
            <Alert
              type="info"
              title="Enter the 6-digit code sent to your email."
              description={lastCode ? `Local testing code: ${lastCode}` : undefined}
              showIcon
            />
            <Form layout="vertical" form={codeForm}>
              <Form.Item name="code" label="Code" rules={[{ required: true, message: 'Code is required' }]}>
                <Input placeholder="123456" />
              </Form.Item>
              <Space style={{ width: '100%' }}>
                <Button onClick={() => setStep('creds')}>Back</Button>
                <Button type="primary" onClick={handleVerify} loading={loading}>
                  Verify & Login
                </Button>
              </Space>
            </Form>
          </Space>
        )}
      </Card>
    </Space>
  );
}

