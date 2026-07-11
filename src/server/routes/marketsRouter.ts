import { Router } from 'express';
import { MarketRegistry } from '../../modules/marketRegistry';
import { DEFAULT_MARKET_TARGETS } from '../../modules/marketTargets';
import { DEFAULT_WORKING_HOURS } from '../../modules/locations';
import { computeMarketPacing } from '../../modules/marketTargets';
import { MarketType, TargetMetric } from '../../types/domain';

/**
 * Markets page API: exposes the 5 built-in markets as a read-only reference
 * and lets a manager add/edit/remove additional custom markets ("what if we
 * add a new market type?") entirely from the dashboard, with an endpoint to
 * compute live pacing for any market (built-in or custom).
 */
export function createMarketsRouter(registry: MarketRegistry): Router {
  const router = Router();

  router.get('/built-in', (_req, res) => {
    const marketIds = Array.from(new Set(DEFAULT_MARKET_TARGETS.map((r) => r.market)));
    const builtIn = marketIds.map((market) => ({
      id: market,
      workingHours: DEFAULT_WORKING_HOURS[market],
      targetRules: DEFAULT_MARKET_TARGETS.filter((r) => r.market === market),
    }));
    res.json({ markets: builtIn });
  });

  router.get('/', async (req, res) => {
    const onlyActive = req.query.onlyActive !== 'false';
    res.json({ markets: await registry.listMarkets(onlyActive) });
  });

  router.post('/', async (req, res) => {
    const { id, label, workingHours, targetRules } = req.body ?? {};
    try {
      const market = await registry.addMarket({ id, label, workingHours, targetRules });
      res.status(201).json({ market });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const market = await registry.updateMarket(req.params.id, req.body ?? {});
      res.json({ market });
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.delete('/:id', async (req, res) => {
    const removed = await registry.removeMarket(req.params.id);
    if (!removed) {
      res.status(404).json({ error: `Market "${req.params.id}" not found.` });
      return;
    }
    res.status(204).send();
  });

  router.get('/:id/pacing', async (req, res) => {
    const metric = req.query.metric as TargetMetric | undefined;
    const achievedSoFar = Number(req.query.achievedSoFar ?? 0);
    const currentHour = Number(req.query.currentHour ?? new Date().getHours());

    if (!metric) {
      res.status(400).json({ error: '"metric" query parameter is required.' });
      return;
    }

    const workingHours = await registry.getEffectiveWorkingHours(req.params.id);
    const rules = await registry.getEffectiveTargetRules();

    try {
      const report = computeMarketPacing({
        market: req.params.id as MarketType,
        metric,
        achievedSoFar,
        currentHour,
        workingHours,
        rules,
      });
      res.json({ report });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  return router;
}
