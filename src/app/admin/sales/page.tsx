'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, Statistic, Row, Col, Typography, Table, Tag, Button, Select, Space, Spin, App } from 'antd';
import { DollarOutlined, ShoppingOutlined, PictureOutlined } from '@ant-design/icons';
import OrderDetailModal from '@/components/admin/sales/OrderDetailModal';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { useApp } = App;

interface Order {
  orderId: string;
  email: string;
  paymentMethod: string;
  imageCount: number;
  total: number;
  createdAt: string;
  used: boolean;
  downloads?: Array<{
    imageId: string;
    downloadedAt: string;
  }>;
  items: Array<{
    imageId: string;
    actressName: string;
    imageUrl: string;
    width?: number;
    height?: number;
    fileSizeMB?: number;
  }>;
}

interface SalesSummary {
  totalBuys: number;
  totalImages: number;
  totalSum: number;
}

export default function SalesPage() {
  const { message } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<SalesSummary>({ totalBuys: 0, totalImages: 0, totalSum: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [timelinePeriod, setTimelinePeriod] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
    fetchTimeline();
  }, [timelinePeriod]);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/admin/orders');
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      message.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const response = await fetch(`/api/admin/sales/timeline?period=${timelinePeriod}`);
      const data = await response.json();
      
      if (data.success) {
        setTimeline(data.timeline);
      }
    } catch (error) {
      console.error('Error fetching timeline:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleResendEmail = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setResendingEmail(orderId);
    
    try {
      const response = await fetch('/api/checkout/resend-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      if (data.success) {
        const orderEmail = orders.find(o => o.orderId === orderId)?.email;
        message.success(`Email sent successfully to ${orderEmail}`);
      } else {
        if (data.skipped) {
          message.warning('Email service not configured. Please add RESEND_API_KEY to .env.local');
        } else {
          message.error(`Failed to send email: ${data.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error resending email:', error);
      message.error('Error sending email. Please try again.');
    } finally {
      setResendingEmail(null);
    }
  };

  const columns: ColumnsType<Order> = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => <Text style={{ fontSize: '12px' }}>{formatDate(date)}</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => <Text style={{ fontSize: '12px' }}>{email}</Text>,
    },
    {
      title: 'Images',
      dataIndex: 'imageCount',
      key: 'imageCount',
      render: (count: number) => <Text style={{ fontSize: '12px' }}>{count}</Text>,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (total: number) => (
        <Text strong style={{ fontSize: '12px', color: '#1890ff' }}>
          {formatCurrency(total)}
        </Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: Order) => (
        <Space>
          <Tag color={record.used ? 'warning' : 'success'}>
            {record.used ? 'Used' : 'Active'}
          </Tag>
          {!record.used && (
            <Button
              type="link"
              size="small"
              loading={resendingEmail === record.orderId}
              onClick={(e) => handleResendEmail(record.orderId, e)}
              style={{ fontSize: '10px', padding: 0 }}
            >
              resend mail
            </Button>
          )}
        </Space>
      ),
    },
    {
      title: 'Details',
      key: 'details',
      render: (_: any, record: Order) => (
        <Button
          type="link"
          onClick={() => setSelectedOrder(record)}
          style={{ fontSize: '12px', color: '#1890ff' }}
        >
          View Details
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text>Loading sales statistics...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>
            HQ Images Sales Statistics
          </Title>
        </div>

        {/* Timeline Chart */}
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>
                Sales Timeline
              </Title>
              <Select
                value={timelinePeriod}
                onChange={setTimelinePeriod}
                style={{ width: 150 }}
                size="small"
              >
                <Select.Option value="all">All Time</Select.Option>
                <Select.Option value="month">Last Month</Select.Option>
                <Select.Option value="6months">Last 6 Months</Select.Option>
                <Select.Option value="year">Last Year</Select.Option>
              </Select>
            </div>
          }
        >
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: any, name?: string) => {
                    if (name === 'revenue') return formatCurrency(value);
                    return value;
                  }}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="purchases" 
                  stroke="#1890ff" 
                  strokeWidth={2}
                  name="Purchases"
                  dot={{ r: 4 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#1890ff" 
                  strokeWidth={2}
                  name="Revenue"
                  dot={{ r: 4 }}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="images" 
                  stroke="#52c41a" 
                  strokeWidth={2}
                  name="Images Sold"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <Text type="secondary">No sales data available for the selected period</Text>
            </div>
          )}
        </Card>

        {/* Summary Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Total Purchases"
                value={summary.totalBuys}
                prefix={<ShoppingOutlined style={{ color: '#1890ff' }} />}
                styles={{ content: { color: '#262626' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Total Images Sold"
                value={summary.totalImages}
                prefix={<PictureOutlined style={{ color: '#52c41a' }} />}
                styles={{ content: { color: '#262626' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Total Revenue"
                value={summary.totalSum}
                prefix={<DollarOutlined style={{ color: '#1890ff' }} />}
                precision={2}
                styles={{ content: { color: '#1890ff' } }}
                formatter={(value) => formatCurrency(Number(value))}
              />
            </Card>
          </Col>
        </Row>

        {/* Orders Table */}
        <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Orders</Title>}>
          <Table
            columns={columns}
            dataSource={orders}
            rowKey="orderId"
            pagination={{ pageSize: 20 }}
            locale={{
              emptyText: <Text type="secondary">No purchases yet</Text>,
            }}
          />
        </Card>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
        )}
      </Space>
    </div>
  );
}
