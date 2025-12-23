/**
 * TEST SEARCH PAGE - PERMANENT TESTING TOOL
 * 
 * This page is kept for ongoing database query testing and debugging.
 * Use it to:
 * - Test search queries with different keywords
 * - Debug database connection issues
 * - See step-by-step query execution
 * - Verify query results in real-time
 * 
 * Access at: /test-search
 */

'use client';

import { useState } from 'react';

interface DebugInfo {
  step: string;
  query?: string;
  params?: any[];
  results?: any;
  error?: string;
  time?: number;
}

export default function TestSearchPage() {
  const [keyword, setKeyword] = useState('adam');
  const [debugLog, setDebugLog] = useState<DebugInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const addDebug = (info: DebugInfo) => {
    setDebugLog((prev) => [...prev, { ...info, time: Date.now() }]);
  };

  const testQuery = async () => {
    setLoading(true);
    setDebugLog([]);
    setResults([]);

    try {
      // Step 1: Test basic connection
      addDebug({ step: 'Step 1: Testing database connection...' });
      const startTime = Date.now();

      // Step 2: Build query step by step
      addDebug({ step: 'Step 2: Building query...' });

      let query = `
        SELECT g.id, g.nm, g.firstname, g.familiq, g.godini, g.isnew, g.isnewpix, g.slug,
               COUNT(DISTINCT CASE WHEN i.mytp = 4 THEN i.id END) as photoCount,
               COUNT(DISTINCT CASE WHEN i.mytp = 5 THEN i.id END) as hqPhotoCount
        FROM girls g
        LEFT JOIN images i ON g.id = i.girlid
        WHERE g.published = 2
      `;

      const params: any[] = [];

      // Step 3: Add keyword search
      if (keyword) {
        addDebug({ step: 'Step 3: Adding keyword filter...', query: 'keyword filter', params: [keyword] });
        query += ` AND (g.nm LIKE ? OR g.firstname LIKE ? OR g.familiq LIKE ?)`;
        const keywordParam = `%${keyword}%`;
        params.push(keywordParam, keywordParam, keywordParam);
      }

      query += ` GROUP BY g.id ORDER BY g.familiq, g.firstname LIMIT 20`;

      addDebug({
        step: 'Step 4: Final query built',
        query: query,
        params: params,
      });

      // Step 5: Execute query via API
      addDebug({ step: 'Step 5: Executing query via API...' });
      const apiUrl = `/api/test-query?keyword=${encodeURIComponent(keyword)}`;
      const res = await fetch(apiUrl);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        addDebug({
          step: 'Step 6: API Error',
          error: errorData.error || `HTTP ${res.status}`,
          results: JSON.stringify(errorData, null, 2),
        });
        setLoading(false);
        return;
      }

      const data = await res.json();
      const endTime = Date.now();

      addDebug({
        step: 'Step 6: Query executed successfully',
        results: Array.isArray(data) ? `${data.length} results` : 'Non-array response',
        time: endTime - startTime,
      });

      if (Array.isArray(data)) {
        setResults(data);
        addDebug({
          step: 'Step 7: Results processed',
          results: `Found ${data.length} actresses`,
        });
      } else {
        addDebug({
          step: 'Step 7: Unexpected response format',
          results: JSON.stringify(data).substring(0, 200),
        });
      }
    } catch (error: any) {
      addDebug({
        step: 'Error occurred',
        error: error.message || 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Search Query Test Page</h1>

        {/* Input Section */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Search Keyword</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Enter keyword (e.g., 'adam')"
              />
            </div>
            <button
              onClick={testQuery}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Testing...' : 'Test Query'}
            </button>
          </div>
        </div>

        {/* Debug Log */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Debug Log</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {debugLog.length === 0 ? (
              <p className="text-gray-500">No debug info yet. Click "Test Query" to start.</p>
            ) : (
              debugLog.map((log, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border-l-4 ${
                    log.error
                      ? 'bg-red-50 border-red-500'
                      : log.results
                      ? 'bg-green-50 border-green-500'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-sm">{log.step}</div>
                  {log.query && (
                    <div className="mt-2">
                      <div className="text-xs font-mono bg-gray-100 p-2 rounded overflow-x-auto">
                        {log.query.length > 200 ? `${log.query.substring(0, 200)}...` : log.query}
                      </div>
                    </div>
                  )}
                  {log.params && log.params.length > 0 && (
                    <div className="mt-2 text-xs">
                      <strong>Params:</strong> {JSON.stringify(log.params)}
                    </div>
                  )}
                  {log.results && (
                    <div className="mt-2 text-sm">
                      <strong>Results:</strong> {log.results}
                    </div>
                  )}
                  {log.error && (
                    <div className="mt-2 text-sm text-red-600">
                      <strong>Error:</strong> {log.error}
                      {log.results && typeof log.results === 'string' && log.results.includes('{') && (
                        <div className="mt-2 text-xs font-mono bg-red-100 p-2 rounded overflow-x-auto">
                          <pre>{log.results}</pre>
                        </div>
                      )}
                    </div>
                  )}
                  {log.time && (
                    <div className="mt-1 text-xs text-gray-500">Time: {log.time}ms</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Results */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            Results ({results.length})
          </h2>
          {results.length === 0 ? (
            <p className="text-gray-500">No results yet.</p>
          ) : (
            <div className="space-y-2">
              {results.map((actress, index) => (
                <div key={index} className="p-3 border rounded">
                  <div className="font-semibold">
                    {actress.name} (ID: {actress.id})
                  </div>
                  <div className="text-sm text-gray-600">
                    First: {actress.firstName || 'N/A'} | Last: {actress.lastName || 'N/A'} | 
                    Years: {actress.years || 'N/A'} | Photos: {actress.photoCount || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Slug: {actress.slug}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

