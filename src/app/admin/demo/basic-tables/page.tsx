'use client';

import { Table, Tag, Space, Typography, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface DataType {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

export default function BasicTablesDemo() {
  const tableData: DataType[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Editor', status: 'Active' },
  ];

  const columns: ColumnsType<DataType> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      filters: [
        { text: 'Admin', value: 'Admin' },
        { text: 'User', value: 'User' },
        { text: 'Editor', value: 'Editor' },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'Active' ? 'green' : 'default'}>
          {status}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: 'Active' },
        { text: 'Inactive', value: 'Inactive' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <a>Edit</a>
          <a>Delete</a>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Basic Tables</Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>Table components for displaying data using Ant Design</Text>
        </div>

        <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Ant Design Table Example</Title>}>
        <Table
          columns={columns}
          dataSource={tableData}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`,
          }}
        />
        </Card>

        <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Table with Custom Styling</Title>}>
          <Table
            columns={columns}
            dataSource={tableData}
            rowKey="id"
            size="small"
            bordered
            pagination={false}
          />
        </Card>
      </Space>
    </div>
  );
}
