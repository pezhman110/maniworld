import express, { Express } from 'express';
import path from 'path';
import { IntegrationCredentialsStore } from '../modules/credentialsStore';
import { MarketRegistry } from '../modules/marketRegistry';
import {
  AudienceProfileRegistry,
  CommissionModelRegistry,
  LandingPageRegistry,
  ResumeIntakeRegistry,
} from '../modules/presentationCampaigns';
import { OutreachProspectRegistry, OutreachScriptRegistry } from '../modules/prospectOutreach';
import { CompliancePolicyRegistry } from '../modules/compliancePolicy';
import { DutyScopeRegistry } from '../modules/dutyScope';
import { ContentBriefRegistry, ContentPlanRegistry, TrendResearchRegistry } from '../modules/contentStudio';
import { createSocialPublisher, SocialPublisher } from '../modules/socialPublisher';
import { createConnectionTester, ConnectionTester } from './connectionTest';
import { requireAdminApiKey } from './auth';
import { TRANSLATIONS } from '../modules/i18n';
import { createCredentialsRouter } from './routes/credentialsRouter';
import { createMarketsRouter } from './routes/marketsRouter';
import { createPresentationRouter } from './routes/presentationRouter';
import { createProspectOutreachRouter } from './routes/prospectOutreachRouter';
import { createCompliancePolicyRouter } from './routes/compliancePolicyRouter';
import { createDutyScopeRouter } from './routes/dutyScopeRouter';
import { createContentStudioRouter } from './routes/contentStudioRouter';

export interface CreateAppOptions {
  credentialsStore?: IntegrationCredentialsStore;
  marketRegistry?: MarketRegistry;
  audienceProfiles?: AudienceProfileRegistry;
  commissionModels?: CommissionModelRegistry;
  resumeIntakes?: ResumeIntakeRegistry;
  landingPages?: LandingPageRegistry;
  prospects?: OutreachProspectRegistry;
  outreachScripts?: OutreachScriptRegistry;
  compliancePolicies?: CompliancePolicyRegistry;
  dutyScopes?: DutyScopeRegistry;
  contentBriefs?: ContentBriefRegistry;
  contentPlans?: ContentPlanRegistry;
  contentTrends?: TrendResearchRegistry;
  publishContent?: SocialPublisher;
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
  const audienceProfiles = options.audienceProfiles ?? new AudienceProfileRegistry();
  const commissionModels = options.commissionModels ?? new CommissionModelRegistry();
  const resumeIntakes = options.resumeIntakes ?? new ResumeIntakeRegistry();
  const landingPages = options.landingPages ?? new LandingPageRegistry();
  const prospects = options.prospects ?? new OutreachProspectRegistry();
  const outreachScripts = options.outreachScripts ?? new OutreachScriptRegistry();
  const compliancePolicies = options.compliancePolicies ?? new CompliancePolicyRegistry();
  const dutyScopes = options.dutyScopes ?? new DutyScopeRegistry();
  const contentBriefs = options.contentBriefs ?? new ContentBriefRegistry();
  const contentPlans = options.contentPlans ?? new ContentPlanRegistry();
  const contentTrends = options.contentTrends ?? new TrendResearchRegistry();
  const publishContent = options.publishContent ?? createSocialPublisher();
  const testConnection = options.testConnection ?? createConnectionTester();

  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Public (no admin key required): the full translation dictionary so the
  // entrance page and dashboard language switcher (EN/FA/AR) can render
  // localized UI copy before any credentials are entered.
  app.get('/api/i18n', (_req, res) => res.json({ translations: TRANSLATIONS }));

  const auth = requireAdminApiKey(options.adminApiKey);
  app.use('/api/credentials', auth, createCredentialsRouter(credentialsStore, testConnection));
  app.use('/api/markets', auth, createMarketsRouter(marketRegistry));
  app.use(
    '/api/presentation',
    auth,
    createPresentationRouter({ audienceProfiles, commissionModels, resumeIntakes, landingPages })
  );
  app.use('/api/outreach', auth, createProspectOutreachRouter({ prospects, scripts: outreachScripts }));
  app.use('/api/compliance-policy', auth, createCompliancePolicyRouter({ policies: compliancePolicies }));
  app.use('/api/duty-scope', auth, createDutyScopeRouter({ dutyScopes, prospects }));
  app.use(
    '/api/content-studio',
    auth,
    createContentStudioRouter({
      briefs: contentBriefs,
      plans: contentPlans,
      trends: contentTrends,
      credentials: credentialsStore,
      publish: publishContent,
    })
  );

  if (options.serveDashboard) {
    app.use('/dashboard', express.static(path.join(process.cwd(), 'public', 'dashboard')));
    app.use('/entrance', express.static(path.join(process.cwd(), 'public', 'entrance')));
    // Land users on the branded entrance/sign-in page first instead of
    // dropping them straight into the dashboard's plain API-key bar.
    app.get('/', (_req, res) => res.redirect('/entrance/'));
  }

  return app;
}
