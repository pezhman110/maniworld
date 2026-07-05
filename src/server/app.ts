import express, { Express } from 'express';
import path from 'path';
import { IntegrationCredentialsStore } from '../modules/credentialsStore';
import { MarketRegistry } from '../modules/marketRegistry';
import { createConnectionTester, ConnectionTester } from './connectionTest';
import { requireAdminApiKey } from './auth';
import { createCredentialsRouter } from './routes/credentialsRouter';
import { createMarketsRouter } from './routes/marketsRouter';

export interface CreateAppOptions {
  credentialsStore?: IntegrationCredentialsStore;
  marketRegistry?: MarketRegistry;
  testConnection?: ConnectionTester;
  /** Admin API key required via the `x-api-key` header; omit to disable auth (local/dev only). */
  adminApiKey?: string;
  /** Serve the static dashboard from `public/dashboard`; disabled in tests by default. */
  serveDashboard?: boolean;
}

/**
 * Builds the admin API app (and, when enabled, serves the static dashboard
 * that consumes it). Kept as a factory so tests can inject in-memory stores
 * and a fake connection tester instead of hitting real third-party APIs.
 */
export function createApp(options: CreateAppOptions = {}): Express {
  const credentialsStore = options.credentialsStore ?? new IntegrationCredentialsStore();
  const marketRegistry = options.marketRegistry ?? new MarketRegistry();
  const testConnection = options.testConnection ?? createConnectionTester();

  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  const auth = requireAdminApiKey(options.adminApiKey);
  app.use('/api/credentials', auth, createCredentialsRouter(credentialsStore, testConnection));
  app.use('/api/markets', auth, createMarketsRouter(marketRegistry));

  if (options.serveDashboard) {
    app.use('/dashboard', express.static(path.join(process.cwd(), 'public', 'dashboard')));
  }

  return app;
}
