export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
export type AuthMode = 'none' | 'bearer';

export interface ApiEndpoint {
  name: string;
  method: HttpMethod;
  path: string;
  auth: AuthMode;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, string>;
  requiredRole?: string;
}

export interface ApiDomainGroup {
  domain: string;
  endpoints: ApiEndpoint[];
}

export interface ApiHistoryItem {
  method: HttpMethod;
  path: string;
  status: number;
  at: string;
}

export interface ApiTesterResult {
  status: number;
  statusText: string;
  headers: unknown;
  data: unknown;
}
