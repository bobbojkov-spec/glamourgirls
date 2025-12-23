'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, Statistic, Row, Col, Table, Select, Space, Typography, Spin, Tag, Button, App } from 'antd';
import { EyeOutlined, UserOutlined, BarChartOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { useApp } = App;

interface GirlStat {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  viewCount: number;
  lastViewed: string | null;
}

export default function GirlsStatsPage() {
  const { message } = useApp();
  const [stats, setStats] = useState<GirlStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>('all');

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/girls-stats?period=${period}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      } else {
        message.error('Failed to fetch statistics');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      message.error('Error fetching statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const totalViews = stats.reduce((sum, stat) => sum + stat.viewCount, 0);
  const averageViews = stats.length > 0 ? Math.round(totalViews / stats.length) : 0;

  const columns: ColumnsType<GirlStat> = [
    {
      title: 'Rank',
      key: 'rank',
      width: 80,
      render: (_: any, __: any, index: number) => (
        <Text strong style={{ fontSize: '14px' }}>#{index + 1}</Text>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Text style={{ fontSize: '14px' }}>{text}</Text>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Views',
      dataIndex: 'viewCount',
      key: 'viewCount',
      render: (count: number) => (
        <Text style={{ fontSize: '14px' }}>{formatNumber(count)}</Text>
      ),
      sorter: (a, b) => a.viewCount - b.viewCount,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Last Viewed',
      dataIndex: 'lastViewed',
      key: 'lastViewed',
      render: (date: string | null) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {formatDate(date)}
        </Text>
      ),
      sorter: (a, b) => {
        if (!a.lastViewed) return 1;
        if (!b.lastViewed) return -1;
        return new Date(a.lastViewed).getTime() - new Date(b.lastViewed).getTime();
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: GirlStat) => (
        <Link href={`/admin/girls/${record.id}`}>
          <Button type="link" icon={<EditOutlined />} size="small">
            Edit
          </Button>
        </Link>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text>Loading statistics...</Text>
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
            Girls Statistics
          </Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            Track which entries are viewed most
          </Text>
        </div>

        {/* Period Filter */}
        <Card>
          <Space>
            <Text strong style={{ fontSize: '14px' }}>Time Period:</Text>
            <Select
              value={period}
              onChange={setPeriod}
              style={{ width: 200 }}
              size="large"
            >
              <Select.Option value="all">All Time</Select.Option>
              <Select.Option value="month">Last Month</Select.Option>
              <Select.Option value="6months">Last 6 Months</Select.Option>
              <Select.Option value="year">Last Year</Select.Option>
            </Select>
          </Space>
        </Card>

        {/* Summary Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title={<Text style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Total Entries Tracked</Text>}
                value={stats.length}
                prefix={<UserOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title={<Text style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Total Views</Text>}
                value={formatNumber(totalViews)}
                prefix={<EyeOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title={<Text style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Average Views per Entry</Text>}
                value={formatNumber(averageViews)}
                prefix={<BarChartOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* Stats Table */}
        <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>View Statistics</Title>}>
          {stats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#8c8c8c' }}>
              <Text>No view data available for the selected period</Text>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={stats}
              rowKey="id"
              pagination={{ pageSize: 20 }}
              scroll={{ x: 'max-content' }}
            />
          )}
        </Card>
      </Space>
    </div>
  );
}
