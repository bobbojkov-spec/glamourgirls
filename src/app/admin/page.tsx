import Link from 'next/link';
import pool from '@/lib/db';
import { Card, Statistic, Row, Col, Space } from 'antd';
import { UserOutlined, PictureOutlined, CheckCircleOutlined, CameraOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Title, Text } from '@/components/admin/AdminTypography';

export default async function AdminDashboard() {
  // Get basic statistics from PostgreSQL
  let totalGirls = 0;
  let publishedGirls = 0;
  let unpublishedGirls = 0;
  let totalImages = 0;
  let galleryImages = 0;
  let hqImages = 0;
  let thumbnails = 0;

  try {
    // Get girls counts
    const [girlsCountResult] = await pool.execute(
      `SELECT 
        COUNT(*)::int as "total",
        SUM(CASE WHEN published = 2 THEN 1 ELSE 0 END)::int as "published",
        SUM(CASE WHEN published != 2 THEN 1 ELSE 0 END)::int as "unpublished"
       FROM girls`
    ) as any[];

    if (girlsCountResult && girlsCountResult.length > 0) {
      totalGirls = Number(girlsCountResult[0].total) || 0;
      publishedGirls = Number(girlsCountResult[0].published) || 0;
      unpublishedGirls = Number(girlsCountResult[0].unpublished) || 0;
    }

    // Get images counts by type
    const [imagesCountResult] = await pool.execute(
      `SELECT 
        COUNT(*)::int as "total",
        SUM(CASE WHEN mytp = 4 THEN 1 ELSE 0 END)::int as "gallery",
        SUM(CASE WHEN mytp = 5 THEN 1 ELSE 0 END)::int as "hq",
        SUM(CASE WHEN mytp = 3 THEN 1 ELSE 0 END)::int as "thumbnails"
       FROM images
       WHERE mytp IN (3, 4, 5)`
    ) as any[];

    if (imagesCountResult && imagesCountResult.length > 0) {
      totalImages = Number(imagesCountResult[0].total) || 0;
      galleryImages = Number(imagesCountResult[0].gallery) || 0;
      hqImages = Number(imagesCountResult[0].hq) || 0;
      thumbnails = Number(imagesCountResult[0].thumbnails) || 0;
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
  }

  const stats = [
    {
      title: 'Total Girls',
      value: totalGirls,
      icon: <UserOutlined style={{ fontSize: '32px', color: '#1890ff' }} />,
      href: '/admin/girls',
      description: `${publishedGirls} published, ${unpublishedGirls} unpublished`,
    },
    {
      title: 'Total Images',
      value: totalImages,
      icon: <PictureOutlined style={{ fontSize: '32px', color: '#1890ff' }} />,
      href: '/admin/girls',
      description: `${galleryImages} gallery, ${hqImages} HQ, ${thumbnails} thumbnails`,
    },
    {
      title: 'Published Girls',
      value: publishedGirls,
      icon: <CheckCircleOutlined style={{ fontSize: '32px', color: '#52c41a' }} />,
      href: '/admin/girls?published=2',
      description: 'Publicly visible',
    },
    {
      title: 'Gallery Images',
      value: galleryImages,
      icon: <CameraOutlined style={{ fontSize: '32px', color: '#1890ff' }} />,
      href: '/admin/girls',
      description: 'Display images',
    },
  ];

  const quickActions = [
    {
      title: 'Add New Girl',
      description: 'Create a new actress entry',
      href: '/admin/girls/new',
      icon: <UserOutlined style={{ fontSize: '24px' }} />,
    },
    {
      title: 'Edit Homepage',
      description: 'Update homepage content and SEO',
      href: '/admin/homepage',
      icon: <CheckCircleOutlined style={{ fontSize: '24px' }} />,
    },
          {
            title: 'Hero Collage Generator',
            description: 'Generate hero background collages',
            href: '/admin/collage-generator',
            icon: <PictureOutlined style={{ fontSize: '24px' }} />,
          },
          {
            title: 'Bulk SEO Generation',
            description: 'Auto-generate SEO for all entries',
            href: '/admin/bulk-seo',
            icon: <ThunderboltOutlined style={{ fontSize: '24px' }} />,
          },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>
            Dashboard
          </Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            Welcome to the Glamour Girls Admin Panel
          </Text>
        </div>

        {/* Stats Grid */}
        <Row gutter={[16, 16]}>
          {stats.map((stat) => (
            <Col xs={24} sm={12} lg={6} key={stat.title}>
              <Link href={stat.href} style={{ textDecoration: 'none' }}>
                <Card hoverable>
                  <Statistic
                    title={stat.title}
                    value={stat.value}
                    prefix={stat.icon}
                    styles={{ content: { color: '#262626' } }}
                  />
                  <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                    {stat.description}
                  </Text>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>

        {/* Quick Actions */}
        <Card title={<Title level={4} style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>Quick Actions</Title>}>
          <Row gutter={[16, 16]}>
            {quickActions.map((action) => (
              <Col xs={24} sm={12} lg={8} key={action.title}>
                <Link href={action.href} style={{ textDecoration: 'none' }}>
                  <Card hoverable>
                    <Space>
                      <div style={{ fontSize: '24px', color: '#1890ff' }}>
                        {action.icon}
                      </div>
                      <div>
                        <Text strong style={{ display: 'block', fontSize: '14px' }}>
                          {action.title}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {action.description}
                        </Text>
                      </div>
                    </Space>
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>
        </Card>
      </Space>
    </div>
  );
}
