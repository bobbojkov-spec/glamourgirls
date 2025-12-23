'use client';

import { useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Form, Input, Modal, Select, Space, Table, Typography, Spin, Tag } from 'antd';

type AdminUserRow = {
  key: string;
  email: string;
  role: 'admin' | 'super_admin';
  is_active: boolean;
  created_at?: string | null;
  last_login_at?: string | null;
};

async function readJsonSafe(res: Response) {
  const raw = await res.text();
  if (!raw) return { body: null, raw: '' };
  try {
    return { body: JSON.parse(raw), raw };
  } catch {
    return { body: null, raw };
  }
}

export default function AdminUsersPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createForm] = Form.useForm();

  const roleOptions = useMemo(
    () => [
      { label: 'Admin', value: 'admin' },
      { label: 'Super admin', value: 'super_admin' },
    ],
    []
  );

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users/list', { cache: 'no-store' });
      const { body, raw } = await readJsonSafe(res);
      if (!res.ok) throw new Error(body?.error || raw || `Failed to load admin users (${res.status})`);
      const users: AdminUserRow[] = (body.users || []).map((u: any) => ({
        key: String(u.id),
        email: String(u.email),
        role: (u.role || 'admin') as any,
        is_active: Boolean(u.is_active),
        created_at: u.created_at || null,
        last_login_at: u.last_login_at || null,
      }));
      setRows(users);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load admin users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleActive = async (record: AdminUserRow) => {
    const targetActive = !record.is_active;
    try {
      const endpoint = targetActive ? '/api/admin/users/activate' : '/api/admin/users/deactivate';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: record.key }),
      });
      const { body, raw } = await readJsonSafe(res);
      if (!res.ok) throw new Error(body?.error || raw || `Action failed (${res.status})`);
      message.success(targetActive ? 'User activated' : 'User deactivated');
      await loadUsers();
    } catch (e: any) {
      message.error(e?.message || 'Action failed');
    }
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setCreateLoading(true);
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          role: values.role,
        }),
      });
      const { body, raw } = await readJsonSafe(res);
      if (!res.ok) throw new Error(body?.error || raw || `Failed to create admin (${res.status})`);
      message.success('Admin user created');
      setCreateOpen(false);
      createForm.resetFields();
      await loadUsers();
    } catch (e: any) {
      if (e?.message) message.error(e.message);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Admin Users
      </Typography.Title>

      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span>Users</span>
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              Add user
            </Button>
          </div>
        }
      >
        <Spin spinning={loading}>
          {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
          <Table
            size="small"
            tableLayout="auto"
            scroll={{ x: true }}
            style={{ width: '100%' }}
            dataSource={rows}
            pagination={false}
            columns={[
              { title: 'Email', dataIndex: 'email', ellipsis: true },
              {
                title: 'Role',
                dataIndex: 'role',
                render: (value: string) => <Tag color={value === 'super_admin' ? 'gold' : 'blue'}>{value}</Tag>,
                width: 140,
              },
              {
                title: 'Active',
                dataIndex: 'is_active',
                width: 120,
                render: (_: any, record: AdminUserRow) => (
                  <Button size="small" type={record.is_active ? 'primary' : 'default'} onClick={() => toggleActive(record)}>
                    {record.is_active ? 'Active' : 'Inactive'}
                  </Button>
                ),
              },
              {
                title: 'Last login',
                dataIndex: 'last_login_at',
                width: 200,
                render: (val: string) => (val ? new Date(val).toLocaleString() : '—'),
              },
              {
                title: 'Created',
                dataIndex: 'created_at',
                width: 200,
                render: (val: string) => (val ? new Date(val).toLocaleString() : '—'),
              },
            ]}
          />
        </Spin>
      </Card>

      <Modal
        title="Add admin user"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        okText="Create"
        confirmLoading={createLoading}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: 'Email is required' }, { type: 'email', message: 'Enter a valid email' }]}
          >
            <Input placeholder="admin@example.com" />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true, message: 'Role is required' }]}>
            <Select options={roleOptions} />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Password is required' }]}>
            <Input.Password placeholder="Enter password" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="Confirm password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Repeat password" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}


