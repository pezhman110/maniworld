import { Router } from 'express';
import {
  ContentBriefRegistry,
  ContentPlanRegistry,
  InstagramCompanyAdRegistry,
  TrendResearchRegistry,
} from '../../modules/contentStudio';
import { IntegrationCredentialsStore } from '../../modules/credentialsStore';
import { InstagramAdPublisher, publishToWebsite, SocialPublisher } from '../../modules/socialPublisher';
import { ContentPlatform } from '../../types/domain';

let autoId = 0;
function nextId(prefix: string): string {
  autoId += 1;
  return `${prefix}-${Date.now()}-${autoId}`;
}

/**
 * Content Studio API.
 *
 * From one dashboard page a manager can: record trend notes, create a
 * content brief (topic + reference style + platform + personal/company
 * account, auto-generating a bio/description), generate a plan of content
 * items (default 9, cycling through post/carousel/single-banner/video/
 * audio/text), and attempt to publish each item to its social platform
 * *and* the company website. If a platform connection can't be reached
 * (missing credentials, API failure, or a platform like Snapchat with no
 * public content API), the item is routed to the manual-fallback queue
 * instead of silently failing.
 */
export function createContentStudioRouter(deps: {
  briefs: ContentBriefRegistry;
  plans: ContentPlanRegistry;
  trends: TrendResearchRegistry;
  instagramAds: InstagramCompanyAdRegistry;
  credentials: IntegrationCredentialsStore;
  publish: SocialPublisher;
  publishInstagramAd: InstagramAdPublisher;
}): Router {
  const router = Router();
  const { briefs, plans, trends, instagramAds, credentials, publish, publishInstagramAd } = deps;

  const handleError = (res: import('express').Response, err: unknown, status = 400) => {
    res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
  };

  // Trend research
  router.get('/trends', async (req, res) => {
    const platform = req.query.platform as ContentPlatform | undefined;
    if (!platform) {
      res.status(400).json({ error: '"platform" query parameter is required.' });
      return;
    }
    res.json({ trends: await trends.listForPlatform(platform) });
  });

  router.post('/trends', async (req, res) => {
    try {
      const trend = await trends.record({ id: req.body?.id ?? nextId('trend'), ...req.body });
      res.status(201).json({ trend });
    } catch (err) {
      handleError(res, err);
    }
  });

  // Briefs
  router.get('/briefs', async (_req, res) => {
    res.json({ briefs: await briefs.list() });
  });

  router.get('/briefs/:id', async (req, res) => {
    const brief = await briefs.get(req.params.id);
    if (!brief) {
      res.status(404).json({ error: `Content brief "${req.params.id}" not found.` });
      return;
    }
    res.json({ brief });
  });

  router.post('/briefs', async (req, res) => {
    try {
      const brief = await briefs.create({ id: req.body?.id ?? nextId('brief'), ...req.body });
      res.status(201).json({ brief });
    } catch (err) {
      handleError(res, err);
    }
  });

  // Plan generation + items
  router.post('/briefs/:id/plan', async (req, res) => {
    const brief = await briefs.get(req.params.id);
    if (!brief) {
      res.status(404).json({ error: `Content brief "${req.params.id}" not found.` });
      return;
    }
    try {
      const items = await plans.generatePlan({
        brief,
        count: req.body?.count !== undefined ? Number(req.body.count) : undefined,
        idPrefix: `item-${brief.id}`,
      });
      res.status(201).json({ items });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get('/briefs/:id/items', async (req, res) => {
    res.json({ items: await plans.listForBrief(req.params.id) });
  });

  router.get('/fallback-queue', async (_req, res) => {
    res.json({ items: await plans.listFallbackQueue() });
  });

  // Instagram company ads: planned here, submitted only through Meta Marketing API for owned accounts.
  router.get('/instagram-ads', async (_req, res) => {
    res.json({ ads: await instagramAds.list() });
  });

  router.post('/instagram-ads', async (req, res) => {
    try {
      const ad = await instagramAds.create({ id: req.body?.id ?? nextId('ig-ad'), ...req.body });
      res.status(201).json({ ad });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get('/instagram-ads/fallback-queue', async (_req, res) => {
    res.json({ ads: await instagramAds.listFallbackQueue() });
  });

  router.post('/instagram-ads/:id/submit', async (req, res) => {
    const ad = await instagramAds.get(req.params.id);
    if (!ad) {
      res.status(404).json({ error: `Instagram ad "${req.params.id}" not found.` });
      return;
    }
    try {
      const result = await publishInstagramAd(await credentials.get('instagram'), ad);
      const updated = await instagramAds.updateSubmission(ad.id, {
        status: result.status,
        failureReason: result.status === 'manual-fallback' ? result.message : undefined,
        submittedAt: result.status === 'submitted' ? Date.now() : undefined,
        metaCampaignId: result.metaCampaignId,
        metaAdSetId: result.metaAdSetId,
        metaCreativeId: result.metaCreativeId,
        metaAdId: result.metaAdId,
      });
      res.json({ ad: updated, result });
    } catch (err) {
      handleError(res, err, 500);
    }
  });

  // Publishing a single item to a single destination (a social platform, or "website").
  router.post('/items/:id/publish/:channel', async (req, res) => {
    const item = await plans.get(req.params.id);
    if (!item) {
      res.status(404).json({ error: `Content item "${req.params.id}" not found.` });
      return;
    }
    const channel = req.params.channel as ContentPlatform | 'website';
    if (!item.destinations.some((d) => d.channel === channel)) {
      res.status(400).json({ error: `Content item "${item.id}" has no "${channel}" destination.` });
      return;
    }
    try {
      const result =
        channel === 'website'
          ? publishToWebsite()
          : await publish(channel, await credentials.get(channel), item);
      const updated = await plans.updateDestination(item.id, channel, {
        status: result.status,
        failureReason: result.status === 'manual-fallback' ? result.message : undefined,
        publishedAt: result.status === 'published' ? Date.now() : undefined,
      });
      res.json({ item: updated, result });
    } catch (err) {
      handleError(res, err, 500);
    }
  });

  return router;
}
