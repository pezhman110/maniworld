import { createApp } from './app';
import { IntegrationCredentialsStore, resolveMasterKey } from '../modules/credentialsStore';
import { MarketRegistry } from '../modules/marketRegistry';
import { InMemoryRepository, Repository } from '../modules/persistence';
import { PostgresRepository } from '../modules/postgresRepository';
import { Pool } from 'pg';

/**
 * Production bootstrap: wires the admin API to Postgres/Supabase when
 * `DATABASE_URL` is set, otherwise falls back to in-memory storage (fine for
 * local development, but data is lost on restart).
 */
async function main(): Promise<void> {
  const port = Number(process.env.PORT ?? 3000);
  const adminApiKey = process.env.MW_ADMIN_API_KEY;
  if (!adminApiKey) {
    // eslint-disable-next-line no-console
    console.warn('[server] MW_ADMIN_API_KEY is not set; the admin API is unauthenticated. Do not do this in production.');
  }

  let credentialsRepo: Repository<never>;
  let marketsRepo: Repository<never>;

  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    credentialsRepo = new PostgresRepository({ pool, table: 'integration_credentials' });
    marketsRepo = new PostgresRepository({ pool, table: 'custom_markets' });
  } else {
    credentialsRepo = new InMemoryRepository();
    marketsRepo = new InMemoryRepository();
  }

  const credentialsStore = new IntegrationCredentialsStore(credentialsRepo as never, resolveMasterKey());
  const marketRegistry = new MarketRegistry(marketsRepo as never);

  const app = createApp({ credentialsStore, marketRegistry, adminApiKey, serveDashboard: true });

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] Mani World admin API listening on port ${port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[server] failed to start', err);
  process.exitCode = 1;
});
