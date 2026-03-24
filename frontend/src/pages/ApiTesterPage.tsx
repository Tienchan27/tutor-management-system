import { useEffect, useMemo, useState } from 'react';
import axios, { AxiosError, Method } from 'axios';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { apiCatalog } from '../services/apiCatalog';
import { getAccessToken } from '../utils/storage';
import { colors } from '../styles/colors';
import { ApiDomainGroup, ApiEndpoint, ApiHistoryItem, ApiTesterResult, AuthMode, HttpMethod } from '../types/apiCatalog';

const HISTORY_KEY = 'apiTesterHistory';

function safeParseJson(input: string, fallback: Record<string, unknown>): Record<string, unknown> | null {
  try {
    return input?.trim() ? (JSON.parse(input) as Record<string, unknown>) : fallback;
  } catch {
    return null;
  }
}

function formatJson(value: unknown): string {
  if (value == null) {
    return '';
  }
  return JSON.stringify(value, null, 2);
}

function loadHistory(): ApiHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ApiHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: ApiHistoryItem[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 10)));
}

function applyPathParams(path: string, params: Record<string, unknown>): string {
  return path.replace(/\{([^}]+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`));
}

function ApiTesterPage() {
  const navigate = useNavigate();
  const [domainIndex, setDomainIndex] = useState<number>(0);
  const [endpointIndex, setEndpointIndex] = useState<number>(0);
  const [history, setHistory] = useState<ApiHistoryItem[]>(loadHistory());
  const [authMode, setAuthMode] = useState<AuthMode>('none');
  const [token, setToken] = useState<string>(getAccessToken() || '');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [path, setPath] = useState<string>('');
  const [pathParamsJson, setPathParamsJson] = useState<string>('{}');
  const [queryJson, setQueryJson] = useState<string>('{}');
  const [bodyJson, setBodyJson] = useState<string>('{}');
  const [headersJson, setHeadersJson] = useState<string>('{}');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ApiTesterResult | null>(null);
  const [error, setError] = useState<string>('');

  const selectedDomain: ApiDomainGroup | undefined = apiCatalog[domainIndex];
  const baseURL = process.env.REACT_APP_API_URL || '/api';

  const canSendBody = useMemo<boolean>(() => ['POST', 'PUT', 'PATCH'].includes(method), [method]);

  function loadTemplate(item: ApiEndpoint): void {
    setMethod(item.method);
    setPath(item.path);
    setAuthMode(item.auth === 'bearer' ? 'bearer' : 'none');
    setPathParamsJson(formatJson(item.pathParams || {}));
    setQueryJson(formatJson(item.query || {}));
    setBodyJson(formatJson(item.body || {}));
    setHeadersJson('{}');
    setError('');
    setResult(null);
  }

  function selectDomain(index: number): void {
    setDomainIndex(index);
    setEndpointIndex(0);
    const first = apiCatalog[index]?.endpoints?.[0];
    if (first) {
      loadTemplate(first);
    }
  }

  function selectEndpoint(index: number): void {
    setEndpointIndex(index);
    const item = selectedDomain?.endpoints?.[index];
    if (item) {
      loadTemplate(item);
    }
  }

  async function sendRequest(): Promise<void> {
    setLoading(true);
    setError('');
    setResult(null);

    const parsedPathParams = safeParseJson(pathParamsJson, {});
    const parsedQuery = safeParseJson(queryJson, {});
    const parsedBody = safeParseJson(bodyJson, {});
    const parsedHeaders = safeParseJson(headersJson, {});

    if (parsedPathParams == null || parsedQuery == null || parsedHeaders == null || (canSendBody && parsedBody == null)) {
      setLoading(false);
      setError('Invalid JSON in one or more editors.');
      return;
    }

    const resolvedPath = applyPathParams(path, parsedPathParams);
    const mergedHeaders: Record<string, string> = Object.entries(parsedHeaders || {}).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      },
      {}
    );
    if (authMode === 'bearer' && token.trim()) {
      mergedHeaders.Authorization = `Bearer ${token.trim()}`;
    }

    try {
      const response = await axios.request({
        baseURL,
        method: method as Method,
        url: resolvedPath,
        params: parsedQuery,
        data: canSendBody ? parsedBody : undefined,
        headers: mergedHeaders,
      });

      const nextResult: ApiTesterResult = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
      };
      setResult(nextResult);

      const nextHistory: ApiHistoryItem[] = [
        { method, path: resolvedPath, status: response.status, at: new Date().toISOString() },
        ...history,
      ];
      setHistory(nextHistory);
      saveHistory(nextHistory);
    } catch (requestError: unknown) {
      const response = (requestError as AxiosError)?.response;
      const nextResult: ApiTesterResult | null = response
        ? {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data,
          }
        : null;

      if (nextResult) {
        setResult(nextResult);
      } else {
        setError((requestError as Error)?.message || 'Request failed');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!path && apiCatalog[0]?.endpoints?.[0]) {
      loadTemplate(apiCatalog[0].endpoints[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h1 className="title">API Tester</h1>
            <p className="subtitle">Use endpoint templates and execute requests directly from the UI.</p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Back to Auth
          </Button>
        </div>

        <div className="grid-2" style={{ alignItems: 'start' }}>
          <Card>
            <h2 className="section-title" style={{ marginBottom: 12 }}>
              Endpoint Catalog
            </h2>
            <div className="toolbar">
              {apiCatalog.map((group, index) => (
                <button
                  key={group.domain}
                  onClick={() => selectDomain(index)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: `1px solid ${domainIndex === index ? colors.primary.main : colors.neutral.borderStrong}`,
                    background: domainIndex === index ? colors.primary.light : colors.neutral.white,
                    cursor: 'pointer',
                  }}
                >
                  {group.domain}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {selectedDomain?.endpoints?.map((item, index) => (
                <button
                  key={`${item.method}-${item.path}`}
                  onClick={() => selectEndpoint(index)}
                  style={{
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: `1px solid ${endpointIndex === index ? colors.primary.main : colors.neutral.border}`,
                    background: endpointIndex === index ? colors.primary.light : colors.neutral.white,
                    cursor: 'pointer',
                  }}
                >
                  <strong>{item.method}</strong> {item.name}
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {item.path}
                    {item.requiredRole ? ` | role: ${item.requiredRole}` : ''}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="section-title" style={{ marginBottom: 12 }}>
              Request Builder
            </h2>
            <div className="toolbar">
              <select value={method} onChange={(event) => setMethod(event.target.value as HttpMethod)} style={{ padding: 8 }}>
                {['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select value={authMode} onChange={(event) => setAuthMode(event.target.value as AuthMode)} style={{ padding: 8 }}>
                <option value="none">No Auth</option>
                <option value="bearer">Bearer Token</option>
              </select>
              <Button onClick={sendRequest} loading={loading}>
                Send Request
              </Button>
            </div>

            <label style={{ display: 'block', marginBottom: 10 }}>
              <div className="muted" style={{ marginBottom: 4 }}>
                Path
              </div>
              <input
                value={path}
                onChange={(event) => setPath(event.target.value)}
                style={{ width: '100%', padding: 8, border: `1px solid ${colors.neutral.borderStrong}`, borderRadius: 8 }}
              />
            </label>

            {authMode === 'bearer' ? (
              <label style={{ display: 'block', marginBottom: 10 }}>
                <div className="muted" style={{ marginBottom: 4 }}>
                  Bearer Token
                </div>
                <textarea
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: 8, border: `1px solid ${colors.neutral.borderStrong}`, borderRadius: 8 }}
                />
              </label>
            ) : null}

            <div className="grid-2">
              <label style={{ display: 'block' }}>
                <div className="muted" style={{ marginBottom: 4 }}>
                  Path Params (JSON)
                </div>
                <textarea
                  value={pathParamsJson}
                  onChange={(event) => setPathParamsJson(event.target.value)}
                  rows={7}
                  style={{ width: '100%', padding: 8, border: `1px solid ${colors.neutral.borderStrong}`, borderRadius: 8 }}
                />
              </label>
              <label style={{ display: 'block' }}>
                <div className="muted" style={{ marginBottom: 4 }}>
                  Query Params (JSON)
                </div>
                <textarea
                  value={queryJson}
                  onChange={(event) => setQueryJson(event.target.value)}
                  rows={7}
                  style={{ width: '100%', padding: 8, border: `1px solid ${colors.neutral.borderStrong}`, borderRadius: 8 }}
                />
              </label>
            </div>

            <label style={{ display: 'block', marginTop: 10 }}>
              <div className="muted" style={{ marginBottom: 4 }}>
                Headers (JSON)
              </div>
              <textarea
                value={headersJson}
                onChange={(event) => setHeadersJson(event.target.value)}
                rows={5}
                style={{ width: '100%', padding: 8, border: `1px solid ${colors.neutral.borderStrong}`, borderRadius: 8 }}
              />
            </label>

            {canSendBody ? (
              <label style={{ display: 'block', marginTop: 10 }}>
                <div className="muted" style={{ marginBottom: 4 }}>
                  Body (JSON)
                </div>
                <textarea
                  value={bodyJson}
                  onChange={(event) => setBodyJson(event.target.value)}
                  rows={10}
                  style={{ width: '100%', padding: 8, border: `1px solid ${colors.neutral.borderStrong}`, borderRadius: 8 }}
                />
              </label>
            ) : null}

            {error ? (
              <p style={{ marginTop: 10, color: colors.error }}>
                {error}
              </p>
            ) : null}
          </Card>
        </div>

        <div className="grid-2" style={{ marginTop: 16 }}>
          <Card>
            <h2 className="section-title" style={{ marginBottom: 8 }}>
              Response
            </h2>
            {!result ? (
              <p className="muted">No response yet. Send a request to see output.</p>
            ) : (
              <>
                <p>
                  <strong>Status:</strong> {result.status} {result.statusText}
                </p>
                <div className="panel">
                  <p style={{ marginTop: 0 }}>
                    <strong>Headers</strong>
                  </p>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{formatJson(result.headers)}</pre>
                </div>
                <div className="panel" style={{ marginTop: 10 }}>
                  <p style={{ marginTop: 0 }}>
                    <strong>Body</strong>
                  </p>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{formatJson(result.data)}</pre>
                </div>
              </>
            )}
          </Card>

          <Card>
            <h2 className="section-title" style={{ marginBottom: 8 }}>
              Request History
            </h2>
            {!history.length ? (
              <p className="muted">No request history available.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {history.map((item, index) => (
                  <div
                    key={`${item.at}-${index}`}
                    style={{ border: `1px solid ${colors.neutral.border}`, borderRadius: 8, padding: '8px 10px' }}
                  >
                    <div>
                      <strong>{item.method}</strong> {item.path}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Status {item.status} | {new Date(item.at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ApiTesterPage;
