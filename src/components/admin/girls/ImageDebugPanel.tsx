'use client';

import { useState, useEffect, useCallback } from 'react';
import { Collapse, Card, Typography, Tag, Alert, Space, Divider, Button, Table } from 'antd';
import { BugOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, ReloadOutlined, DatabaseOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface ImageDebugInfo {
  id: number;
  orderNum: number;
  filename?: string;
  path?: string;
  isDirty?: boolean;
  girlId?: number;
}

interface UploadFileStatus {
  filename: string;
  status: 'pending' | 'uploading' | 'storage-uploaded' | 'db-inserted' | 'success' | 'failed';
  error?: string;
  imageId?: number;
  orderNum?: number;
}

interface ApiResponse {
  endpoint: string;
  method: string;
  status: number;
  timestamp: number;
  payload?: any;
  response?: any;
  rowsReceived?: number;
  rowsUpdated?: number;
  rowsInserted?: number;
  rowsDeleted?: number;
  error?: string;
}

interface ImageDebugPanelProps {
  images: any[];
  uploadQueue: UploadFileStatus[];
  apiResponses: ApiResponse[];
  isVisible: boolean;
  girlId?: number; // For "Reload from DB" functionality
  onReloadFromDb?: () => Promise<void>; // Callback to reload images from API
}

export default function ImageDebugPanel({ images, uploadQueue, apiResponses, isVisible, girlId, onReloadFromDb }: ImageDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [dbTruthAfterSave, setDbTruthAfterSave] = useState<Array<{ id: number; order_num: number | null; filename: string }> | null>(null);

  // Only show in development or with debug flag
  const shouldShow = isVisible && (process.env.NODE_ENV === 'development' || 
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1'));

  if (!shouldShow) {
    return null;
  }

  // SECTION 4: POST-SAVE RELOAD (DB TRUTH) - Define handler first
  const handleReloadFromDb = useCallback(async () => {
    if (!girlId) {
      console.error('[Debug] Cannot reload from DB: girlId is missing');
      return;
    }
    
    setIsReloading(true);
    try {
      const response = await fetch(`/api/admin/girls/${girlId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const data = await response.json();
      
      // Extract images with id, order_num, and filename
      const dbImages = (data.images || []).map((img: any) => ({
        id: img.id,
        order_num: img.orderNum ?? null,
        filename: img.path ? img.path.split('/').pop() || img.path : 'N/A',
      }));
      
      setDbTruthAfterSave(dbImages);
      
      if (onReloadFromDb) {
        await onReloadFromDb();
      }
    } catch (error) {
      console.error('[Debug] Error reloading from DB:', error);
      setDbTruthAfterSave([]);
    } finally {
      setIsReloading(false);
    }
  }, [girlId, onReloadFromDb]);

  // Auto-reload DB truth after successful reorder
  useEffect(() => {
    const latestReorderResponse = apiResponses.find(r => r.endpoint === '/api/admin/images/reorder');
    if (latestReorderResponse && latestReorderResponse.status === 200 && latestReorderResponse.rowsUpdated && latestReorderResponse.rowsUpdated > 0 && girlId) {
      // Small delay to ensure backend has committed
      const timer = setTimeout(() => {
        handleReloadFromDb();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [apiResponses.length, girlId, handleReloadFromDb]); // Re-run when apiResponses array length changes (new response added)

  // SECTION 1: UI STATE (BEFORE SAVE) - Sort by current orderNum for display
  const uiStateData = [...images]
    .sort((a: any, b: any) => {
      const orderA = a.orderNum ?? 999999;
      const orderB = b.orderNum ?? 999999;
      if (orderA !== orderB) return orderA - orderB;
      return a.id - b.id;
    })
    .map((img: any, idx: number) => ({
      key: img.id || idx,
      index: idx,
      imageId: img.id,
      imageGirlId: img.girlId ?? null,
      orderNum: img.orderNum ?? null,
      uiPosition: idx + 1,
      filename: img.path ? img.path.split('/').pop() || img.path : 'N/A',
    }));

  // SECTION 2: SAVE PAYLOAD (from latest reorder request)
  const latestReorderRequest = apiResponses.find(r => r.endpoint === '/api/admin/images/reorder');
  const savePayload = latestReorderRequest?.payload || null;
  const payloadOrderedIds = savePayload?.orderedImageIds || [];
  const payloadLength = payloadOrderedIds.length;
  const hasDuplicateIds = payloadLength > 0 && new Set(payloadOrderedIds).size !== payloadLength;
  const payloadEmpty = payloadLength === 0;
  const payloadLengthMismatch = payloadLength > 0 && payloadLength !== images.length;

  // SECTION 3: BACKEND RESPONSE
  const backendResponse = latestReorderRequest?.response || null;
  const backendStatus = latestReorderRequest?.status || null;
  const rowsUpdated = latestReorderRequest?.rowsUpdated ?? null;
  const expectedRows = latestReorderRequest?.rowsReceived ?? payloadLength;
  const backendMessage = backendResponse?.message || backendResponse?.error || null;
  const backendImages = backendResponse?.images || backendResponse?.debug?.firstRows || [];


  // Compare UI order with DB truth (after reload)
  const uiOrderMatchesDb = dbTruthAfterSave !== null && uiStateData.length === dbTruthAfterSave.length &&
    uiStateData.every((ui, idx) => {
      const db = dbTruthAfterSave[idx];
      return db && ui.imageId === db.id && (ui.orderNum ?? null) === db.order_num;
    });

  // SECTION 5: CONSISTENCY CHECKS
  const validOrders = images.map((img: any) => img.orderNum).filter((o: any) => o != null && o > 0 && Number.isInteger(o));
  const minOrder = validOrders.length > 0 ? Math.min(...validOrders) : null;
  const maxOrder = validOrders.length > 0 ? Math.max(...validOrders) : null;
  const imageCount = images.length;
  const hasNullOrder = images.some((img: any) => img.orderNum == null || img.orderNum === 0);
  const hasDuplicateOrder = validOrders.length !== new Set(validOrders).size;
  const isContinuous = validOrders.length > 0 && minOrder === 1 && maxOrder === imageCount && !hasDuplicateOrder;
  
  const consistencyChecks = {
    minIsOne: minOrder === 1,
    maxEqualsCount: maxOrder === imageCount,
    noDuplicates: !hasDuplicateOrder,
    noNulls: !hasNullOrder,
    isContinuous: isContinuous,
  };

  const allChecksPass = Object.values(consistencyChecks).every(v => v === true);

  const collapseItems = [
    {
      key: 'debug',
      label: (
        <Space>
          <BugOutlined style={{ color: '#1890ff' }} />
          <Text strong>🧪 Image Order Debugger</Text>
          {backendStatus && (
            <Tag color={backendStatus >= 200 && backendStatus < 300 ? 'success' : 'error'}>
              {backendStatus}
            </Tag>
          )}
        </Space>
      ),
      children: (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          {/* SECTION 1: UI STATE (BEFORE SAVE) */}
          <Card size="small" title="📋 SECTION 1 — UI STATE (BEFORE SAVE)" style={{ backgroundColor: '#fafafa' }}>
            <Table
              dataSource={uiStateData}
              pagination={false}
              size="small"
              columns={[
                { title: 'Index', dataIndex: 'index', width: 60, render: (val) => val },
                { title: 'Image ID', dataIndex: 'imageId', width: 100, render: (val) => <Text code>{val}</Text> },
                { 
                  title: 'girlId', 
                  dataIndex: 'imageGirlId', 
                  width: 90,
                  render: (val, record: any) => {
                    const v = val == null ? null : Number(val);
                    const expected = girlId == null ? null : Number(girlId);
                    if (v == null) return <Tag color="warning">N/A</Tag>;
                    const mismatch = expected != null && v !== expected;
                    return mismatch ? <Tag color="error">{v}</Tag> : <Tag color="success">{v}</Tag>;
                  }
                },
                { 
                  title: 'order_num (from DB)', 
                  dataIndex: 'orderNum', 
                  width: 150,
                  render: (val) => val == null ? <Tag color="error">NULL</Tag> : <Text>{val}</Text>
                },
                { title: 'UI Position', dataIndex: 'uiPosition', width: 100, render: (val) => val },
                { title: 'Filename', dataIndex: 'filename', render: (val) => <Text code style={{ fontSize: '10px' }}>{val}</Text> },
              ]}
              scroll={{ x: 600, y: 200 }}
            />
            <Alert
              title="Purpose"
              type="info"
              showIcon
              style={{ marginTop: '8px' }}
              description="Shows current UI state. 'girlId' highlights ownership mismatches (red). Compare 'UI Position' with 'order_num (from DB)' to spot ordering mismatches."
            />
          </Card>

          {/* SECTION 2: SAVE PAYLOAD (ON SAVE CLICK) */}
          <Card 
            size="small" 
            title="📤 SECTION 2 — SAVE PAYLOAD (ON SAVE CLICK)" 
            style={{ 
              backgroundColor: (payloadEmpty || hasDuplicateIds || payloadLengthMismatch) ? '#fff1f0' : '#fafafa',
              border: (payloadEmpty || hasDuplicateIds || payloadLengthMismatch) ? '1px solid #ffccc7' : '1px solid #d9d9d9'
            }}
          >
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              {savePayload ? (
                <>
                  <div>
                    <Text strong>Endpoint: </Text>
                    <Text code>/api/admin/images/reorder</Text>
                  </div>
                  <div>
                    <Text strong>Payload sent: </Text>
                    <Text code style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                      orderedImageIds: [{payloadOrderedIds.join(', ')}]
                    </Text>
                  </div>
                  <div>
                    <Text strong>Payload length: </Text>
                    <Tag color={payloadLength === images.length ? 'success' : 'error'}>
                      {payloadLength} {payloadLength !== images.length && `(UI has ${images.length} images)`}
                    </Tag>
                  </div>
                  {(payloadEmpty || hasDuplicateIds || payloadLengthMismatch) && (
                    <Alert
                      title="⚠️ PAYLOAD VALIDATION FAILED"
                      type="error"
                      showIcon
                      description={
                        <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                          {payloadEmpty && <li>Payload is empty</li>}
                          {hasDuplicateIds && <li>Duplicate IDs exist in payload</li>}
                          {payloadLengthMismatch && <li>Payload length ({payloadLength}) ≠ UI image count ({images.length})</li>}
                        </ul>
                      }
                    />
                  )}
                </>
              ) : (
                <Text type="secondary">No save payload yet. Click "Save Order" to see payload.</Text>
              )}
            </Space>
          </Card>

          {/* SECTION 3: BACKEND RESPONSE */}
          <Card 
            size="small" 
            title="🔙 SECTION 3 — BACKEND RESPONSE" 
            style={{ 
              backgroundColor: (backendStatus && (backendStatus < 200 || backendStatus >= 300 || rowsUpdated === 0 || (rowsUpdated !== null && expectedRows !== null && rowsUpdated !== expectedRows))) ? '#fff1f0' : '#fafafa',
              border: (backendStatus && (backendStatus < 200 || backendStatus >= 300 || rowsUpdated === 0 || (rowsUpdated !== null && expectedRows !== null && rowsUpdated !== expectedRows))) ? '1px solid #ffccc7' : '1px solid #d9d9d9'
            }}
          >
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              {backendResponse || backendStatus ? (
                <>
                  <div>
                    <Text strong>HTTP Status: </Text>
                    <Tag color={backendStatus && backendStatus >= 200 && backendStatus < 300 ? 'success' : 'error'}>
                      {backendStatus || 'N/A'}
                    </Tag>
                  </div>
                  {rowsUpdated !== null && (
                    <div>
                      <Text strong>rowsUpdated: </Text>
                      <Tag color={rowsUpdated === expectedRows && rowsUpdated > 0 ? 'success' : 'error'}>
                        {rowsUpdated}
                      </Tag>
                      <Text> / </Text>
                      <Text strong>expectedRows: </Text>
                      <Tag>{expectedRows || 'N/A'}</Tag>
                    </div>
                  )}
                  {backendMessage && (
                    <div>
                      <Text strong>Backend message: </Text>
                      <Text code style={{ fontSize: '11px' }}>{backendMessage}</Text>
                    </div>
                  )}
                  {backendStatus === 200 && rowsUpdated === 0 && (
                    <Alert
                      title="❌ CRITICAL: Status 200 but rowsUpdated === 0"
                      type="error"
                      showIcon
                      description="Reorder returned success but no rows were updated. Order was NOT persisted."
                    />
                  )}
                  {rowsUpdated !== null && expectedRows !== null && rowsUpdated !== expectedRows && (
                    <Alert
                      title={`⚠️ WARNING: rowsUpdated (${rowsUpdated}) !== expectedRows (${expectedRows})`}
                      type="warning"
                      showIcon
                      description="Partial update detected. Some images may not have been reordered."
                    />
                  )}
                  {backendImages.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <Text strong>Returned images (first 5):</Text>
                      <div style={{ marginTop: '4px', fontSize: '11px', fontFamily: 'monospace' }}>
                        {backendImages.slice(0, 5).map((img: any, idx: number) => (
                          <div key={idx} style={{ padding: '2px' }}>
                            id: {img.id}, order_num: {img.orderNum ?? img.order_num ?? 'NULL'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Text type="secondary">No backend response yet. Save order to see response.</Text>
              )}
            </Space>
          </Card>

          {/* SECTION 4: POST-SAVE RELOAD (DB TRUTH) */}
          <Card 
            size="small" 
            title="💾 SECTION 4 — POST-SAVE RELOAD (DB TRUTH)" 
            style={{ backgroundColor: '#fafafa' }}
          >
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              <Button
                type="default"
                icon={<ReloadOutlined />}
                loading={isReloading}
                onClick={handleReloadFromDb}
                style={{ width: '100%' }}
              >
                Reload from DB (Truth Check)
              </Button>
              
              {dbTruthAfterSave !== null && (
                <>
                  {/* Big Status Badge */}
                  <div style={{ textAlign: 'center', padding: '12px', backgroundColor: uiOrderMatchesDb ? '#f6ffed' : '#fff1f0', border: `2px solid ${uiOrderMatchesDb ? '#b7eb8f' : '#ffccc7'}`, borderRadius: '4px' }}>
                    {uiOrderMatchesDb ? (
                      <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                        ✅ UI ORDER MATCHES DB
                      </Text>
                    ) : (
                      <Text strong style={{ fontSize: '16px', color: '#ff4d4f' }}>
                        ❌ UI ORDER ≠ DB ORDER
                      </Text>
                    )}
                  </div>
                  
                  <Table
                    dataSource={dbTruthAfterSave.map((img, idx) => ({ ...img, key: img.id, index: idx + 1 }))}
                    pagination={false}
                    size="small"
                    columns={[
                      { title: 'Index', dataIndex: 'index', width: 60 },
                      { title: 'Image ID', dataIndex: 'id', width: 100, render: (val) => <Text code>{val}</Text> },
                      { 
                        title: 'order_num', 
                        dataIndex: 'order_num', 
                        width: 100,
                        render: (val) => val == null ? <Tag color="error">NULL</Tag> : <Text>{val}</Text>
                      },
                      { title: 'Filename', dataIndex: 'filename', render: (val) => <Text code style={{ fontSize: '10px' }}>{val}</Text> },
                    ]}
                    scroll={{ x: 400, y: 200 }}
                  />
                </>
              )}
            </Space>
          </Card>

          {/* SECTION 5: CONSISTENCY CHECKS (AUTO) */}
          <Card 
            size="small" 
            title="✅ SECTION 5 — CONSISTENCY CHECKS (AUTO)" 
            style={{ 
              backgroundColor: allChecksPass ? '#f6ffed' : '#fff1f0',
              border: `1px solid ${allChecksPass ? '#b7eb8f' : '#ffccc7'}`
            }}
          >
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>MIN(order_num) === 1:</Text>
                <Tag color={consistencyChecks.minIsOne ? 'success' : 'error'}>
                  {consistencyChecks.minIsOne ? 'PASS' : 'FAIL'} {minOrder !== null && `(min=${minOrder})`}
                </Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>MAX(order_num) === image count:</Text>
                <Tag color={consistencyChecks.maxEqualsCount ? 'success' : 'error'}>
                  {consistencyChecks.maxEqualsCount ? 'PASS' : 'FAIL'} {maxOrder !== null && `(max=${maxOrder}, count=${imageCount})`}
                </Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>No duplicate order_num:</Text>
                <Tag color={consistencyChecks.noDuplicates ? 'success' : 'error'}>
                  {consistencyChecks.noDuplicates ? 'PASS' : 'FAIL'}
                </Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>No NULL order_num:</Text>
                <Tag color={consistencyChecks.noNulls ? 'success' : 'error'}>
                  {consistencyChecks.noNulls ? 'PASS' : 'FAIL'}
                </Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>order_num sequence is continuous:</Text>
                <Tag color={consistencyChecks.isContinuous ? 'success' : 'error'}>
                  {consistencyChecks.isContinuous ? 'PASS' : 'FAIL'}
                </Tag>
              </div>
              
              {!allChecksPass && (
                <Alert
                  title="🚨 CONSISTENCY CHECKS FAILED"
                  type="error"
                  showIcon
                  style={{ marginTop: '8px' }}
                  description="Order state is invalid. Reordering may fail or produce incorrect results."
                />
              )}
            </Space>
          </Card>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ marginTop: '16px' }}>
      <Collapse 
        items={collapseItems}
        activeKey={isOpen ? ['debug'] : []}
        onChange={(keys) => setIsOpen(keys.includes('debug'))}
      />
    </div>
  );
}
