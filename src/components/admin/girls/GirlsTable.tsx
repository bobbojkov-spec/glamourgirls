'use client';

import { Table, Button, Space, Typography, Card, Radio, Input, Row, Col } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import Link from 'next/link';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useRef, useState } from 'react';

const { Title, Text } = Typography;
const { Search } = Input;

interface Girl {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  slug: string;
  photoCount: number;
  hqPhotoCount: number;
  createdAt: string;
  updatedAt: string;
}

type CachedGirl = Girl & {
  published?: number | null;
  isNew?: number | null; // 1/2 (db: isnew)
  hasNewPhotos?: number | null; // 1/2 (db: isnewpix)
  era?: number | null; // db: godini
  theirMan?: boolean | number | null; // db: theirman
};

interface GirlsTableProps {
  girls: Girl[];
  total: number;
  currentPage: number;
  totalPages: number;
  searchParams: {
    published?: string;
    isNew?: string;
    hasNewPhotos?: string;
    era?: string;
    keyword?: string;
  };
}

export default function GirlsTable({ girls, total, currentPage, totalPages, searchParams: initialSearchParams }: GirlsTableProps) {
  const CACHE_KEY = 'admin_girls_cache_v1';
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes (reduced from 6h to prevent stale data)
  
  // Function to clear cache (can be called after image uploads)
  const clearCache = () => {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(CACHE_KEY);
        setCachedGirls(null);
        // Trigger refetch
        const fetchAll = async () => {
          setCacheLoading(true);
          setCacheError(null);
          try {
            const res = await fetch('/api/admin/girls?limit=5000', { method: 'GET', credentials: 'include' });
            if (res.status === 401 && typeof window !== 'undefined') {
              const next = encodeURIComponent(window.location.pathname + window.location.search);
              window.location.href = `/admin/login?next=${next}`;
              return;
            }
            if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
            const data = await res.json();
            const rows: CachedGirl[] = Array.isArray(data?.girls) ? data.girls.map(normalizeCachedGirl) : [];
            setCachedGirls(rows);
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), girls: rows }));
            }
          } catch (e: any) {
            setCacheError(e?.message || 'Failed to cache girls');
            setCachedGirls(null);
          } finally {
            setCacheLoading(false);
          }
        };
        fetchAll();
      } catch (e) {
        // ignore
      }
    }
  };
  
  // Listen for cache invalidation events (triggered after image uploads)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleCacheInvalidation = () => {
      clearCache();
    };
    
    window.addEventListener('admin-girls-cache-invalidate', handleCacheInvalidation);
    
    return () => {
      window.removeEventListener('admin-girls-cache-invalidate', handleCacheInvalidation);
    };
  }, []);
  const PAGE_SIZE = 100;

  const [published, setPublished] = useState<string>(initialSearchParams.published || 'all');
  const [isNew, setIsNew] = useState<string>(initialSearchParams.isNew || 'all');
  const [hasNewPhotos, setHasNewPhotos] = useState<string>(initialSearchParams.hasNewPhotos || 'all');
  const [era, setEra] = useState<string>(initialSearchParams.era || 'all');
  const [keyword, setKeyword] = useState<string>(initialSearchParams.keyword || '');
  const [page, setPage] = useState<number>(currentPage || 1);

  const [cachedGirls, setCachedGirls] = useState<CachedGirl[] | null>(null);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [cacheError, setCacheError] = useState<string | null>(null);

  const lastAppliedKeywordRef = useRef<string>(keyword);
  const keywordDebounceTimerRef = useRef<number | null>(null);

  const normalizeCachedGirl = (g: any): CachedGirl => {
    const toNumOrNull = (v: any): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const toBool = (v: any): boolean => v === true || v === 1 || v === '1' || v === 't' || v === 'true' || v === 'yes';

    return {
      id: Number(g.id) || g.id,
      name: String(g.name || ''),
      firstName: String(g.firstName || ''),
      lastName: String(g.lastName || ''),
      slug: String(g.slug || ''),
      photoCount: Number(g.photoCount) || 0,
      hqPhotoCount: Number(g.hqPhotoCount) || 0,
      createdAt: String(g.createdAt || ''),
      updatedAt: String(g.updatedAt || ''),
      published: toNumOrNull(g.published),
      isNew: toNumOrNull(g.isNew),
      hasNewPhotos: toNumOrNull(g.hasNewPhotos),
      era: toNumOrNull(g.era),
      theirMan: toBool(g.theirMan),
    };
  };

  const buildUrl = (p: { published: string; isNew: string; hasNewPhotos: string; era: string; keyword: string; page: number }) => {
    const params = new URLSearchParams();
    if (p.published && p.published !== 'all') params.set('published', p.published);
    if (p.isNew && p.isNew !== 'all') params.set('isNew', p.isNew);
    if (p.hasNewPhotos && p.hasNewPhotos !== 'all') params.set('hasNewPhotos', p.hasNewPhotos);
    if (p.era && p.era !== 'all') params.set('era', p.era);
    if (p.keyword && p.keyword.trim() !== '') params.set('keyword', p.keyword);
    if (p.page && p.page !== 1) params.set('page', String(p.page));
    const qs = params.toString();
    return qs ? `/admin/girls?${qs}` : '/admin/girls';
  };

  const syncUrl = (
    mode: 'replace' | 'push',
    overrides?: Partial<{ published: string; isNew: string; hasNewPhotos: string; era: string; keyword: string; page: number }>
  ) => {
    if (typeof window === 'undefined') return;
    const next = {
      published,
      isNew,
      hasNewPhotos,
      era,
      keyword,
      page,
      ...(overrides || {}),
    };
    const url = buildUrl(next);
    if (mode === 'replace') window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
  };

  const handleSearch = (value: string) => {
    // No navigation: filtering is already instant. Enter just commits URL state.
    lastAppliedKeywordRef.current = value;
    syncUrl('replace', { keyword: value, page });
  };

  const handleResetFilters = () => {
    setPublished('all');
    setIsNew('all');
    setHasNewPhotos('all');
    setEra('all');
    setKeyword('');
    setPage(1);
    lastAppliedKeywordRef.current = '';
    syncUrl('replace', { published: 'all', isNew: 'all', hasNewPhotos: 'all', era: 'all', keyword: '', page: 1 });
  };

  const columns: ColumnsType<Girl> = [
    {
      title: <span style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>Name</span>,
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      width: 180,
      ellipsis: true,
      render: (text: string, record: Girl) => (
        <Link
          href={`/admin/girls/${record.id}?next=${encodeURIComponent(buildUrl({ published, isNew, hasNewPhotos, era, keyword, page }))}`}
          style={{ color: '#1890ff', whiteSpace: 'nowrap' }}
        >
          {text}
        </Link>
      ),
    },
    {
      title: <span style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>Images</span>,
      key: 'images',
      ellipsis: true,
      width: 110,
      render: (_: any, record: Girl) => {
        // Safety clamp: HQ count can never exceed gallery count
        const safeHQCount = Math.min(record.hqPhotoCount, record.photoCount);
        return (
          <Space size={4} style={{ whiteSpace: 'nowrap' }}>
            <Text style={{ whiteSpace: 'nowrap' }}>{record.photoCount}</Text>
            {safeHQCount > 0 && (
              <Text type="secondary" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>({safeHQCount} HQ)</Text>
            )}
          </Space>
        );
      },
    },
    {
      title: <span style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>Created</span>,
      dataIndex: 'createdAt',
      key: 'createdAt',
      ellipsis: true,
      width: 105,
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
          {new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
        </Text>
      ),
    },
    {
      title: <span style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>Last...</span>,
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      ellipsis: true,
      width: 90,
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
          {new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
        </Text>
      ),
    },
    {
      title: <span style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>Action</span>,
      key: 'action',
      width: 100,
      render: (_: any, record: Girl) => (
        <Link href={`/admin/girls/${record.id}?next=${encodeURIComponent(buildUrl({ published, isNew, hasNewPhotos, era, keyword, page }))}`}>
          <Button type="link" icon={<EditOutlined />} size="small">
            Edit
          </Button>
        </Link>
      ),
    },
  ];

  // Keep local page synced when server-provided page changes (initial render / refresh)
  useEffect(() => {
    setPage(currentPage || 1);
  }, [currentPage]);

  // Load cache (sessionStorage -> API) once
  useEffect(() => {
    let cancelled = false;

    const readFromSession = (): CachedGirl[] | null => {
      try {
        const raw = window.sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { ts: number; girls: CachedGirl[] };
        if (!parsed?.ts || !Array.isArray(parsed.girls)) return null;
        if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
        return parsed.girls.map(normalizeCachedGirl);
      } catch {
        return null;
      }
    };

    const writeToSession = (rows: CachedGirl[]) => {
      try {
        window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), girls: rows }));
      } catch {
        // ignore
      }
    };

    const fetchAll = async () => {
      setCacheLoading(true);
      setCacheError(null);
      try {
        const res = await fetch('/api/admin/girls?limit=5000', { method: 'GET', credentials: 'include' });
        if (res.status === 401 && typeof window !== 'undefined') {
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/admin/login?next=${next}`;
          return;
        }
        if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
        const data = await res.json();
        const rows: CachedGirl[] = Array.isArray(data?.girls) ? data.girls.map(normalizeCachedGirl) : [];
        if (!cancelled) {
          setCachedGirls(rows);
          writeToSession(rows);
        }
      } catch (e: any) {
        if (!cancelled) {
          setCacheError(e?.message || 'Failed to cache girls');
          setCachedGirls(null);
        }
      } finally {
        if (!cancelled) setCacheLoading(false);
      }
    };

    if (typeof window !== 'undefined') {
      const sessionRows = readFromSession();
      if (sessionRows && sessionRows.length > 0) {
        setCachedGirls(sessionRows);
      } else {
        fetchAll();
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const hasCache = Array.isArray(cachedGirls) && cachedGirls.length > 0;

  const filteredAll = useMemo(() => {
    const source: CachedGirl[] = hasCache ? cachedGirls! : (girls as unknown as CachedGirl[]);
    const q = keyword.trim().toLowerCase();
    const eraMap: Record<string, number> = { '20-30s': 1, '40s': 2, '50s': 3, '60s': 4 };

    // If cache isn't ready yet, we can only filter the currently shown server page.
    if (!hasCache) {
      if (!q) return source;
      return source.filter((g) => {
        const nm = (g.name || '').toLowerCase();
        const fn = (g.firstName || '').toLowerCase();
        const ln = (g.lastName || '').toLowerCase();
        return nm.includes(q) || fn.includes(q) || ln.includes(q);
      });
    }

    return source.filter((g) => {
      const pub = g.published ?? null;
      if (published === '2' && pub !== 2) return false;
      if (published === '1' && pub === 2) return false;
      if (isNew === 'yes' && g.isNew !== 2) return false;
      if (isNew === 'no' && g.isNew !== 1) return false;
      if (hasNewPhotos === 'yes' && g.hasNewPhotos !== 2) return false;
      if (hasNewPhotos === 'no' && g.hasNewPhotos !== 1) return false;
      if (era && era !== 'all') {
        if (era === 'men') {
          if (!g.theirMan) return false;
        } else if (eraMap[era] && g.era !== eraMap[era]) {
          return false;
        }
      }
      if (q) {
        const nm = (g.name || '').toLowerCase();
        const fn = (g.firstName || '').toLowerCase();
        const ln = (g.lastName || '').toLowerCase();
        if (!nm.includes(q) && !fn.includes(q) && !ln.includes(q)) return false;
      }
      return true;
    });
  }, [hasCache, cachedGirls, girls, published, isNew, hasNewPhotos, era, keyword]);

  const filteredTotal = hasCache ? filteredAll.length : total;
  const displayPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  const displayPage = Math.min(page, displayPages);
  const pagedGirls = useMemo(() => {
    if (!hasCache) return filteredAll as unknown as Girl[];
    const start = (displayPage - 1) * PAGE_SIZE;
    return (filteredAll.slice(start, start + PAGE_SIZE) as unknown as Girl[]);
  }, [hasCache, filteredAll, displayPage]);

  // Debounced URL sync for keyword typing (history only; no navigation)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (keyword === lastAppliedKeywordRef.current) return;

    if (keywordDebounceTimerRef.current) {
      window.clearTimeout(keywordDebounceTimerRef.current);
    }

    keywordDebounceTimerRef.current = window.setTimeout(() => {
      lastAppliedKeywordRef.current = keyword;
      syncUrl('replace', { keyword, page: 1 });
    }, 250);

    return () => {
      if (keywordDebounceTimerRef.current) {
        window.clearTimeout(keywordDebounceTimerRef.current);
        keywordDebounceTimerRef.current = null;
      }
    };
  }, [keyword]);

  return (
    <div style={{ padding: '24px' }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <Row justify="space-between" align="middle">
          <Col>
            <Space orientation="vertical" size={0}>
              <Title level={4} style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                Girls Database
              </Title>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Manage all actress entries
              </Text>
            </Space>
          </Col>
          <Col>
            <Link href="/admin/girls/new">
              <Button type="primary" icon={<PlusOutlined />} style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}>
                Add New Girl
              </Button>
            </Link>
          </Col>
        </Row>

        {/* Filters */}
        <Card>
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Tip: “All” in Published only affects published status. Use Reset to clear all filters.
                </Text>
              </Col>
              <Col>
                <Button size="small" onClick={handleResetFilters}>
                  Reset filters
                </Button>
              </Col>
            </Row>

            {/* Published Filter */}
            <div>
              <Text strong style={{ fontSize: '12px', marginRight: '16px' }}>Published:</Text>
              <Radio.Group
                value={published}
                disabled={!hasCache && cacheLoading}
                onChange={(e) => {
                  const next = e.target.value;
                  setPublished(next);
                  setPage(1);
                  syncUrl('push', { published: next, page: 1 });
                }}
                size="small"
                optionType="button"
              >
                <Radio.Button value="2">Published</Radio.Button>
                <Radio.Button value="1">Unpublished</Radio.Button>
                <Radio.Button value="all">All</Radio.Button>
              </Radio.Group>
            </div>

            {/* Other Filters */}
            <Row gutter={[16, 16]}>
              <Col>
                <Space>
                  <Text strong style={{ fontSize: '12px' }}>New entry:</Text>
                  <Radio.Group
                    value={isNew}
                    disabled={!hasCache && cacheLoading}
                    onChange={(e) => {
                      const next = e.target.value;
                      setIsNew(next);
                      setPage(1);
                      syncUrl('push', { isNew: next, page: 1 });
                    }}
                    size="small"
                    optionType="button"
                  >
                    <Radio.Button value="all">All</Radio.Button>
                    <Radio.Button value="yes">Yes</Radio.Button>
                    <Radio.Button value="no">No</Radio.Button>
                  </Radio.Group>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Text strong style={{ fontSize: '12px' }}>New Photos:</Text>
                  <Radio.Group
                    value={hasNewPhotos}
                    disabled={!hasCache && cacheLoading}
                    onChange={(e) => {
                      const next = e.target.value;
                      setHasNewPhotos(next);
                      setPage(1);
                      syncUrl('push', { hasNewPhotos: next, page: 1 });
                    }}
                    size="small"
                    optionType="button"
                  >
                    <Radio.Button value="all">All</Radio.Button>
                    <Radio.Button value="yes">Yes</Radio.Button>
                    <Radio.Button value="no">No</Radio.Button>
                  </Radio.Group>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Text strong style={{ fontSize: '12px' }}>Years:</Text>
                  <Radio.Group
                    value={era}
                    disabled={!hasCache && cacheLoading}
                    onChange={(e) => {
                      const next = e.target.value;
                      setEra(next);
                      setPage(1);
                      syncUrl('push', { era: next, page: 1 });
                    }}
                    size="small"
                    optionType="button"
                  >
                    <Radio.Button value="all">All</Radio.Button>
                    <Radio.Button value="20-30s">20-30s</Radio.Button>
                    <Radio.Button value="40s">40s</Radio.Button>
                    <Radio.Button value="50s">50s</Radio.Button>
                    <Radio.Button value="60s">60s</Radio.Button>
                    <Radio.Button value="men">Their Men</Radio.Button>
                  </Radio.Group>
                </Space>
              </Col>
            </Row>

            {/* Search */}
            <Row>
              <Col span={12}>
                <Search
                  placeholder="Search by name..."
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value);
                    setPage(1);
                  }}
                  onSearch={handleSearch}
                  allowClear
                  enterButton
                  style={{ maxWidth: 400 }}
                />
              </Col>
            </Row>
          </Space>
        </Card>

        {/* Results Info */}
        <Text type="secondary" style={{ fontSize: '12px' }}>
          Showing {pagedGirls.length} of {filteredTotal} girls (Page {displayPage} of {displayPages})
          {cacheLoading ? ' — caching…' : ''}
          {cacheError ? ` — cache error: ${cacheError}` : ''}
          {!hasCache && cacheLoading ? ' — loading full list (filters will be accurate in a moment)…' : ''}
        </Text>

        {/* Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={pagedGirls}
            rowKey="id"
            pagination={{
              current: displayPage,
              total: filteredTotal,
              pageSize: PAGE_SIZE,
              showSizeChanger: false,
              showTotal: (total) => `Total ${total} items`,
              onChange: (nextPage) => {
                setPage(nextPage);
                syncUrl('push', { page: nextPage });
              },
            }}
            locale={{
              emptyText: (
                <div style={{ padding: '48px 0', textAlign: 'center' }}>
                  <Text type="secondary">No girls found.</Text>
                  <br />
                  <Link href="/admin/girls/new">
                    <Button type="link" style={{ padding: 0 }}>
                      Add your first girl
                    </Button>
                  </Link>
                </div>
              ),
            }}
            style={{
              fontSize: '14px',
            }}
            className="compact-table"
          />
        </Card>
      </Space>
    </div>
  );
}

